import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages > 1) {
      <nav aria-label="Pagination">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" [class.disabled]="page <= 1">
            <button class="page-link" type="button" [disabled]="page <= 1" (click)="select(page - 1)">
              Previous
            </button>
          </li>
          <li class="page-item disabled">
            <span class="page-link">Page {{ page }} of {{ totalPages }}</span>
          </li>
          <li class="page-item" [class.disabled]="page >= totalPages">
            <button class="page-link" type="button" [disabled]="page >= totalPages" (click)="select(page + 1)">
              Next
            </button>
          </li>
        </ul>
      </nav>
    }
  `,
  styles: [`
    .pagination {
      gap: 0.35rem;
    }
    .page-link {
      color: #111111;
      border-radius: 6px;
      border: 1px solid #eaeaea;
      padding: 0.35rem 0.75rem;
      font-weight: 600;
      transition: all 0.15s ease;
      &:hover:not(:disabled) {
        background-color: #fff4ee;
        color: #f96614;
        border-color: rgba(249, 102, 20, 0.3);
      }
    }
    .page-item.disabled .page-link {
      color: #94a3b8;
      background-color: #f8fafc;
      border-color: #eaeaea;
    }
  `],
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Output() readonly pageChange = new EventEmitter<number>();

  select(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.page) {
      this.pageChange.emit(page);
    }
  }
}
