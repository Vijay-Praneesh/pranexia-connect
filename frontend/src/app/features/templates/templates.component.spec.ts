import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { WhatsAppSettingsService } from '../settings/whatsapp/whatsapp-settings.service';
import { Template, TemplateListData } from './template.model';
import { TemplateService } from './template.service';
import { TemplatesComponent } from './templates.component';

describe('TemplatesComponent', () => {
  let fixture: ComponentFixture<TemplatesComponent>;
  let component: TemplatesComponent;
  let api: jasmine.SpyObj<TemplateService>;
  let authService: jasmine.SpyObj<AuthService>;
  let whatsappApi: jasmine.SpyObj<WhatsAppSettingsService>;

  const template: Template = {
    id: '1',
    name: 'Welcome',
    metaTemplateName: 'welcome',
    metaTemplateId: null,
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'TEXT',
    headerText: 'Hello',
    body: 'Welcome {{1}}',
    footer: 'Thanks',
    buttons: [{ type: 'URL', text: 'Open' }],
    status: 'APPROVED',
    rejectionReason: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };

  const list: TemplateListData = {
    templates: [template],
    pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 },
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<TemplateService>('TemplateService', [
      'getTemplates',
      'searchTemplates',
      'getTemplate',
      'createTemplate',
      'syncTemplates',
    ]);
    api.getTemplates.and.returnValue(of(list));
    api.searchTemplates.and.returnValue(of([template]));
    api.getTemplate.and.returnValue(of(template));

    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getCurrentUser',
    ]);
    authService.getCurrentUser.and.returnValue({
      id: 'u1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      mobile: '1234567890',
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      companyId: 'c1',
      createdAt: '',
      updatedAt: '',
      company: {
        id: 'c1',
        companyName: 'Seyyon Connect',
        email: 'info@seyyon.com',
        mobile: '1234567890',
        plan: 'BUSINESS',
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      },
    });

    whatsappApi = jasmine.createSpyObj<WhatsAppSettingsService>(
      'WhatsAppSettingsService',
      ['getStatus'],
    );
    whatsappApi.getStatus.and.returnValue(
      of({ status: 'CONNECTED', connection: null }),
    );

    await TestBed.configureTestingModule({
      imports: [TemplatesComponent],
      providers: [
        provideRouter([]),
        { provide: TemplateService, useValue: api },
        { provide: AuthService, useValue: authService },
        { provide: WhatsAppSettingsService, useValue: whatsappApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the template list and status', () => {
    expect(fixture.nativeElement.textContent).toContain('Welcome');
    expect(fixture.nativeElement.textContent).toContain('APPROVED');
  });

  it('shows initial loading state', () => {
    const pending = new Subject<TemplateListData>();
    api.getTemplates.and.returnValue(pending);
    component.templates = [];
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading templates');
    pending.next(list);
    pending.complete();
  });

  it('shows an empty state', () => {
    api.getTemplates.and.returnValue(
      of({
        templates: [],
        pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 0 },
      }),
    );
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No templates found');
  });

  it('shows an error and retries', () => {
    api.getTemplates.and.returnValue(throwError(() => ({ status: 0 })));
    component.templates = [];
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Templates unavailable');
    api.getTemplates.and.returnValue(of(list));
    component.load();
    expect(component.templates).toEqual([template]);
  });

  it('debounces search and uses the search endpoint', fakeAsync(() => {
    component.filtersForm.controls.keyword.setValue('welcome');
    tick(349);
    expect(api.searchTemplates).not.toHaveBeenCalled();
    tick(1);
    fixture.detectChanges();
    tick();
    expect(api.searchTemplates).toHaveBeenCalledWith('welcome');
  }));

  it('loads detail and renders the preview with variables and buttons', () => {
    component.showDetail('1');
    fixture.detectChanges();
    expect(api.getTemplate).toHaveBeenCalledWith('1');
    expect(fixture.nativeElement.textContent).toContain('Welcome {{1}}');
    expect(fixture.nativeElement.textContent).toContain('Variables:');
    expect(fixture.nativeElement.textContent).toContain('Open');
  });

  it('validates required create fields', () => {
    component.openCreate();
    component.save();
    expect(component.templateForm.invalid).toBeTrue();
    expect(api.createTemplate).not.toHaveBeenCalled();
  });

  it('rejects invalid button JSON', () => {
    component.openCreate();
    component.templateForm.patchValue({
      name: 'Test',
      body: 'Body',
      buttons: '{}',
    });
    component.save();
    expect(component.formError).toContain('JSON array');
  });

  it('creates a valid template without companyId', () => {
    api.createTemplate.and.returnValue(of(template));
    component.openCreate();
    component.templateForm.patchValue({ name: 'Test', body: 'Body' });
    component.save();
    const payload = api.createTemplate.calls.mostRecent().args[0];
    expect(
      (payload as unknown as Record<string, unknown>)['companyId'],
    ).toBeUndefined();
  });

  it('does not expose unsupported Meta edit or delete actions', () => {
    expect(fixture.nativeElement.querySelector('[aria-label^="Edit"]')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label^="Delete"]'),
    ).toBeNull();
  });

  it('changes page through URL state', fakeAsync(() => {
    component.changePage(2);
    tick();
    fixture.detectChanges();
    expect(component.page).toBe(2);
  }));

  it('filters search results by active filters', () => {
    component.category = 'MARKETING';
    component.keyword = 'welcome';
    component.load();
    expect(component.templates).toEqual([]);
  });

  it('switches between visual card and table view modes', () => {
    expect(component.viewMode).toBe('grid');
    component.viewMode = 'table';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });

  it('inserts consecutive variable placeholder into body', () => {
    component.templateForm.controls.body.setValue('Hello {{1}}');
    component.addNextVariable();
    expect(component.templateForm.controls.body.value).toBe('Hello {{1}} {{2}}');
  });

  it('sets buttons preset configuration correctly', () => {
    component.setButtonsPreset('URL');
    expect(component.templateForm.controls.buttons.value).toContain('Visit Website');
    expect(component.getLivePreviewButtons().length).toBe(1);
  });
});

