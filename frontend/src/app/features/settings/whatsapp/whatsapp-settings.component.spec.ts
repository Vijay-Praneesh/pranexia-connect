import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../core/config/api-config.token';
import { WhatsAppSettingsComponent } from './whatsapp-settings.component';

describe('WhatsAppSettingsComponent', () => {
  let fixture: ComponentFixture<WhatsAppSettingsComponent>;
  let component: WhatsAppSettingsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WhatsAppSettingsComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }] }).compileComponents();
    fixture = TestBed.createComponent(WhatsAppSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/whatsapp/status').flush({ success: true, message: 'ok', data: { status: 'DISCONNECTED', connection: null } });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders the disconnected tenant connection state', () => {
    expect(component.status).toBe('DISCONNECTED');
    expect(fixture.nativeElement.textContent).toContain('Connect your WhatsApp Business account');
  });

  it('loads and renders safe connection metadata without credentials', () => {
    component.connection = { id: 'connection-id', companyId: 'company-id', businessPortfolioId: null, wabaId: 'waba-id', phoneNumberId: 'phone-id', displayPhoneNumber: '+15555550123', verifiedName: 'Example Business', status: 'CONNECTED', connectedAt: '2026-01-01T00:00:00Z', disconnectedAt: null, createdAt: '', updatedAt: '' };
    component.status = 'CONNECTED';
    fixture.detectChanges();
    const rendered = String(fixture.nativeElement.textContent).toLowerCase();
    expect(rendered).toContain('example business');
    expect(rendered).toContain('+15555550123');
    expect(rendered).not.toContain('access token');
    expect(rendered).not.toContain('app secret');
  });

  it('does not render credential inputs or fake connection identifiers', () => {
    const rendered = String(fixture.nativeElement.textContent).toLowerCase();
    expect(rendered).not.toContain('access token');
    expect(rendered).not.toContain('app secret');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('requests disconnect through the tenant API', () => {
    component.connection = { id: 'connection-id', companyId: 'company-id', businessPortfolioId: null, wabaId: 'waba-id', phoneNumberId: 'phone-id', displayPhoneNumber: null, verifiedName: null, status: 'CONNECTED', connectedAt: null, disconnectedAt: null, createdAt: '', updatedAt: '' };
    component.status = 'CONNECTED';
    component.disconnect();
    const request = http.expectOne('/api/v1/whatsapp/disconnect');
    expect(request.request.method).toBe('POST');
    request.flush({ success: true, message: 'ok', data: null });
    expect(component.status).toBe('DISCONNECTED');
  });
});
