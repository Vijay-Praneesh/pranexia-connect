import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { AuthService } from '../../core/services/auth.service';
import {
  PaymentHistoryResponse,
  PaymentOrderResponse,
  PricingMatrixResponse,
  VerifyPaymentResponse,
} from './payment.model';
import { PaymentService } from './payment.service';
import { SubscriptionComponent } from './subscription.component';
import {
  CurrentSubscriptionResponse,
  SubscriptionHistoryItem,
} from './subscription.model';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionComponent', () => {
  let component: SubscriptionComponent;
  let fixture: ComponentFixture<SubscriptionComponent>;
  let subscriptionService: SubscriptionService;
  let paymentService: PaymentService;

  const mockCurrentResponse: CurrentSubscriptionResponse = {
    subscription: {
      id: 'sub-1',
      companyId: 'company-1',
      plan: 'BUSINESS',
      status: 'ACTIVE',
      startDate: '2026-08-01T00:00:00.000Z',
      currentPeriodStart: '2026-08-01T00:00:00.000Z',
      currentPeriodEnd: '2026-08-31T23:59:59.999Z',
      cancelAtPeriodEnd: false,
    },
    planOverview: {
      plan: {
        name: 'BUSINESS',
        displayName: 'Business',
        tagline: 'Growing business plan',
        customLimits: null,
      },
      metrics: [
        {
          metric: 'MONTHLY_MESSAGES',
          label: 'WhatsApp Messages',
          description: 'Monthly messages',
          unit: 'messages',
          isMonthly: true,
          currentUsage: 5000,
          limit: 25000,
          remaining: 20000,
          percentage: 20,
          status: 'NORMAL',
        },
      ],
      availablePlans: [
        {
          name: 'STARTER',
          displayName: 'Starter',
          tagline: 'Starter tier',
          limits: { MONTHLY_MESSAGES: 5000 },
        },
        {
          name: 'BUSINESS',
          displayName: 'Business',
          tagline: 'Business tier',
          limits: { MONTHLY_MESSAGES: 25000 },
        },
      ],
    },
  };

  const mockHistory: SubscriptionHistoryItem[] = [
    {
      id: 'hist-1',
      companyId: 'company-1',
      subscriptionId: 'sub-1',
      previousPlan: 'STARTER',
      newPlan: 'BUSINESS',
      newStatus: 'ACTIVE',
      action: 'PLAN_CHANGED',
      source: 'ADMIN',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  const mockPricing: PricingMatrixResponse = {
    currency: 'INR',
    intervals: { MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' },
    plans: [
      {
        name: 'BUSINESS',
        displayName: 'Business',
        tagline: 'Growing business plan',
        limits: {},
        isPurchasable: true,
        pricing: {
          MONTHLY: { amount: 249900, displayAmount: 2499, formatted: '₹2,499/mo' },
          YEARLY: { amount: 2499000, displayAmount: 24990, formatted: '₹24,990/yr' },
        },
      },
    ],
  };

  const mockPayments: PaymentHistoryResponse = {
    count: 1,
    rows: [
      {
        id: 'pay-1',
        companyId: 'company-1',
        provider: 'RAZORPAY',
        amount: 249900,
        currency: 'INR',
        status: 'CAPTURED',
        paymentType: 'INITIAL_SUBSCRIPTION',
        plan: 'BUSINESS',
        billingInterval: 'MONTHLY',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  };

  const mockUser = {
    id: 'user-1',
    role: 'COMPANY_ADMIN',
    company: { id: 'company-1', companyName: 'Acme Corp' },
  };

  const mockAuthService = {
    getCurrentUser: () => mockUser,
    currentUser$: of(mockUser),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
        { provide: AuthService, useValue: mockAuthService },
        SubscriptionService,
        PaymentService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionComponent);
    component = fixture.componentInstance;
    subscriptionService = TestBed.inject(SubscriptionService);
    paymentService = TestBed.inject(PaymentService);
  });

  it('should create and load initial subscription details, pricing, and history', () => {
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      of(mockCurrentResponse)
    );
    spyOn(subscriptionService, 'getSubscriptionHistory').and.returnValue(
      of(mockHistory)
    );
    spyOn(paymentService, 'getPaymentHistory').and.returnValue(
      of(mockPayments)
    );
    spyOn(paymentService, 'getPricingMatrix').and.returnValue(
      of(mockPricing)
    );

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.subscription).toEqual(mockCurrentResponse.subscription);
    expect(component.planOverview).toEqual(mockCurrentResponse.planOverview);
    expect(component.history).toEqual(mockHistory);
    expect(component.paymentHistory).toEqual(mockPayments.rows);
    expect(component.pricingMatrix).toEqual(mockPricing);
    expect(component.loading).toBe(false);
  });

  it('should handle error when fetching subscription fails', () => {
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Server Error' } }))
    );
    spyOn(subscriptionService, 'getSubscriptionHistory').and.returnValue(
      of([])
    );
    spyOn(paymentService, 'getPaymentHistory').and.returnValue(
      of({ count: 0, rows: [] })
    );
    spyOn(paymentService, 'getPricingMatrix').and.returnValue(
      of(mockPricing)
    );

    fixture.detectChanges();

    expect(component.errorMessage).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('should open and close checkout modal', () => {
    expect(component.showCheckoutModal).toBe(false);
    component.openCheckout('BUSINESS');
    expect(component.showCheckoutModal).toBe(true);
    expect(component.selectedPlanForCheckout).toBe('BUSINESS');
    component.closeCheckout();
    expect(component.showCheckoutModal).toBe(false);
  });

  it('should initiate checkout and create payment order', () => {
    const mockOrder: PaymentOrderResponse = {
      paymentId: 'pay-new',
      orderId: 'order_test_999',
      amount: 249900,
      currency: 'INR',
      keyId: 'rzp_test_123',
      plan: 'BUSINESS',
      planDisplayName: 'Business',
      billingInterval: 'MONTHLY',
      displayAmount: '2499.00',
      companyName: 'Acme Corp',
      companyEmail: 'billing@acme.com',
    };

    spyOn(paymentService, 'createOrder').and.returnValue(of(mockOrder));

    component.openCheckout('BUSINESS');
    component.selectedInterval = 'MONTHLY';
    component.startCheckout();

    expect(paymentService.createOrder).toHaveBeenCalledWith({
      plan: 'BUSINESS',
      billingInterval: 'MONTHLY',
    });
    expect(component.checkoutOrder).toEqual(mockOrder);
  });

  it('should format bytes and progress bar class accurately', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.getProgressBarClass('NORMAL')).toBe('bg-primary');
    expect(component.getProgressBarClass('OVER_LIMIT')).toBe('bg-danger');
  });
});
