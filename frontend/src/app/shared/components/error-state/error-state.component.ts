import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <section class="state-container text-center" role="alert">
      <i class="bi bi-exclamation-circle state-icon text-danger" aria-hidden="true"></i>
      <div>
        <h2 class="h6 mb-1">{{ title }}</h2>
        <p class="text-body-secondary mb-0">{{ message }}</p>
      </div>
      @if (retryable) {
        <button class="btn btn-outline-primary btn-sm" type="button" (click)="retry.emit()">
          Try again
        </button>
      }
    </section>
  `,
})
export class ErrorStateComponent {
  @Input() title = 'Unable to load content';
  @Input() message = 'Please try again.';
  @Input() retryable = false;
  @Output() readonly retry = new EventEmitter<void>();
}
