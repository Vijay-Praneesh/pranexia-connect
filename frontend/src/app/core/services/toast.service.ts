import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  private counter = 0;
  private readonly timerMap = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Display a success toast notification
   */
  success(message: string, optionsOrTitle?: ToastOptions | string, duration?: number): string {
    return this.show(this.createToast('success', message, optionsOrTitle, duration));
  }

  /**
   * Display an error toast notification
   */
  error(message: string, optionsOrTitle?: ToastOptions | string, duration?: number): string {
    return this.show(this.createToast('error', message, optionsOrTitle, duration ?? 5000));
  }

  /**
   * Display a warning toast notification
   */
  warning(message: string, optionsOrTitle?: ToastOptions | string, duration?: number): string {
    return this.show(this.createToast('warning', message, optionsOrTitle, duration));
  }

  /**
   * Display an informational toast notification
   */
  info(message: string, optionsOrTitle?: ToastOptions | string, duration?: number): string {
    return this.show(this.createToast('info', message, optionsOrTitle, duration));
  }

  /**
   * Display a custom toast
   */
  show(toast: Omit<ToastMessage, 'id'> & { id?: string }): string {
    const id = toast.id || `toast-${Date.now()}-${++this.counter}`;
    const fullToast: ToastMessage = {
      id,
      type: toast.type,
      title: toast.title,
      message: toast.message,
      duration: toast.duration ?? 4000,
      dismissible: toast.dismissible ?? true,
    };

    const current = this.toastsSubject.getValue();
    this.toastsSubject.next([...current, fullToast]);

    if (fullToast.duration && fullToast.duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, fullToast.duration);
      this.timerMap.set(id, timer);
    }

    return id;
  }

  /**
   * Dismiss a specific toast notification by ID
   */
  dismiss(id: string): void {
    const timer = this.timerMap.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timerMap.delete(id);
    }

    const current = this.toastsSubject.getValue();
    this.toastsSubject.next(current.filter((t) => t.id !== id));
  }

  /**
   * Clear all active toasts
   */
  clear(): void {
    this.timerMap.forEach((timer) => clearTimeout(timer));
    this.timerMap.clear();
    this.toastsSubject.next([]);
  }

  private createToast(
    type: ToastType,
    message: string,
    optionsOrTitle?: ToastOptions | string,
    duration?: number
  ): Omit<ToastMessage, 'id'> {
    let options: ToastOptions = {};
    if (typeof optionsOrTitle === 'string') {
      options = { title: optionsOrTitle, duration };
    } else if (optionsOrTitle) {
      options = optionsOrTitle;
    }

    return {
      type,
      message,
      title: options.title,
      duration: options.duration ?? duration ?? 4000,
      dismissible: options.dismissible ?? true,
    };
  }
}
