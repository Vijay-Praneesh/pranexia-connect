import { AsyncPipe } from '@angular/common';
import { Component, ElementRef, HostListener, inject, ViewChild } from '@angular/core';
import { ConfirmationModalService, ConfirmationModalVariant } from '../../../core/services/confirmation-modal.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss',
})
export class ConfirmationModalComponent {
  readonly modalService = inject(ConfirmationModalService);
  @ViewChild('confirmBtn') confirmBtnRef?: ElementRef<HTMLButtonElement>;

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    event.preventDefault();
    this.modalService.onCancel();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop-layer')) {
      this.modalService.onCancel();
    }
  }

  getIcon(variant: ConfirmationModalVariant | undefined, customIcon?: string): string {
    if (customIcon) return customIcon;
    switch (variant) {
      case 'danger':
        return 'bi-trash3-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
        return 'bi-info-circle-fill';
      case 'primary':
      default:
        return 'bi-check-circle-fill';
    }
  }
}
