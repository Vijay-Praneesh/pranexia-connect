import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { Template, TemplateListData } from './template.model';
import { TemplateService } from './template.service';
import { TemplatesComponent } from './templates.component';

describe('TemplatesComponent', () => {
  let fixture: ComponentFixture<TemplatesComponent>;
  let component: TemplatesComponent;
  let api: jasmine.SpyObj<TemplateService>;
  const template: Template = { id: '1', name: 'Welcome', metaTemplateName: 'welcome', metaTemplateId: null, category: 'UTILITY', language: 'en_US', headerType: 'TEXT', headerText: 'Hello', body: 'Welcome {{1}}', footer: 'Thanks', buttons: [{ type: 'URL', text: 'Open' }], status: 'APPROVED', rejectionReason: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' };
  const list: TemplateListData = { templates: [template], pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 } };

  beforeEach(async () => {
    api = jasmine.createSpyObj<TemplateService>('TemplateService', ['getTemplates', 'searchTemplates', 'getTemplate', 'createTemplate', 'updateTemplate', 'deleteTemplate']);
    api.getTemplates.and.returnValue(of(list)); api.searchTemplates.and.returnValue(of([template])); api.getTemplate.and.returnValue(of(template));
    await TestBed.configureTestingModule({ imports: [TemplatesComponent], providers: [provideRouter([]), { provide: TemplateService, useValue: api }] }).compileComponents();
    fixture = TestBed.createComponent(TemplatesComponent); component = fixture.componentInstance; fixture.detectChanges();
  });

  it('renders the template list and status', () => { expect(fixture.nativeElement.textContent).toContain('Welcome'); expect(fixture.nativeElement.textContent).toContain('APPROVED'); });
  it('shows initial loading state', () => { const pending = new Subject<TemplateListData>(); api.getTemplates.and.returnValue(pending); component.templates = []; component.load(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Loading templates'); pending.next(list); pending.complete(); });
  it('shows an empty state', () => { api.getTemplates.and.returnValue(of({ templates: [], pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 0 } })); component.load(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('No templates found'); });
  it('shows an error and retries', () => { api.getTemplates.and.returnValue(throwError(() => ({ status: 0 }))); component.templates = []; component.load(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Templates unavailable'); api.getTemplates.and.returnValue(of(list)); component.load(); expect(component.templates).toEqual([template]); });
  it('debounces search and uses the search endpoint', fakeAsync(() => { component.filtersForm.controls.keyword.setValue('welcome'); tick(349); expect(api.searchTemplates).not.toHaveBeenCalled(); tick(1); fixture.detectChanges(); tick(); expect(api.searchTemplates).toHaveBeenCalledWith('welcome'); }));
  it('loads detail and renders the preview with variables and buttons', () => { component.showDetail('1'); fixture.detectChanges(); expect(api.getTemplate).toHaveBeenCalledWith('1'); expect(fixture.nativeElement.textContent).toContain('Welcome {{1}}'); expect(fixture.nativeElement.textContent).toContain('Variables:'); expect(fixture.nativeElement.textContent).toContain('Open'); });
  it('validates required create fields', () => { component.openCreate(); component.save(); expect(component.templateForm.invalid).toBeTrue(); expect(api.createTemplate).not.toHaveBeenCalled(); });
  it('rejects invalid button JSON', () => { component.openCreate(); component.templateForm.patchValue({ name: 'Test', body: 'Body', buttons: '{}' }); component.save(); expect(component.formError).toContain('JSON array'); });
  it('creates a valid template without companyId', () => { api.createTemplate.and.returnValue(of(template)); component.openCreate(); component.templateForm.patchValue({ name: 'Test', body: 'Body' }); component.save(); const payload = api.createTemplate.calls.mostRecent().args[0]; expect((payload as unknown as Record<string, unknown>)['companyId']).toBeUndefined(); });
  it('updates an existing template', () => { api.updateTemplate.and.returnValue(of(template)); component.openEdit(template); component.save(); expect(api.updateTemplate).toHaveBeenCalledWith('1', jasmine.objectContaining({ name: 'Welcome' })); });
  it('changes page through URL state', fakeAsync(() => { component.changePage(2); tick(); fixture.detectChanges(); expect(component.page).toBe(2); }));
  it('filters search results by active filters', () => { component.category = 'MARKETING'; component.keyword = 'welcome'; component.load(); expect(component.templates).toEqual([]); });
});
