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
  SubscriptionHistoryItem,
  SubscriptionInfo,
} from './subscription.model';
import { SubscriptionService } from './subscription.service';

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

  // Checkout modal state
  showCheckoutModal = false;
  selectedPlanForCheckout: PlanTier = 'BUSINESS';
  selectedInterval: BillingInterval = 'MONTHLY';
  isProcessingPayment = false;
  checkoutError = '';
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
    return this.pricingMatrix?.plans?.find((p) => p.name === this.selectedPlanForCheckout);
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

  openCheckout(plan: PlanTier = 'BUSINESS'): void {
    this.selectedPlanForCheckout = plan;
    this.showCheckoutModal = true;
    this.checkoutError = '';
    this.checkoutOrder = null;
  }

  closeCheckout(): void {
    this.showCheckoutModal = false;
    this.isProcessingPayment = false;
    this.checkoutError = '';
    this.checkoutOrder = null;
  }

  /**
   * Start Checkout Flow:
   * 1. Request server-side payment order (calculates authoritative price)
   * 2. Open Razorpay Checkout or fallback test simulation
   */
  startCheckout(): void {
    if (!this.selectedPlanForCheckout) return;

    this.isProcessingPayment = true;
    this.checkoutError = '';

    this.paymentService
      .createOrder({
        plan: this.selectedPlanForCheckout,
        billingInterval: this.selectedInterval,
      })
      .subscribe({
        next: (order) => {
          this.checkoutOrder = order;
          this.handleRazorpayCheckout(order);
        },
        error: (err) => {
          this.isProcessingPayment = false;
          this.checkoutError = this.httpErrors.map(err).message;
        },
      });
  }

  /**
   * Open Razorpay modal if window.Razorpay SDK is loaded, otherwise handle simulation
   */
  private handleRazorpayCheckout(order: PaymentOrderResponse): void {
    const rzpWindow = window as any;

    if (typeof rzpWindow.Razorpay === 'function') {
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Seyyon Connect',
        description: `${order.planDisplayName} Subscription (${order.billingInterval})`,
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
      // Direct completion verification for sandbox/mock testing
      this.isProcessingPayment = false;
    }
  }

  /**
   * Helper to simulate sandbox test payment verification
   */
  simulateTestPayment(): void {
    if (!this.checkoutOrder) return;
    this.isProcessingPayment = true;

    // Test payment credentials matching server verification test secret
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
        this.closeCheckout();
        this.feedbackMessage = `Payment confirmed! Your ${res.payment.plan} subscription is now active.`;
        this.feedbackTone = 'success';
        this.refresh();
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.checkoutError = this.httpErrors.map(err).message;
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
