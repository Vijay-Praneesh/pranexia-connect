import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="state-container text-center" aria-live="polite">
      <i class="bi bi-inbox state-icon" aria-hidden="true"></i>
      <div>
        <h2 class="h6 mb-1">{{ title }}</h2>
        @if (message) {
          <p class="text-body-secondary mb-0">{{ message }}</p>
        }
      </div>
      <ng-content />
    </section>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}
