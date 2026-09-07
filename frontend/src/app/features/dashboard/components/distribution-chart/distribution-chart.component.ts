import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import type { Chart } from 'chart.js';

@Component({
  selector: 'app-distribution-chart',
  standalone: true,
  template: `
    <div class="chart-container">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel"></canvas>
    </div>
  `,
  styles: [
    `
      .chart-container {
        position: relative;
        min-height: 15rem;
        height: 15rem;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class DistributionChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input({ required: true }) labels: string[] = [];
  @Input({ required: true }) values: number[] = [];
  @Input() colors: string[] = [];
  @Input() ariaLabel = 'Campaign status distribution chart';
  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'doughnut'>;
  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    void this.render();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.ready) void this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private async render(): Promise<void> {
    if (!this.canvas) return;
    const { default: Chart } = await import('chart.js/auto');
    this.chart?.destroy();

    const total = this.values.reduce((sum, val) => sum + (val || 0), 0);
    const hasData = total > 0;

    const chartLabels = hasData ? this.labels : ['No Campaigns'];
    const chartValues = hasData ? this.values : [1];
    const chartColors = hasData
      ? this.colors.length > 0
        ? this.colors
        : ['#94a3b8', '#0284c7', '#4338ca', '#10b981', '#dc2626', '#64748b']
      : ['#e2e8f0'];

    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartValues,
            backgroundColor: chartColors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: hasData ? 6 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: {
          duration: 600,
        },
        plugins: {
          legend: {
            display: hasData,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 6,
              boxHeight: 6,
              padding: 14,
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 11,
                weight: 'bold',
              },
              color: '#64748b',
            },
          },
          tooltip: {
            enabled: hasData,
            backgroundColor: '#0f1b3d',
            titleFont: { family: 'Inter, sans-serif', size: 12, weight: 'bold' },
            bodyFont: { family: 'Inter, sans-serif', size: 11 },
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const val = context.parsed || 0;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${context.label}: ${val} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
}
