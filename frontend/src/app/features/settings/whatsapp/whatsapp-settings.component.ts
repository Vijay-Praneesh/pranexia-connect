import { Component } from '@angular/core';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { WhatsAppBackendCapabilities } from './whatsapp-settings.model';

@Component({ selector: 'app-whatsapp-settings', standalone: true, imports: [StatusBadgeComponent], templateUrl: './whatsapp-settings.component.html', styleUrl: './whatsapp-settings.component.scss' })
export class WhatsAppSettingsComponent {
  readonly capabilities: WhatsAppBackendCapabilities = { connectionStatus: 'UNAVAILABLE', configurationScope: 'SERVER_LEVEL', outboundTemplateMessaging: true, deliveryWebhooks: true, tenantSpecificAccounts: false, browserConfiguration: false };
}
