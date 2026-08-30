import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { HttpErrorService } from '../../../core/services/http-error.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { WhatsAppConnection, WhatsAppConnectionStatus, WhatsAppConnectRequest } from './whatsapp-settings.model';
import { WhatsAppSettingsService } from './whatsapp-settings.service';

interface MetaSignupMessage {
  type?: string;
  event?: string;
  data?: { phone_number_id?: string; waba_id?: string; business_id?: string };
}

declare global {
  interface Window {
    FB?: {
      init(options: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void;
      login(callback: (response: { authResponse?: { code?: string } }) => void, options: { config_id: string; response_type: string; override_default_response_type: boolean; extras: Record<string, unknown> }): void;
    };
  }
}

@Component({ selector: 'app-whatsapp-settings', standalone: true, imports: [DatePipe, ErrorStateComponent, LoadingStateComponent, StatusBadgeComponent], templateUrl: './whatsapp-settings.component.html', styleUrl: './whatsapp-settings.component.scss' })
export class WhatsAppSettingsComponent implements OnInit, OnDestroy {
  private readonly api = inject(WhatsAppSettingsService);
  private readonly errors = inject(HttpErrorService);

  connection: WhatsAppConnection | null = null;
  status: WhatsAppConnectionStatus = 'DISCONNECTED';
  loading = true;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';
  private messageListener?: (event: MessageEvent<MetaSignupMessage>) => void;
  private signupCode = '';

  ngOnInit(): void { this.messageListener = (event) => this.handleMetaMessage(event); window.addEventListener('message', this.messageListener); this.load(); }
  ngOnDestroy(): void { if (this.messageListener) window.removeEventListener('message', this.messageListener); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.api.getStatus().pipe(finalize(() => { this.loading = false; })).subscribe({
      next: (result) => { this.status = result.status; this.connection = result.connection; },
      error: (error: unknown) => { this.errorMessage = this.errors.map(error).message; },
    });
  }

  connect(): void {
    if (this.actionLoading) return;
    if (!environment.metaAppId || !environment.metaConfigId) { this.errorMessage = 'Meta Embedded Signup is not configured for this environment.'; return; }
    this.actionLoading = true; this.status = 'CONNECTING'; this.errorMessage = '';
    this.loadMetaSdk(() => {
      if (!window.FB) { this.failConnection('Meta Embedded Signup could not be loaded.'); return; }
      window.FB.login((response) => {
        if (!response.authResponse?.code) this.failConnection('WhatsApp onboarding was cancelled or did not return an authorization code.');
        else this.signupCode = response.authResponse.code;
      }, { config_id: environment.metaConfigId, response_type: 'code', override_default_response_type: true, extras: { sessionInfoVersion: '3' } });
    });
  }

  disconnect(): void {
    if (this.actionLoading) return;
    this.actionLoading = true; this.errorMessage = '';
    this.api.disconnect().pipe(finalize(() => { this.actionLoading = false; })).subscribe({
      next: () => { this.connection = null; this.status = 'DISCONNECTED'; this.successMessage = 'WhatsApp connection disconnected.'; },
      error: (error: unknown) => { this.errorMessage = this.errors.map(error).message; },
    });
  }

  private handleMetaMessage(event: MessageEvent<MetaSignupMessage>): void {
    if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
    const message = event.data;
    if (message.type !== 'WA_EMBEDDED_SIGNUP' || message.event !== 'FINISH' || !message.data?.waba_id || !message.data.phone_number_id || !this.signupCode) return;
    const request: WhatsAppConnectRequest = { code: this.signupCode, wabaId: message.data.waba_id, phoneNumberId: message.data.phone_number_id };
    this.api.connect(request).pipe(finalize(() => { this.actionLoading = false; })).subscribe({
      next: (connection) => { this.connection = connection; this.status = connection.status; this.successMessage = 'WhatsApp Business connected successfully.'; },
      error: (error: unknown) => { this.failConnection(this.errors.map(error).message); },
    });
    this.signupCode = '';
  }

  private loadMetaSdk(ready: () => void): void {
    if (window.FB) { ready(); return; }
    const existing = document.getElementById('facebook-jssdk');
    if (existing) { existing.addEventListener('load', ready, { once: true }); return; }
    const script = document.createElement('script'); script.id = 'facebook-jssdk'; script.src = 'https://connect.facebook.net/en_US/sdk.js'; script.async = true; script.defer = true;
    script.onload = () => { window.FB?.init({ appId: environment.metaAppId, cookie: true, xfbml: true, version: environment.metaApiVersion }); ready(); };
    script.onerror = () => this.failConnection('Meta Embedded Signup could not be loaded.');
    document.body.appendChild(script);
  }

  private failConnection(message: string): void { this.actionLoading = false; this.status = 'ERROR'; this.errorMessage = message; }
}
