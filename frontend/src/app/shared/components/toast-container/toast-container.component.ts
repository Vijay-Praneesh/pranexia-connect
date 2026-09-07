import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastMessage, ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  getIconClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
      default:
        return 'bi-info-circle-fill';
    }
  }

  getTypeLabel(toast: ToastMessage): string {
    if (toast.title) return toast.title;
    switch (toast.type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
      default:
        return 'Notice';
    }
  }
}
