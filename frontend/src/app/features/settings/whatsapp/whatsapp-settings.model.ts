export type WhatsAppConnectionAvailability = 'UNAVAILABLE';

export interface WhatsAppBackendCapabilities {
  connectionStatus: WhatsAppConnectionAvailability;
  configurationScope: 'SERVER_LEVEL';
  outboundTemplateMessaging: true;
  deliveryWebhooks: true;
  tenantSpecificAccounts: false;
  browserConfiguration: false;
}
