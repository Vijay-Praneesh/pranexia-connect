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
