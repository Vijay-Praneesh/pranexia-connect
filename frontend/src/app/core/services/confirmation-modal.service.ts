import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, isObservable, Observable } from 'rxjs';

export type ConfirmationModalVariant = 'danger' | 'warning' | 'primary' | 'info';

export interface ConfirmationModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationModalVariant;
  icon?: string;
  action?: () => Observable<unknown> | Promise<unknown>;
}

export interface ConfirmationModalState {
  isOpen: boolean;
  config: ConfirmationModalConfig | null;
  loading: boolean;
  errorMessage?: string | null;
}

const INITIAL_STATE: ConfirmationModalState = {
  isOpen: false,
  config: null,
  loading: false,
  errorMessage: null,
};

@Injectable({
  providedIn: 'root',
})
export class ConfirmationModalService {
  private readonly stateSubject = new BehaviorSubject<ConfirmationModalState>(INITIAL_STATE);
  readonly state$ = this.stateSubject.asObservable();

  private resolveFn: ((confirmed: boolean) => void) | null = null;
  private rejectFn: ((reason?: unknown) => void) | null = null;

  /**
   * Open the confirmation modal with the provided configuration.
   * Returns a promise resolving to true if confirmed and false if cancelled.
   */
  confirm(config: ConfirmationModalConfig): Promise<boolean> {
    // If another modal was open, dismiss it first
    if (this.resolveFn) {
      this.resolveFn(false);
      this.resolveFn = null;
      this.rejectFn = null;
    }

    this.stateSubject.next({
      isOpen: true,
      config: {
        confirmText: config.variant === 'danger' ? 'Delete' : 'Confirm',
        cancelText: 'Cancel',
        variant: 'primary',
        ...config,
      },
      loading: false,
      errorMessage: null,
    });

    return new Promise<boolean>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
  }

  /**
   * Called when the user clicks the confirm button.
   */
  async onConfirm(): Promise<void> {
    const state = this.stateSubject.getValue();
    if (!state.isOpen || state.loading || !state.config) return;

    if (state.config.action) {
      this.stateSubject.next({ ...state, loading: true, errorMessage: null });
      try {
        const result = state.config.action();
        if (isObservable(result)) {
          await firstValueFrom(result);
        } else if (result instanceof Promise) {
          await result;
        }
        
        const resolve = this.resolveFn;
        this.close();
        if (resolve) resolve(true);
      } catch (error) {
        this.stateSubject.next({
          ...state,
          loading: false,
        });
        const reject = this.rejectFn;
        this.close();
        if (reject) {
          reject(error);
        }
      }
    } else {
      const resolve = this.resolveFn;
      this.close();
      if (resolve) resolve(true);
    }
  }

  /**
   * Called when the user clicks the cancel button or backdrop / presses Escape.
   */
  onCancel(): void {
    const state = this.stateSubject.getValue();
    if (state.loading) return; // Prevent cancelling while action is executing

    const resolve = this.resolveFn;
    this.close();
    if (resolve) resolve(false);
  }

  /**
   * Close the modal and reset state.
   */
  close(): void {
    this.resolveFn = null;
    this.rejectFn = null;
    this.stateSubject.next(INITIAL_STATE);
  }
}
