import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  CompanyPlanOverview,
  MetricOverviewItem,
  PlanDefinition,
  PlanTier,
  WarningThresholdStatus,
} from '../plans/plan.model';
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
  RenewalPreview,
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
    RouterLink,
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
  private readonly toast = inject(ToastService);
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
  pricingInterval: BillingInterval = 'MONTHLY';

  // Plan Details Modal state
  showPlanDetailsModal = false;
  selectedPlanDetailsTier: PlanTier = 'BUSINESS';

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

  // Renewal modal state
  showRenewalModal = false;
  selectedRenewalInterval: BillingInterval = 'MONTHLY';
  renewalPreview: RenewalPreview | null = null;
  isLoadingRenewalPreview = false;
  isProcessingRenewalPayment = false;
  renewalModalError = '';
  renewalOrder: PaymentOrderResponse | null = null;

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

  get isRenewalDue(): boolean {
    return (
      (this.subscription?.status === 'ACTIVE' && this.daysRemainingInPeriod <= 14) ||
      this.isExpired
    );
  }

  get isRenewalEligible(): boolean {
    return (
      this.subscription?.status === 'ACTIVE' ||
      this.subscription?.status === 'EXPIRED' ||
      this.subscription?.status === 'TRIALING'
    );
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

  setPricingInterval(interval: BillingInterval): void {
    this.pricingInterval = interval;
  }

  getPlanPricing(planName: PlanTier): PricingPlanItem | undefined {
    return this.pricingMatrix?.plans?.find((p) => p.name === planName);
  }

  getPlanPriceFormatted(
    planName: PlanTier,
    interval: BillingInterval = this.pricingInterval
  ): string {
    const plan = this.getPlanPricing(planName);
    const pricing = plan?.pricing?.[interval];
    if (!pricing) {
      return planName === 'ENTERPRISE' ? 'Custom Pricing' : 'Contact Sales';
    }
    return pricing.formatted;
  }

  getPlanPriceDisplayAmount(
    planName: PlanTier,
    interval: BillingInterval = this.pricingInterval
  ): number | null {
    const plan = this.getPlanPricing(planName);
    const pricing = plan?.pricing?.[interval];
    return pricing ? pricing.displayAmount : null;
  }

  getAnnualSavingsPercent(planName: PlanTier = 'BUSINESS'): number | null {
    const plan = this.getPlanPricing(planName);
    if (!plan || !plan.pricing?.MONTHLY || !plan.pricing?.YEARLY) return null;
    const monthlyAnnualized = plan.pricing.MONTHLY.amount * 12;
    const yearlyTotal = plan.pricing.YEARLY.amount;
    if (monthlyAnnualized <= 0 || yearlyTotal >= monthlyAnnualized) return null;
    return Math.round(((monthlyAnnualized - yearlyTotal) / monthlyAnnualized) * 100);
  }

  getPlanTagline(planName: PlanTier): string {
    const fromPricing = this.getPlanPricing(planName)?.tagline;
    if (fromPricing) return fromPricing;
    const fromOverview = this.planOverview?.availablePlans?.find((p) => p.name === planName)?.tagline;
    if (fromOverview) return fromOverview;
    switch (planName) {
      case 'STARTER':
        return 'Essential WhatsApp messaging for small teams and startups.';
      case 'BUSINESS':
        return 'Growing businesses scaling campaigns and customer engagement.';
      case 'PROFESSIONAL':
        return 'High-volume marketing and multi-agent customer operations.';
      case 'ENTERPRISE':
        return 'Custom limits, dedicated infrastructure, and unlimited scale.';
      default:
        return 'Commercial messaging tier.';
    }
  }

  getPlanLimits(planName: PlanTier): Record<string, number | null> {
    const fromOverview = this.planOverview?.availablePlans?.find((p) => p.name === planName);
    if (fromOverview?.limits) return fromOverview.limits;
    const fromPricing = this.getPlanPricing(planName);
    return fromPricing?.limits || {};
  }

  getPlanHighlights(planName: PlanTier): string[] {
    const limits = this.getPlanLimits(planName);
    const msg = limits['MONTHLY_MESSAGES'] !== null ? `${limits['MONTHLY_MESSAGES']?.toLocaleString()} WhatsApp messages / mo` : 'Unlimited WhatsApp messages';
    const camp = limits['MONTHLY_CAMPAIGNS'] !== null ? `${limits['MONTHLY_CAMPAIGNS']?.toLocaleString()} campaigns / mo` : 'Unlimited campaigns';
    const cust = limits['CUSTOMERS'] !== null ? `${limits['CUSTOMERS']?.toLocaleString()} customer contacts` : 'Unlimited contacts';
    const tpl = limits['TEMPLATES'] !== null ? `${limits['TEMPLATES']} approved templates` : 'Unlimited templates';
    const stor = limits['MEDIA_STORAGE_BYTES'] !== null ? `${this.formatBytes(limits['MEDIA_STORAGE_BYTES'])} media storage` : 'Unlimited media storage';

    return [msg, camp, cust, tpl, stor];
  }

  getMetric(metricKey: string): MetricOverviewItem | undefined {
    return this.planOverview?.metrics?.find((m) => m.metric === metricKey);
  }

  isCurrentPlan(planName: PlanTier): boolean {
    return this.subscription?.plan === planName;
  }

  isFeaturedPlan(planName: PlanTier): boolean {
    return planName === 'BUSINESS';
  }

  getCommercialPlans(): PlanDefinition[] {
    const all = this.planOverview?.availablePlans || [];
    return all.filter((p) => p.name !== 'ENTERPRISE');
  }

  getEnterprisePlan(): PlanDefinition | undefined {
    return this.planOverview?.availablePlans?.find((p) => p.name === 'ENTERPRISE');
  }

  openPlanDetailsModal(plan: PlanTier): void {
    this.selectedPlanDetailsTier = plan;
    this.showPlanDetailsModal = true;
  }

  closePlanDetailsModal(): void {
    this.showPlanDetailsModal = false;
  }

  upgradeFromPlanDetailsModal(): void {
    const targetPlan = this.selectedPlanDetailsTier;
    this.closePlanDetailsModal();
    if (targetPlan === 'ENTERPRISE') {
      window.location.href =
        'mailto:sales@pranexia-connect.com?subject=Seyyon%20Connect%20Enterprise%20Plan%20Inquiry';
    } else {
      this.openPlanChangeModal(targetPlan);
    }
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

  getPlanDirection(targetPlan: PlanTier): PlanChangeDirection {
    const currentPlan = this.subscription?.plan || 'STARTER';
    const currentLevel = PLAN_LEVELS[currentPlan] || 0;
    const targetLevel = PLAN_LEVELS[targetPlan] || 0;

    if (targetLevel > currentLevel) return 'UPGRADE';
    if (targetLevel < currentLevel) return 'DOWNGRADE';
    return 'SAME';
  }

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
          const effDate = new Date(sub.pendingPlanEffectiveAt || sub.currentPeriodEnd).toLocaleDateString();
          this.feedbackMessage = `Plan downgrade to ${sub.pendingPlan || this.selectedPlanForChange} has been scheduled for the end of your billing cycle (${effDate}). Existing data remains safe.`;
          this.feedbackTone = 'warning';
          this.toast.warning(`Downgrade scheduled for ${effDate}`);
          this.refresh();
        },
        error: (err) => {
          this.modalError = this.httpErrors.map(err).message;
        },
      });
  }

  cancelPendingDowngrade(): void {
    this.isCancellingDowngrade = true;

    this.subscriptionService
      .cancelPendingPlanChange()
      .pipe(finalize(() => (this.isCancellingDowngrade = false)))
      .subscribe({
        next: () => {
          this.feedbackMessage = `Scheduled plan downgrade has been cancelled. Your ${this.subscription?.plan} plan remains active.`;
          this.feedbackTone = 'success';
          this.toast.success('Scheduled downgrade cancelled successfully.');
          this.refresh();
        },
        error: (err) => {
          const msg = this.httpErrors.map(err).message;
          this.feedbackMessage = msg;
          this.feedbackTone = 'warning';
          this.toast.error(msg);
        },
      });
  }

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
          color: '#2563EB',
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

  openRenewalModal(interval: BillingInterval = 'MONTHLY'): void {
    this.selectedRenewalInterval = interval;
    this.showRenewalModal = true;
    this.renewalModalError = '';
    this.renewalOrder = null;
    this.loadRenewalPreview();
  }

  closeRenewalModal(): void {
    this.showRenewalModal = false;
    this.isProcessingRenewalPayment = false;
    this.renewalModalError = '';
    this.renewalOrder = null;
    this.renewalPreview = null;
  }

  onRenewalIntervalChanged(interval: BillingInterval): void {
    this.selectedRenewalInterval = interval;
    this.loadRenewalPreview();
  }

  loadRenewalPreview(): void {
    this.isLoadingRenewalPreview = true;
    this.renewalModalError = '';
    this.subscriptionService.previewRenewal(this.selectedRenewalInterval).subscribe({
      next: (preview) => {
        this.renewalPreview = preview;
        this.isLoadingRenewalPreview = false;
      },
      error: (err) => {
        this.isLoadingRenewalPreview = false;
        this.renewalModalError = this.httpErrors.map(err).message;
      },
    });
  }

  startRenewalCheckout(): void {
    if (!this.subscription?.plan) return;
    this.isProcessingRenewalPayment = true;
    this.renewalModalError = '';

    this.paymentService
      .createOrder({
        plan: this.subscription.plan,
        billingInterval: this.selectedRenewalInterval,
        paymentType: 'RENEWAL',
      })
      .subscribe({
        next: (order) => {
          this.renewalOrder = order;
          this.openRazorpayRenewalModal(order);
        },
        error: (err) => {
          this.isProcessingRenewalPayment = false;
          this.renewalModalError = this.httpErrors.map(err).message;
        },
      });
  }

  private openRazorpayRenewalModal(order: PaymentOrderResponse): void {
    const user = this.auth.getCurrentUser();
    const rzpWindow = window as unknown as {
      Razorpay: new (options: unknown) => { open: () => void };
    };

    if (typeof rzpWindow.Razorpay === 'function') {
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Seyyon Connect',
        description: `Subscription Renewal - ${order.planDisplayName} (${order.billingInterval})`,
        order_id: order.orderId,
        prefill: {
          name: order.companyName,
          email: order.companyEmail || user?.email || '',
        },
        theme: {
          color: '#10B981',
        },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          this.verifyRenewalPayment({
            paymentId: order.paymentId,
            orderId: response.razorpay_order_id,
            providerPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            this.isProcessingRenewalPayment = false;
          },
        },
      };

      const rzpInstance = new rzpWindow.Razorpay(options);
      rzpInstance.open();
    } else {
      this.isProcessingRenewalPayment = false;
    }
  }

  simulateRenewalPaymentSuccess(): void {
    if (!this.renewalOrder) return;
    const testPaymentId = `pay_sim_${Date.now()}`;
    const testSignature = `sig_sim_${Date.now()}`;

    this.verifyRenewalPayment({
      paymentId: this.renewalOrder.paymentId,
      orderId: this.renewalOrder.orderId,
      providerPaymentId: testPaymentId,
      signature: testSignature,
    });
  }

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
        this.toast.success(`Plan upgraded to ${res.payment.plan}!`);
        this.refresh();
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.modalError = this.httpErrors.map(err).message;
      },
    });
  }

  private verifyRenewalPayment(verificationData: {
    paymentId?: string;
    orderId: string;
    providerPaymentId: string;
    signature: string;
  }): void {
    this.isProcessingRenewalPayment = true;
    this.paymentService.verifyPayment(verificationData).subscribe({
      next: (res) => {
        this.isProcessingRenewalPayment = false;
        this.closeRenewalModal();
        this.feedbackMessage = `Subscription renewed successfully! Next billing period active.`;
        this.feedbackTone = 'success';
        this.toast.success('Subscription renewed successfully!');
        this.refresh();
      },
      error: (err) => {
        this.isProcessingRenewalPayment = false;
        this.renewalModalError = this.httpErrors.map(err).message;
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
