import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CompanyPlanOverview, PlanTier, WarningThresholdStatus } from '../plans/plan.model';
import {
  BillingInterval,
  PaymentOrderResponse,
  PaymentRecord,
  PricingMatrixResponse,
  PricingPlanItem,
} from './payment.model';
import { PaymentService } from './payment.service';
import {
  PlanChangeDirection,
  PlanChangePreview,
  SubscriptionHistoryItem,
  SubscriptionInfo,
} from './subscription.model';
import { SubscriptionService } from './subscription.service';

const PLAN_LEVELS: Record<string, number> = {
  STARTER: 1,
  BUSINESS: 2,
  PROFESSIONAL: 3,
  ENTERPRISE: 4,
};

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss',
})
export class SubscriptionComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly paymentService = inject(PaymentService);
  private readonly httpErrors = inject(HttpErrorService);
  readonly auth = inject(AuthService);
  readonly Math = Math;

  subscription: SubscriptionInfo | null = null;
  planOverview: CompanyPlanOverview | null = null;
  history: SubscriptionHistoryItem[] = [];
  paymentHistory: PaymentRecord[] = [];
  pricingMatrix: PricingMatrixResponse | null = null;

  loading = true;
  refreshing = false;
  errorMessage = '';
  feedbackMessage = '';
  feedbackTone: 'success' | 'warning' | 'info' = 'info';
  showPlanComparison = false;
  activeTab: 'usage' | 'subscriptionHistory' | 'paymentHistory' = 'usage';

  // Plan Change / Checkout modal state
  showPlanChangeModal = false;
  selectedPlanForChange: PlanTier = 'BUSINESS';
  selectedInterval: BillingInterval = 'MONTHLY';
  planChangePreview: PlanChangePreview | null = null;
  isLoadingPreview = false;
  isProcessingPayment = false;
  isConfirmingDowngrade = false;
  isCancellingDowngrade = false;
  modalError = '';
  checkoutOrder: PaymentOrderResponse | null = null;

  get isSuperAdmin(): boolean {
    return this.auth.getCurrentUser()?.role === 'SUPER_ADMIN';
  }

  get isTrialing(): boolean {
    return this.subscription?.status === 'TRIALING';
  }

  get isCancelled(): boolean {
    return (
      this.subscription?.status === 'CANCELLED' ||
      Boolean(this.subscription?.cancelAtPeriodEnd)
    );
  }

  get isExpired(): boolean {
    return this.subscription?.status === 'EXPIRED';
  }

  get hasPendingDowngrade(): boolean {
    return Boolean(this.subscription?.pendingPlan);
  }

  get daysRemainingInPeriod(): number {
    if (!this.subscription?.currentPeriodEnd) return 0;
    const diff = new Date(this.subscription.currentPeriodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get trialDaysRemaining(): number {
    if (!this.subscription?.trialEnd) return 0;
    const diff = new Date(this.subscription.trialEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get selectedPlanPricing(): PricingPlanItem | undefined {
    return this.pricingMatrix?.plans?.find((p) => p.name === this.selectedPlanForChange);
  }

  get selectedPriceFormatted(): string {
    const pricing = this.selectedPlanPricing?.pricing?.[this.selectedInterval];
    return pricing ? pricing.formatted : 'Custom / Contact Sales';
  }

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.loadData(true);
  }

  togglePlanComparison(): void {
    this.showPlanComparison = !this.showPlanComparison;
  }

  /**
   * Determine plan change direction relative to current plan
   */
  getPlanDirection(targetPlan: PlanTier): PlanChangeDirection {
    const currentPlan = this.subscription?.plan || 'STARTER';
    const currentLevel = PLAN_LEVELS[currentPlan] || 0;
    const targetLevel = PLAN_LEVELS[targetPlan] || 0;

    if (targetLevel > currentLevel) return 'UPGRADE';
    if (targetLevel < currentLevel) return 'DOWNGRADE';
    return 'SAME';
  }

  /**
   * Open Plan Change / Checkout Modal and fetch authoritative preview
   */
  openPlanChangeModal(plan: PlanTier = 'BUSINESS'): void {
    this.selectedPlanForChange = plan;
    this.showPlanChangeModal = true;
    this.modalError = '';
    this.checkoutOrder = null;
    this.loadPlanChangePreview();
  }

  closePlanChangeModal(): void {
    this.showPlanChangeModal = false;
    this.isProcessingPayment = false;
    this.isConfirmingDowngrade = false;
    this.modalError = '';
    this.checkoutOrder = null;
    this.planChangePreview = null;
  }

  onIntervalChanged(interval: BillingInterval): void {
    this.selectedInterval = interval;
    this.loadPlanChangePreview();
  }

  /**
   * Fetch authoritative plan change preview from backend
   */
  private loadPlanChangePreview(): void {
    if (!this.selectedPlanForChange) return;

    this.isLoadingPreview = true;
    this.modalError = '';

    this.subscriptionService
      .previewPlanChange(this.selectedPlanForChange, this.selectedInterval)
      .pipe(finalize(() => (this.isLoadingPreview = false)))
      .subscribe({
        next: (preview) => {
          this.planChangePreview = preview;
        },
        error: (err) => {
          this.modalError = this.httpErrors.map(err).message;
        },
      });
  }

  /**
   * Start Upgrade Checkout Flow:
   * Request server-side payment order (calculates authoritative price)
   */
  startUpgradeCheckout(): void {
    if (!this.selectedPlanForChange) return;

    this.isProcessingPayment = true;
    this.modalError = '';

    this.paymentService
      .createOrder({
        plan: this.selectedPlanForChange,
        billingInterval: this.selectedInterval,
      })
      .subscribe({
        next: (order) => {
          this.checkoutOrder = order;
          this.handleRazorpayCheckout(order);
        },
        error: (err) => {
          this.isProcessingPayment = false;
          this.modalError = this.httpErrors.map(err).message;
        },
      });
  }

  /**
   * Confirm Scheduled Downgrade
   */
  confirmDowngrade(): void {
    if (!this.selectedPlanForChange) return;

    this.isConfirmingDowngrade = true;
    this.modalError = '';

    this.subscriptionService
      .requestPlanChange({
        plan: this.selectedPlanForChange,
        interval: this.selectedInterval,
      })
      .pipe(finalize(() => (this.isConfirmingDowngrade = false)))
      .subscribe({
        next: (sub) => {
          this.closePlanChangeModal();
          this.feedbackMessage = `Plan downgrade to ${sub.pendingPlan || this.selectedPlanForChange} has been scheduled for the end of your billing cycle (${new Date(sub.pendingPlanEffectiveAt || sub.currentPeriodEnd).toLocaleDateString()}). Existing data remains safe.`;
          this.feedbackTone = 'warning';
          this.refresh();
        },
        error: (err) => {
          this.modalError = this.httpErrors.map(err).message;
        },
      });
  }

  /**
   * Cancel Pending Scheduled Downgrade
   */
  cancelPendingDowngrade(): void {
    this.isCancellingDowngrade = true;

    this.subscriptionService
      .cancelPendingPlanChange()
      .pipe(finalize(() => (this.isCancellingDowngrade = false)))
      .subscribe({
        next: () => {
          this.feedbackMessage = `Scheduled plan downgrade has been cancelled. Your ${this.subscription?.plan} plan remains active.`;
          this.feedbackTone = 'success';
          this.refresh();
        },
        error: (err) => {
          this.feedbackMessage = this.httpErrors.map(err).message;
          this.feedbackTone = 'warning';
        },
      });
  }

  /**
   * Open Razorpay modal if window.Razorpay SDK is loaded, otherwise handle test simulation
   */
  private handleRazorpayCheckout(order: PaymentOrderResponse): void {
    const rzpWindow = window as any;

    if (typeof rzpWindow.Razorpay === 'function') {
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Seyyon Connect',
        description: `${order.planDisplayName} Upgrade (${order.billingInterval})`,
        order_id: order.orderId,
        prefill: {
          name: order.companyName,
          email: order.companyEmail,
        },
        theme: {
          color: '#0d6efd',
        },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          this.verifyPayment({
            paymentId: order.paymentId,
            orderId: response.razorpay_order_id,
            providerPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            this.isProcessingPayment = false;
          },
        },
      };

      const rzpInstance = new rzpWindow.Razorpay(options);
      rzpInstance.open();
    } else {
      this.isProcessingPayment = false;
    }
  }

  /**
   * Helper to simulate sandbox test payment verification
   */
  simulateTestPayment(): void {
    if (!this.checkoutOrder) return;
    this.isProcessingPayment = true;

    const testPaymentId = `pay_sim_${Date.now()}`;
    const testSignature = 'test_simulated_signature';

    this.verifyPayment({
      paymentId: this.checkoutOrder.paymentId,
      orderId: this.checkoutOrder.orderId,
      providerPaymentId: testPaymentId,
      signature: testSignature,
    });
  }

  /**
   * Cryptographically verify payment on backend
   */
  private verifyPayment(verificationData: {
    paymentId?: string;
    orderId: string;
    providerPaymentId: string;
    signature: string;
  }): void {
    this.isProcessingPayment = true;
    this.paymentService.verifyPayment(verificationData).subscribe({
      next: (res) => {
        this.isProcessingPayment = false;
        this.closePlanChangeModal();
        this.feedbackMessage = `Payment confirmed! Your plan has been upgraded to ${res.payment.plan}.`;
        this.feedbackTone = 'success';
        this.refresh();
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.modalError = this.httpErrors.map(err).message;
      },
    });
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${formatted} ${sizes[i]}`;
  }

  getProgressBarClass(status: WarningThresholdStatus): string {
    switch (status) {
      case 'OVER_LIMIT':
      case 'EXHAUSTED':
        return 'bg-danger';
      case 'CRITICAL':
        return 'bg-warning text-dark';
      case 'WARNING':
        return 'bg-info text-dark';
      default:
        return 'bg-primary';
    }
  }

  private loadData(refresh = false): void {
    if (refresh) this.refreshing = true;
    else this.loading = true;
    this.errorMessage = '';

    forkJoin({
      current: this.subscriptionService.getCurrentSubscription(),
      history: this.subscriptionService.getSubscriptionHistory(25),
      payments: this.paymentService.getPaymentHistory(20, 0),
      pricing: this.paymentService.getPricingMatrix(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: ({ current, history, payments, pricing }) => {
          this.subscription = current.subscription;
          this.planOverview = current.planOverview;
          this.history = history;
          this.paymentHistory = payments.rows || [];
          this.pricingMatrix = pricing;
        },
        error: (error: unknown) => {
          this.errorMessage = this.httpErrors.map(error).message;
        },
      });
  }
}
