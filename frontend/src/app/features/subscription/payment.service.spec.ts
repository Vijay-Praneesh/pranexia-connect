import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  PaymentHistoryResponse,
  PaymentOrderResponse,
  PricingMatrixResponse,
  VerifyPaymentResponse,
} from './payment.model';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpTesting: HttpTestingController;
  const baseUrl = 'http://localhost:5000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        PaymentService,
      ],
    });

    service = TestBed.inject(PaymentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch pricing matrix', () => {
    const mockPricing: PricingMatrixResponse = {
      currency: 'INR',
      intervals: { MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' },
      plans: [
        {
          name: 'BUSINESS',
          displayName: 'Business',
          tagline: 'Growing businesses',
          limits: {},
          isPurchasable: true,
          pricing: {
            MONTHLY: { amount: 249900, displayAmount: 2499, formatted: '₹2,499/mo' },
            YEARLY: { amount: 2499000, displayAmount: 24990, formatted: '₹24,990/yr' },
          },
        },
      ],
    };

    service.getPricingMatrix().subscribe((res) => {
      expect(res).toEqual(mockPricing);
    });

    const req = httpTesting.expectOne(`${baseUrl}/payments/pricing`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockPricing } as ApiResponse<PricingMatrixResponse>);
  });

  it('should create payment order', () => {
    const mockOrder: PaymentOrderResponse = {
      paymentId: 'pay-1',
      orderId: 'order_123',
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

    service.createOrder({ plan: 'BUSINESS', billingInterval: 'MONTHLY' }).subscribe((res) => {
      expect(res).toEqual(mockOrder);
    });

    const req = httpTesting.expectOne(`${baseUrl}/payments/order`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ plan: 'BUSINESS', billingInterval: 'MONTHLY' });
    req.flush({ success: true, message: 'Created', data: mockOrder } as ApiResponse<PaymentOrderResponse>);
  });

  it('should verify payment signature', () => {
    const mockVerify: VerifyPaymentResponse = {
      success: true,
      payment: {
        id: 'pay-1',
        companyId: 'comp-1',
        provider: 'RAZORPAY',
        providerOrderId: 'order_123',
        providerPaymentId: 'pay_123',
        amount: 249900,
        currency: 'INR',
        status: 'CAPTURED',
        paymentType: 'INITIAL_SUBSCRIPTION',
        plan: 'BUSINESS',
        billingInterval: 'MONTHLY',
        createdAt: '2026-08-31',
        updatedAt: '2026-08-31',
      },
      subscription: { id: 'sub-1', plan: 'BUSINESS', status: 'ACTIVE' },
    };

    service
      .verifyPayment({
        paymentId: 'pay-1',
        orderId: 'order_123',
        providerPaymentId: 'pay_123',
        signature: 'sig_123',
      })
      .subscribe((res) => {
        expect(res).toEqual(mockVerify);
      });

    const req = httpTesting.expectOne(`${baseUrl}/payments/verify`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'Verified', data: mockVerify } as ApiResponse<VerifyPaymentResponse>);
  });

  it('should fetch payment history', () => {
    const mockHistory: PaymentHistoryResponse = {
      count: 1,
      rows: [
        {
          id: 'pay-1',
          companyId: 'comp-1',
          provider: 'RAZORPAY',
          amount: 249900,
          currency: 'INR',
          status: 'CAPTURED',
          paymentType: 'INITIAL_SUBSCRIPTION',
          plan: 'BUSINESS',
          billingInterval: 'MONTHLY',
          createdAt: '2026-08-31',
          updatedAt: '2026-08-31',
        },
      ],
    };

    service.getPaymentHistory(10, 0).subscribe((res) => {
      expect(res).toEqual(mockHistory);
    });

    const req = httpTesting.expectOne(`${baseUrl}/payments/history?limit=10&offset=0`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockHistory } as ApiResponse<PaymentHistoryResponse>);
  });
});
