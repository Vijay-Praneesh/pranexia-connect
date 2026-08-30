export type WhatsAppConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface WhatsAppConnection {
  id: string;
  companyId: string;
  businessPortfolioId: string | null;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: WhatsAppConnectionStatus;
  connectedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConnectionStatusResponse {
  status: WhatsAppConnectionStatus;
  connection: WhatsAppConnection | null;
}

export interface WhatsAppConnectRequest {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}
