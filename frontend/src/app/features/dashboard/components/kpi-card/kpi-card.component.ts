import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <article class="card h-100 border-0 shadow-sm">
      <div class="card-body d-flex align-items-start justify-content-between gap-3">
        <div>
          <p class="small text-body-secondary mb-2">{{ label }}</p>
          <p class="h3 mb-0">{{ value }}</p>
        </div>
        <span class="kpi-icon text-{{ tone }} bg-{{ tone }}-subtle" aria-hidden="true">
          <i class="bi {{ icon }}"></i>
        </span>
      </div>
    </article>
  `,
  styles: [`
    .kpi-icon { display: inline-grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border-radius: .75rem; font-size: 1.15rem; }
  `],
})
export class KpiCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = 0;
  @Input({ required: true }) icon = 'bi-bar-chart';
  @Input() tone = 'primary';
}
