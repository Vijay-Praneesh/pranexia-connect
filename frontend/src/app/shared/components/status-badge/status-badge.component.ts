import { Component, Input } from '@angular/core';

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge rounded-pill text-bg-{{ tone }}">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status = '';

  get label(): string {
    return this.status.replaceAll('_', ' ');
  }

  get tone(): BadgeTone {
    const tones: Record<string, BadgeTone> = {
      ACTIVE: 'success',
      APPROVED: 'success',
      COMPLETED: 'success',
      DELIVERED: 'success',
      READ: 'info',
      RUNNING: 'primary',
      SENT: 'primary',
      SCHEDULED: 'info',
      PENDING: 'warning',
      QUEUED: 'warning',
      BLOCKED: 'danger',
      FAILED: 'danger',
      REJECTED: 'danger',
      NORMAL: 'success',
      SYNCED: 'success',
      WARNING: 'warning',
      CRITICAL: 'warning',
      EXHAUSTED: 'danger',
      OVER_LIMIT: 'danger',
      NOT_CONFIGURED: 'secondary',
      CANCELLED: 'secondary',
      DRAFT: 'secondary',
    };

    return tones[this.status] ?? 'secondary';
  }
}
