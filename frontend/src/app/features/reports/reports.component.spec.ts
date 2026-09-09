import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { Campaign, CampaignListData, CampaignReport } from '../campaigns/campaign.model';
import { ReportsComponent } from './reports.component';
import { ReportsService } from './reports.service';

describe('ReportsComponent', () => {
  let fixture: ComponentFixture<ReportsComponent>;
  let component: ReportsComponent;
  let api: jasmine.SpyObj<ReportsService>;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const campaign: Campaign = {
    id: 'c1',
    templateId: 't1',
    name: 'Launch',
    description: null,
    sendType: 'NOW',
    scheduledAt: null,
    status: 'COMPLETED',
    totalRecipients: 2,
    sentCount: 2,
    deliveredCount: 1,
    readCount: 1,
    failedCount: 0,
    progress: 100,
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T01:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T01:00:00Z',
  };

  const report: CampaignReport = {
    campaignId: 'c1',
    campaignName: 'Launch',
    status: 'COMPLETED',
    totalRecipients: 2,
    sentCount: 2,
    deliveredCount: 1,
    readCount: 1,
    failedCount: 0,
    progress: 100,
    deliveryRate: 50,
    readRate: 50,
    failureRate: 0,
    startedAt: campaign.startedAt,
    completedAt: campaign.completedAt,
  };

  const list: CampaignListData = {
    campaigns: [campaign],
    pagination: { page: 1, limit: 100, totalRecords: 1, totalPages: 1 },
  };

  beforeEach(async () => {
    params$ = new BehaviorSubject(convertToParamMap({}));
    api = jasmine.createSpyObj('ReportsService', [
      'getCampaigns',
      'getCampaignReport',
      'getRecipients',
    ]);
    api.getCampaigns.and.returnValue(of(list));
    api.getCampaignReport.and.returnValue(of(report));
    api.getRecipients.and.returnValue(
      of({
        recipients: [],
        pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 0 },
      })
    );

    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [
        provideRouter([]),
        { provide: ReportsService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: params$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('renders the report page and campaign selector', () => {
    expect(fixture.nativeElement.textContent).toContain('Reports');
    expect(fixture.nativeElement.textContent).toContain('Launch');
  });

  it('shows campaign loading state', () => {
    const pending = new Subject<CampaignListData>();
    api.getCampaigns.and.returnValue(pending);
    component.campaigns = [];
    component.loadCampaigns();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading available campaigns');
  });

  it('shows empty campaign state', () => {
    api.getCampaigns.and.returnValue(
      of({
        campaigns: [],
        pagination: { page: 1, limit: 100, totalRecords: 0, totalPages: 0 },
      })
    );
    component.loadCampaigns();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No campaigns available');
  });

  it('shows selection empty state before a campaign is selected', () => {
    expect(fixture.nativeElement.textContent).toContain('Select a Campaign');
    expect(api.getCampaignReport).not.toHaveBeenCalled();
  });

  it('loads and renders selected campaign statistics and recipient empty state', () => {
    params$.next(convertToParamMap({ campaignId: 'c1' }));
    fixture.detectChanges();
    expect(api.getCampaignReport).toHaveBeenCalledWith('c1');
    expect(fixture.nativeElement.textContent).toContain('Delivery Rate');
    expect(fixture.nativeElement.textContent).toContain('50%');
    expect(fixture.nativeElement.textContent).toContain('No recipients');
  });

  it('passes recipient status filter and pagination', () => {
    params$.next(convertToParamMap({ campaignId: 'c1', status: 'READ', page: 1 }));
    expect(api.getRecipients.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ campaignId: 'c1', status: 'READ', page: 1 })
    );
    params$.next(convertToParamMap({ campaignId: 'c1', status: 'READ', page: 2 }));
    expect(api.getRecipients.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ page: 2 })
    );
  });

  it('renders recipient status and timestamps', () => {
    api.getRecipients.and.returnValue(
      of({
        recipients: [
          {
            id: 'r1',
            campaignId: 'c1',
            customerId: 'u1',
            status: 'READ',
            whatsappMessageId: null,
            failureReason: null,
            sentAt: '2026-01-01T00:10:00Z',
            deliveredAt: '2026-01-01T00:20:00Z',
            readAt: '2026-01-01T00:30:00Z',
            createdAt: '',
            updatedAt: '',
            customer: {
              id: 'u1',
              firstName: 'Asha',
              lastName: null,
              mobile: '123',
              email: null,
              country: 'India',
              tags: null,
              notes: null,
              status: 'ACTIVE',
              createdAt: '',
              updatedAt: '',
            },
          },
        ],
        pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 },
      })
    );
    params$.next(convertToParamMap({ campaignId: 'c1' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Asha');
    expect(fixture.nativeElement.textContent).toContain('READ');
  });

  it('refreshes the selected report', () => {
    params$.next(convertToParamMap({ campaignId: 'c1' }));
    api.getCampaignReport.calls.reset();
    component.refresh();
    expect(api.getCampaignReport).toHaveBeenCalledWith('c1');
  });

  it('shows a retryable API error', () => {
    api.getCampaigns.and.returnValue(throwError(() => ({ status: 0 })));
    component.campaigns = [];
    component.loadCampaigns();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reports unavailable');
  });

  it('polls only active reports and stops for terminal reports', fakeAsync(() => {
    api.getCampaignReport.and.returnValue(of({ ...report, status: 'RUNNING' }));
    component.campaignId = 'c1';
    component.loadReport();
    api.getCampaignReport.calls.reset();
    tick(15000);
    expect(api.getCampaignReport).toHaveBeenCalledWith('c1');
    api.getCampaignReport.and.returnValue(of(report));
    tick(15000);
    api.getCampaignReport.calls.reset();
    tick(15000);
    expect(api.getCampaignReport).not.toHaveBeenCalled();
  }));

  it('formats customer initials and execution duration correctly', () => {
    expect(component.getInitials('John', 'Doe')).toBe('JD');
    expect(component.getInitials('Sarah', undefined)).toBe('S');
    expect(component.getInitials('Sarah', null)).toBe('S');
    expect(component.getInitials(undefined, undefined)).toBe('CU');
    expect(component.getInitials(null, null)).toBe('CU');
    expect(component.getExecutionDuration('2026-01-01T00:00:00Z', '2026-01-01T00:05:30Z')).toBe('5m 30s');
    expect(component.getExecutionDuration(null, null)).toBe('—');
  });

  it('allows selecting campaign directly and filtering status', () => {
    component.selectCampaignDirectly('c1');
    expect(component.selectionForm.controls.campaignId.value).toBe('c1');
    component.filterByStatus('DELIVERED');
    expect(component.selectionForm.controls.status.value).toBe('DELIVERED');
  });

  it('exports recipient report to CSV when records are present', () => {
    component.report = report;
    component.recipients = [
      {
        id: 'r1',
        campaignId: 'c1',
        customerId: 'u1',
        status: 'DELIVERED',
        whatsappMessageId: 'wamid.123',
        failureReason: null,
        sentAt: '2026-01-01T00:10:00Z',
        deliveredAt: '2026-01-01T00:20:00Z',
        readAt: null,
        createdAt: '',
        updatedAt: '',
        customer: {
          id: 'u1',
          firstName: 'Vijay',
          lastName: 'Praneesh',
          mobile: '+919876543210',
          email: 'vijay@example.com',
          country: 'India',
          tags: null,
          notes: null,
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: '',
        },
      },
    ];

    spyOn(URL, 'createObjectURL').and.returnValue('blob:report');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');

    component.exportCsv();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
