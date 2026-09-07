import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <article class="kpi-card tone-{{ tone }}" [attr.aria-label]="label + ': ' + value">
      <div class="kpi-glow-accent" aria-hidden="true"></div>
      <div class="kpi-card-inner">
        <div class="kpi-header">
          <span class="kpi-label">{{ label }}</span>
          <div class="kpi-icon-badge" aria-hidden="true">
            <i class="bi {{ icon }}"></i>
          </div>
        </div>

        <div class="kpi-body">
          <div class="kpi-value-row">
            <span class="kpi-value">{{ value }}</span>
            @if (badgeText) {
              <span class="kpi-badge badge-{{ badgeTone || tone }}">{{ badgeText }}</span>
            }
          </div>

          @if (subtext) {
            <p class="kpi-subtext mb-0">{{ subtext }}</p>
          }
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .kpi-card {
        position: relative;
        border-radius: 1rem;
        padding: 1.35rem 1.35rem 1.25rem;
        box-shadow: 0 2px 8px rgba(15, 27, 61, 0.04), 0 1px 3px rgba(15, 27, 61, 0.02);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 138px;
        box-sizing: border-box;

        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px -4px rgba(15, 27, 61, 0.1), 0 4px 12px -2px rgba(15, 27, 61, 0.05);

          .kpi-icon-badge {
            transform: scale(1.1) rotate(-3deg);
          }
        }

        .kpi-card-inner {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          height: 100%;
          z-index: 1;
        }

        .kpi-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;

          .kpi-label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1.3;
            flex: 1;
            word-break: break-word;
          }

          .kpi-icon-badge {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.75rem;
            display: grid;
            place-items: center;
            font-size: 1.15rem;
            flex-shrink: 0;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }

        .kpi-body {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-top: auto;

          .kpi-value-row {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 0.5rem;
            flex-wrap: wrap;

            .kpi-value {
              font-size: 2rem;
              font-weight: 800;
              line-height: 1.1;
              letter-spacing: -0.03em;
              font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
            }

            .kpi-badge {
              font-size: 0.6875rem;
              font-weight: 700;
              padding: 0.25rem 0.6rem;
              border-radius: 999px;
              white-space: nowrap;
            }
          }

          .kpi-subtext {
            font-size: 0.8125rem;
            line-height: 1.35;
            font-weight: 500;
            word-break: break-word;
          }
        }

        .kpi-glow-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }

        // =====================================================================
        // TONE 1: INDIGO (e.g. Total Campaigns)
        // =====================================================================
        &.tone-indigo {
          background: linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%);
          border: 1px solid #c7d2fe;

          .kpi-glow-accent {
            background: linear-gradient(90deg, #4338ca 0%, #6366f1 100%);
          }

          .kpi-label {
            color: #4338ca;
          }

          .kpi-icon-badge {
            background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(67, 56, 202, 0.25);
          }

          .kpi-value {
            color: #1e1b4b;
          }

          .kpi-subtext {
            color: #475569;
          }

          .badge-indigo {
            background-color: #e0e7ff;
            color: #3730a3;
            border: 1px solid #c7d2fe;
          }

          &:hover {
            background: linear-gradient(145deg, #ede9fe 0%, #ddd6fe 100%);
            border-color: #a5b4fc;
            box-shadow: 0 12px 28px -4px rgba(67, 56, 202, 0.18);
          }
        }

        // =====================================================================
        // TONE 2: INFO / CYAN / SKY (e.g. Total Recipients)
        // =====================================================================
        &.tone-info {
          background: linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;

          .kpi-glow-accent {
            background: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%);
          }

          .kpi-label {
            color: #0369a1;
          }

          .kpi-icon-badge {
            background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);
          }

          .kpi-value {
            color: #082f49;
          }

          .kpi-subtext {
            color: #475569;
          }

          .badge-info {
            background-color: #e0f2fe;
            color: #0369a1;
            border: 1px solid #bae6fd;
          }

          &:hover {
            background: linear-gradient(145deg, #e0f2fe 0%, #bae6fd 100%);
            border-color: #7dd3fc;
            box-shadow: 0 12px 28px -4px rgba(2, 132, 199, 0.18);
          }
        }

        // =====================================================================
        // TONE 3: PRIMARY / ROYAL BLUE (e.g. Messages Sent / Messages Read)
        // =====================================================================
        &.tone-primary {
          background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;

          .kpi-glow-accent {
            background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
          }

          .kpi-label {
            color: #1d4ed8;
          }

          .kpi-icon-badge {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
          }

          .kpi-value {
            color: #0f172a;
          }

          .kpi-subtext {
            color: #475569;
          }

          .badge-primary {
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #bfdbfe;
          }

          &:hover {
            background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
            border-color: #93c5fd;
            box-shadow: 0 12px 28px -4px rgba(37, 99, 235, 0.18);
          }
        }

        // =====================================================================
        // TONE 4: SUCCESS / EMERALD (e.g. Messages Delivered)
        // =====================================================================
        &.tone-success {
          background: linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1px solid #a7f3d0;

          .kpi-glow-accent {
            background: linear-gradient(90deg, #059669 0%, #34d399 100%);
          }

          .kpi-label {
            color: #047857;
          }

          .kpi-icon-badge {
            background: linear-gradient(135deg, #059669 0%, #34d399 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);
          }

          .kpi-value {
            color: #064e3b;
          }

          .kpi-subtext {
            color: #475569;
          }

          .badge-success {
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }

          &:hover {
            background: linear-gradient(145deg, #d1fae5 0%, #a7f3d0 100%);
            border-color: #6ee7b7;
            box-shadow: 0 12px 28px -4px rgba(5, 150, 105, 0.18);
          }
        }

        // =====================================================================
        // TONE 5: DANGER / ROSE / RED (e.g. Messages Failed)
        // =====================================================================
        &.tone-danger {
          background: linear-gradient(145deg, #fff1f2 0%, #ffe4e6 100%);
          border: 1px solid #fecdd3;

          .kpi-glow-accent {
            background: linear-gradient(90deg, #e11d48 0%, #f43f5e 100%);
          }

          .kpi-label {
            color: #be123c;
          }

          .kpi-icon-badge {
            background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(225, 29, 72, 0.25);
          }

          .kpi-value {
            color: #4c0519;
          }

          .kpi-subtext {
            color: #475569;
          }

          .badge-danger {
            background-color: #ffe4e6;
            color: #9f1239;
            border: 1px solid #fecdd3;
          }

          &:hover {
            background: linear-gradient(145deg, #ffe4e6 0%, #fecdd3 100%);
            border-color: #fda4af;
            box-shadow: 0 12px 28px -4px rgba(225, 29, 72, 0.18);
          }
        }

        // =====================================================================
        // TONE 6: WARNING / AMBER / GOLD
        // =====================================================================
        &.tone-warning {
          background: linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);
          border: 1px solid #fde68a;

          .kpi-glow-accent {
            background: linear-gradient(90deg, #d97706 0%, #fbbf24 100%);
          }

          .kpi-label {
            color: #b45309;
          }

          .kpi-icon-badge {
            background: linear-gradient(135deg, #d97706 0%, #fbbf24 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(217, 119, 6, 0.25);
          }

          .kpi-value {
            color: #451a03;
          }

          .kpi-subtext {
            color: #475569;
          }

          .badge-warning {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }

          &:hover {
            background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%);
            border-color: #fcd34d;
            box-shadow: 0 12px 28px -4px rgba(217, 119, 6, 0.18);
          }
        }
      }
    `,
  ],
})
export class KpiCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = 0;
  @Input({ required: true }) icon = 'bi-bar-chart';
  @Input() tone = 'primary';
  @Input() subtext?: string;
  @Input() badgeText?: string;
  @Input() badgeTone?: string;
}
