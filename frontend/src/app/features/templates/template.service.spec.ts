import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { Template, TemplateListData, TemplateWriteRequest } from './template.model';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let http: HttpTestingController;
  const template: Template = { id: 'template-1', name: 'Welcome', metaTemplateName: 'welcome', metaTemplateId: null, category: 'UTILITY', language: 'en_US', headerType: 'TEXT', headerText: 'Hello', body: 'Welcome {{1}}', footer: null, buttons: null, status: 'APPROVED', rejectionReason: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
  const envelope = <T>(data: T): ApiResponse<T> => ({ success: true, message: 'ok', data });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }] });
    service = TestBed.inject(TemplateService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists templates with exact paging, filters, and sorting without companyId', () => {
    const data: TemplateListData = { templates: [template], pagination: { page: 2, limit: 20, totalRecords: 21, totalPages: 2 } };
    service.getTemplates({ page: 2, limit: 20, sortBy: 'createdAt', order: 'ASC', status: 'APPROVED', category: 'UTILITY', language: 'en_US' }).subscribe((result) => expect(result).toEqual(data));
    const request = http.expectOne((req) => req.url === '/api/v1/templates');
    expect(request.request.method).toBe('GET'); expect(request.request.params.get('page')).toBe('2'); expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('sortBy')).toBe('createdAt'); expect(request.request.params.get('order')).toBe('ASC');
    expect(request.request.params.get('status')).toBe('APPROVED'); expect(request.request.params.get('category')).toBe('UTILITY'); expect(request.request.params.get('language')).toBe('en_US');
    expect(request.request.params.has('companyId')).toBeFalse(); request.flush(envelope(data));
  });

  it('searches with the supported keyword parameter', () => {
    service.searchTemplates('welcome').subscribe((result) => expect(result).toEqual([template]));
    const request = http.expectOne('/api/v1/templates/search?keyword=welcome'); expect(request.request.params.has('companyId')).toBeFalse(); request.flush(envelope([template]));
  });

  it('gets a template detail', () => { service.getTemplate('template-1').subscribe((result) => expect(result).toEqual(template)); const request = http.expectOne('/api/v1/templates/template-1'); expect(request.request.method).toBe('GET'); request.flush(envelope(template)); });

  it('creates, updates, and deletes with the exact methods and bodies', () => {
    const payload: TemplateWriteRequest = { name: 'Welcome', metaTemplateName: 'welcome', metaTemplateId: null, category: 'UTILITY', language: 'en_US', headerType: 'TEXT', headerText: 'Hello', body: 'Welcome {{1}}', footer: null, buttons: null };
    service.createTemplate(payload).subscribe(); let request = http.expectOne('/api/v1/templates'); expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(payload); expect(request.request.body.companyId).toBeUndefined(); request.flush(envelope(template));
    service.updateTemplate('template-1', payload).subscribe(); request = http.expectOne('/api/v1/templates/template-1'); expect(request.request.method).toBe('PUT'); expect(request.request.body).toEqual(payload); request.flush(envelope(template));
    service.deleteTemplate('template-1').subscribe((result) => expect(result).toBeUndefined()); request = http.expectOne('/api/v1/templates/template-1'); expect(request.request.method).toBe('DELETE'); request.flush(envelope(null));
  });

  it('propagates API errors', () => {
    let status = 0; service.getTemplates().subscribe({ error: (error) => { status = error.status; } });
    http.expectOne('/api/v1/templates').flush({ success: false, message: 'Forbidden', errors: null }, { status: 403, statusText: 'Forbidden' }); expect(status).toBe(403);
  });
});

