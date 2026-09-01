import { inject, Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
            }
          ) => void;
          prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; isDismissedMoment: () => boolean; getDismissedReason: () => string }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly ngZone = inject(NgZone);
  private scriptLoaded = false;
  private scriptLoadingPromise: Promise<boolean> | null = null;
  private isInitialized = false;

  private readonly credentialSubject = new Subject<string>();
  readonly credential$ = this.credentialSubject.asObservable();

  private readonly errorSubject = new Subject<string>();
  readonly error$ = this.errorSubject.asObservable();

  getClientId(): string {
    return environment.googleClientId || '';
  }

  isConfigured(): boolean {
    return Boolean(this.getClientId().trim());
  }

  /**
   * Dynamically loads the official Google Identity Services script
   */
  loadGoogleScript(): Promise<boolean> {
    if (this.scriptLoaded && window.google?.accounts?.id) {
      return Promise.resolve(true);
    }

    if (this.scriptLoadingPromise) {
      return this.scriptLoadingPromise;
    }

    this.scriptLoadingPromise = new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        resolve(false);
        return;
      }

      // Check if already injected
      const existingScript = document.getElementById('google-jssdk');
      if (existingScript) {
        this.scriptLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        this.scriptLoaded = false;
        this.errorSubject.next('Failed to load Google Sign-In SDK.');
        resolve(false);
      };

      document.head.appendChild(script);
    });

    return this.scriptLoadingPromise;
  }

  /**
   * Initializes Google Identity Services client
   */
  async initializeGoogleId(callback?: (credential: string) => void): Promise<boolean> {
    const clientId = this.getClientId();
    if (!clientId) {
      return false;
    }

    const loaded = await this.loadGoogleScript();
    if (!loaded || !window.google?.accounts?.id) {
      return false;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          this.ngZone.run(() => {
            if (response.credential) {
              this.credentialSubject.next(response.credential);
              if (callback) {
                callback(response.credential);
              }
            } else {
              this.errorSubject.next('No Google credential returned.');
            }
          });
        },
        cancel_on_tap_outside: true,
      });

      this.isInitialized = true;
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize Google Sign-In';
      this.errorSubject.next(errorMsg);
      return false;
    }
  }

  /**
   * Renders the official Google button into the specified container element
   */
  async renderButton(
    container: HTMLElement,
    options?: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      width?: number;
    }
  ): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initializeGoogleId();
      if (!initialized) return false;
    }

    if (!window.google?.accounts?.id || !container) {
      return false;
    }

    try {
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: options?.theme || 'outline',
        size: options?.size || 'large',
        text: options?.text || 'continue_with',
        shape: options?.shape || 'rectangular',
        logo_alignment: 'left',
        width: options?.width || 320,
      });
      return true;
    } catch {
      return false;
    }
  }
}
