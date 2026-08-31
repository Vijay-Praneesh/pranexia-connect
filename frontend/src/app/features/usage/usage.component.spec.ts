import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { AuthService } from '../../core/services/auth.service';
import { UsageComponent } from './usage.component';
import { UsageSummary } from './usage.model';
import { UsageService } from './usage.service';

describe('UsageComponent', () => {
  let component: UsageComponent;
  let fixture: ComponentFixture<UsageComponent>;
  let usageService: UsageService;

  const mockSummary: UsageSummary = {
    period: {
      period: '2026-08',
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-31T23:59:59.999Z',
    },
    saas: {
      messages: { sent: 200, delivered: 180, read: 140, failed: 5 },
      campaigns: { created: 4, completed: 4 },
      media: { uploadedCount: 2, uploadedBytes: 4000000, activeFileCount: 6, activeStorageBytes: 12000000 },
      templates: { used: 3 },
    },
    meta: {
      status: 'SYNCED',
      wabaId: 'waba-test',
      syncedAt: '2026-08-15T12:00:00.000Z',
      currency: null,
      amount: null,
      costAvailable: false,
      marketingConversations: 160,
      utilityConversations: 20,
      authenticationConversations: 0,
      serviceConversations: 0,
      totalConversations: 180,
    },
  };

  const mockUser = {
    id: 'user-1',
    role: 'COMPANY_ADMIN',
    company: { id: 'company-a', companyName: 'Acme Corp' },
  };

  const mockAuthService = {
    getCurrentUser: () => mockUser,
    currentUser$: of(mockUser),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
        { provide: AuthService, useValue: mockAuthService },
        UsageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsageComponent);
    component = fixture.componentInstance;
    usageService = TestBed.inject(UsageService);
  });

  it('should create and load initial usage summary and history', () => {
    spyOn(usageService, 'getSummary').and.returnValue(of(mockSummary));
    spyOn(usageService, 'getHistory').and.returnValue(of([]));

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.summary).toEqual(mockSummary);
    expect(component.deliveryRate).toBe(90);
    expect(component.readRate).toBe(70);
    expect(component.loading).toBe(false);
  });

  it('should handle error when fetching usage summary fails', () => {
    spyOn(usageService, 'getSummary').and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Server Error' } }))
    );
    spyOn(usageService, 'getHistory').and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.errorMessage).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('should trigger Meta sync and reload on success', () => {
    spyOn(usageService, 'getSummary').and.returnValue(of(mockSummary));
    spyOn(usageService, 'getHistory').and.returnValue(of([]));
    spyOn(usageService, 'syncMetaUsage').and.returnValue(
      of({
        status: 'SYNCED',
        message: 'Synced',
        syncedAt: '2026-08-15',
        data: {},
      })
    );

    fixture.detectChanges();
    component.syncMeta();

    expect(usageService.syncMetaUsage).toHaveBeenCalledWith(component.selectedPeriod);
    expect(component.metaFeedbackMessage).toBe('Synced');
  });

  it('should format bytes accurately', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
    expect(component.formatBytes(1073741824)).toBe('1 GB');
  });
});
