import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import type { Chart } from 'chart.js';

@Component({
  selector: 'app-distribution-chart',
  standalone: true,
  template: `<div class="chart-container"><canvas #canvas role="img" [attr.aria-label]="ariaLabel"></canvas></div>`,
  styles: [`.chart-container { position: relative; min-height: 16rem; height: 16rem; }`],
})
export class DistributionChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) labels: string[] = [];
  @Input({ required: true }) values: number[] = [];
  @Input() colors: string[] = [];
  @Input() ariaLabel = 'Distribution chart';
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
    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'doughnut',
      data: { labels: this.labels, datasets: [{ data: this.values, backgroundColor: this.colors, borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
      },
    });
  }
}
