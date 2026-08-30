import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CustomerService } from '../customers/customer.service';
import { TemplateService } from '../templates/template.service';
import { MediaService } from '../media/media.service';
import { Campaign, CampaignListData, CampaignReport } from './campaign.model';
import { CampaignService } from './campaign.service';
import { CampaignsComponent } from './campaigns.component';

describe('CampaignsComponent', () => {
  let fixture: ComponentFixture<CampaignsComponent>;
  let component: CampaignsComponent;
  let api: jasmine.SpyObj<CampaignService>;
  let mediaApi: jasmine.SpyObj<MediaService>;
  const campaign: Campaign = {
    id: 'c1',
    templateId: 't1',
    name: 'Launch',
    description: 'Product launch',
    sendType: 'NOW',
    scheduledAt: null,
    status: 'DRAFT',
    totalRecipients: 2,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    progress: 0,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    template: {
      id: 't1',
      name: 'Welcome',
      metaTemplateName: 'welcome',
      metaTemplateId: null,
      category: 'UTILITY',
      language: 'en_US',
      headerType: 'NONE',
      headerText: null,
      body: 'Hi',
      footer: null,
      buttons: null,
      status: 'APPROVED',
      rejectionReason: null,
      createdAt: '',
      updatedAt: '',
    },
  };
  beforeEach(async () => {
    api = jasmine.createSpyObj('CampaignService', [
      'getCampaigns',
      'searchCampaigns',
      'getCampaign',
      'createCampaign',
      'updateCampaign',
      'deleteCampaign',
      'sendCampaign',
      'cancelCampaign',
      'getCampaignReport',
      'assignRecipients',
      'getCampaignRecipients',
    ]);
    api.getCampaigns.and.returnValue(
      of({
        campaigns: [campaign],
        pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 },
      }),
    );
    api.searchCampaigns.and.returnValue(of([campaign]));
    api.getCampaign.and.returnValue(of(campaign));
    const templates = jasmine.createSpyObj('TemplateService', ['getTemplates']);
    templates.getTemplates.and.returnValue(
      of({
        templates: [campaign.template],
        pagination: { page: 1, limit: 100, totalRecords: 1, totalPages: 1 },
      }),
    );
    const customers = jasmine.createSpyObj('CustomerService', ['getCustomers']);
    customers.getCustomers.and.returnValue(
      of({
        customers: [
          {
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
        ],
        pagination: { page: 1, limit: 100, totalRecords: 1, totalPages: 1 },
      }),
    );
    mediaApi = jasmine.createSpyObj('MediaService', ['getMedia']);
    mediaApi.getMedia.and.returnValue(of({ media: [], pagination: { page: 1, limit: 100, totalRecords: 0, totalPages: 0 } }));
    await TestBed.configureTestingModule({
      imports: [CampaignsComponent],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: api },
        { provide: TemplateService, useValue: templates },
        { provide: CustomerService, useValue: customers },
        { provide: MediaService, useValue: mediaApi },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CampaignsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => component.ngOnDestroy());

  it('renders campaign list and status badge', () => {
    expect(fixture.nativeElement.textContent).toContain('Launch');
    expect(fixture.nativeElement.textContent).toContain('DRAFT');
  });
  it('renders loading and empty states', () => {
    const pending = new Subject<CampaignListData>();
    api.getCampaigns.and.returnValue(pending);
    component.campaigns = [];
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading campaigns');
    pending.next({
      campaigns: [],
      pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 0 },
    });
    pending.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No campaigns found');
  });
  it('debounces search', fakeAsync(() => {
    component.filtersForm.controls.keyword.setValue('launch');
    tick(349);
    expect(api.searchCampaigns).not.toHaveBeenCalled();
    tick(1);
    fixture.detectChanges();
    tick();
    expect(api.searchCampaigns).toHaveBeenCalledWith('launch', {
      status: undefined,
      sendType: undefined,
      templateId: undefined,
    });
  }));
  it('shows retryable errors', () => {
    api.getCampaigns.and.returnValue(throwError(() => ({ status: 0 })));
    component.campaigns = [];
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Campaigns unavailable',
    );
  });
  it('validates create template selection', () => {
    component.openCreate();
    component.campaignForm.patchValue({ name: 'Test' });
    component.save();
    expect(component.campaignForm.invalid).toBeTrue();
    expect(api.createCampaign).not.toHaveBeenCalled();
  });
  it('creates, assigns selected recipients, and preserves tenant isolation', () => {
    api.createCampaign.and.returnValue(of(campaign));
    api.assignRecipients.and.returnValue(
      of({ message: 'ok', totalRecipients: 1 }),
    );
    component.openCreate();
    component.campaignForm.patchValue({ name: 'Test', templateId: 't1' });
    component.toggleCustomer('u1', true);
    component.save();
    expect(api.createCampaign).toHaveBeenCalled();
    expect(api.assignRecipients).toHaveBeenCalledWith({
      campaignId: 'c1',
      customerIds: ['u1'],
    });
    expect(
      (
        api.createCampaign.calls.mostRecent().args[0] as unknown as Record<
          string,
          unknown
        >
      )['companyId'],
    ).toBeUndefined();
  });
  it('serializes scheduling as ISO and updates after creation', () => {
    api.createCampaign.and.returnValue(of(campaign));
    api.updateCampaign.and.returnValue(
      of({ ...campaign, status: 'SCHEDULED' }),
    );
    component.openCreate();
    component.campaignForm.patchValue({
      name: 'Scheduled',
      templateId: 't1',
      sendType: 'SCHEDULED',
      scheduledAt: '2030-01-01T10:00',
    });
    component.save();
    expect(api.updateCampaign.calls.mostRecent().args[1].scheduledAt).toMatch(
      /^2030-01-01T/,
    );
  });
  it('derives actions from status', () => {
    expect(component.canSend(campaign)).toBeTrue();
    expect(component.canCancel(campaign)).toBeFalse();
    expect(
      component.canCancel({ ...campaign, status: 'SCHEDULED' }),
    ).toBeTrue();
    expect(component.canSend({ ...campaign, status: 'COMPLETED' })).toBeFalse();
  });
  it('loads details and recipient report only when requested', () => {
    const report = {
      campaignId: 'c1',
      campaignName: 'Launch',
      status: 'DRAFT',
      totalRecipients: 2,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      progress: 0,
      deliveryRate: 0,
      readRate: 0,
      failureRate: 0,
      startedAt: null,
      completedAt: null,
    } as CampaignReport;
    api.getCampaignReport.and.returnValue(of(report));
    api.getCampaignRecipients.and.returnValue(
      of({
        recipients: [],
        pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 0 },
      }),
    );
    component.showDetail('c1');
    expect(api.getCampaignReport).not.toHaveBeenCalled();
    component.loadReport();
    expect(api.getCampaignReport).toHaveBeenCalledWith('c1');
    expect(component.report).toEqual(report);
  });
  it('polls scheduled campaigns and stops for terminal status', fakeAsync(() => {
    api.getCampaign.and.returnValue(of({ ...campaign, status: 'SCHEDULED' }));
    component.showDetail('c1');
    api.getCampaign.calls.reset();
    tick(15000);
    expect(api.getCampaign).toHaveBeenCalledWith('c1');
    api.getCampaign.and.returnValue(of({ ...campaign, status: 'COMPLETED' }));
    tick(15000);
    api.getCampaign.calls.reset();
    tick(15000);
    expect(api.getCampaign).not.toHaveBeenCalled();
  }));
});
