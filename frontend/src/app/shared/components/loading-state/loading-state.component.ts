import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  template: `
    <div class="state-container" role="status" aria-live="polite">
      <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
      <span>{{ message }}</span>
    </div>
  `,
})
export class LoadingStateComponent {
  @Input() message = 'Loading…';
}
