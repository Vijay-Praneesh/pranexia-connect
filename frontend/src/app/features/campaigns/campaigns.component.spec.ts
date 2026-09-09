import { HttpResponse } from '@angular/common/http';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { CustomerService } from '../customers/customer.service';
import { TemplateService } from '../templates/template.service';
import { MediaService } from '../media/media.service';
import { WhatsAppSettingsService } from '../settings/whatsapp/whatsapp-settings.service';
import { Campaign, CampaignListData, CampaignReport } from './campaign.model';
import { CampaignService } from './campaign.service';
import { CampaignsComponent } from './campaigns.component';

describe('CampaignsComponent', () => {
  let fixture: ComponentFixture<CampaignsComponent>;
  let component: CampaignsComponent;
  let api: jasmine.SpyObj<CampaignService>;
  let mediaApi: jasmine.SpyObj<MediaService>;
  let dashboardApi: jasmine.SpyObj<DashboardService>;
  let whatsappApi: jasmine.SpyObj<WhatsAppSettingsService>;
  let authService: jasmine.SpyObj<AuthService>;

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
            lastName: 'Sharma',
            mobile: '123',
            email: 'asha@example.com',
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

    mediaApi = jasmine.createSpyObj('MediaService', ['getMedia', 'getMediaFile']);
    mediaApi.getMedia.and.returnValue(
      of({
        media: [
          {
            id: 'm1',
            originalName: 'logo-black.png',
            storedName: 'logo-black.png',
            mimeType: 'image/png',
            mediaType: 'IMAGE',
            size: 1024,
            status: 'READY',
            createdAt: '',
            updatedAt: '',
          },
        ],
        pagination: { page: 1, limit: 100, totalRecords: 1, totalPages: 1 },
      }),
    );
    mediaApi.getMediaFile.and.returnValue(
      of(new HttpResponse({ body: new Blob(['fake-img-data'], { type: 'image/png' }) })),
    );

    dashboardApi = jasmine.createSpyObj('DashboardService', ['getSummary']);
    dashboardApi.getSummary.and.returnValue(
      of({
        campaigns: {
          total: 1,
          draft: 1,
          scheduled: 0,
          running: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
        },
        messages: {
          totalRecipients: 2,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        },
        performance: {
          deliveryRate: 0,
          readRate: 0,
          failureRate: 0,
        },
      }),
    );

    whatsappApi = jasmine.createSpyObj('WhatsAppSettingsService', ['getStatus']);
    whatsappApi.getStatus.and.returnValue(
      of({
        status: 'CONNECTED',
        connection: null,
      }),
    );

    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({
      id: 'usr1',
      email: 'admin@seyyon.com',
      companyId: 'comp1',
      firstName: 'Admin',
      lastName: 'User',
      mobile: '+1234567890',
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
      company: {
        id: 'comp1',
        companyName: 'Seyyon Connect Enterprise',
        email: 'company@seyyon.com',
        mobile: '+1234567890',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      },
    });

    await TestBed.configureTestingModule({
      imports: [CampaignsComponent],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: api },
        { provide: TemplateService, useValue: templates },
        { provide: CustomerService, useValue: customers },
        { provide: MediaService, useValue: mediaApi },
        { provide: DashboardService, useValue: dashboardApi },
        { provide: WhatsAppSettingsService, useValue: whatsappApi },
        { provide: AuthService, useValue: authService },
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
    expect(fixture.nativeElement.textContent).toContain('WhatsApp Connected');
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
    expect(fixture.nativeElement.textContent).toContain('No campaigns yet');
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

  it('filters recipients by search query and toggles all', () => {
    expect(component.filteredCustomers().length).toBe(1);
    component.recipientSearch = 'nonexistent';
    expect(component.filteredCustomers().length).toBe(0);
    component.recipientSearch = 'Asha';
    expect(component.filteredCustomers().length).toBe(1);
    component.toggleAllCustomers(true);
    expect(component.selectedCustomers.has('u1')).toBeTrue();
    expect(component.isAllFilteredSelected()).toBeTrue();
    component.toggleAllCustomers(false);
    expect(component.selectedCustomers.has('u1')).toBeFalse();
  });

  it('updates live WhatsApp preview dynamically on form changes', () => {
    component.openCreate();
    fixture.detectChanges();

    // No template initially selected
    expect(component.selectedTemplateObj()).toBeUndefined();
    expect(component.livePreviewBodyText).toBe('');

    // Set template
    component.campaignForm.patchValue({ templateId: 't1' });
    fixture.detectChanges();
    expect(component.selectedTemplateObj()?.name).toBe('Welcome');
    expect(component.livePreviewBodyText).toBe('Hi');

    // Set campaign name and description
    component.campaignForm.patchValue({
      name: 'Pranexia_Campaign',
      description: 'Hey hi Hello',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pranexia_Campaign');
    expect(fixture.nativeElement.textContent).toContain('Hey hi Hello');

    // Select media asset
    component.campaignForm.patchValue({ mediaId: 'm1' });
    fixture.detectChanges();
    expect(component.selectedMediaObj()?.originalName).toBe('logo-black.png');
    expect(component.getMediaPreviewUrl('m1')).toBeDefined();

    // Clear media asset
    component.campaignForm.patchValue({ mediaId: '' });
    fixture.detectChanges();
    expect(component.selectedMediaObj()).toBeUndefined();
  });
});
