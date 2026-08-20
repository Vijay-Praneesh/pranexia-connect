import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { WhatsAppSettingsComponent } from './whatsapp-settings.component';

describe('WhatsAppSettingsComponent', () => {
  let fixture: ComponentFixture<WhatsAppSettingsComponent>;
  let component: WhatsAppSettingsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WhatsAppSettingsComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(WhatsAppSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the backend-authoritative unavailable state', () => {
    expect(component.capabilities.connectionStatus).toBe('UNAVAILABLE');
    expect(fixture.nativeElement.textContent).toContain('Connection status unavailable');
  });

  it('describes the server-level configuration limitation', () => {
    expect(component.capabilities.configurationScope).toBe('SERVER_LEVEL');
    expect(component.capabilities.tenantSpecificAccounts).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Server-level');
  });

  it('does not render credentials, identifiers, or fake connection controls', () => {
    const rendered = String(fixture.nativeElement.textContent).toLowerCase();
    expect(rendered).not.toContain('access token');
    expect(rendered).not.toContain('phone number id');
    expect(rendered).not.toContain('business account id');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('accurately renders existing messaging and webhook capabilities', () => {
    expect(component.capabilities.outboundTemplateMessaging).toBeTrue();
    expect(component.capabilities.deliveryWebhooks).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Template messaging');
    expect(fixture.nativeElement.textContent).toContain('Delivery updates');
  });
});
