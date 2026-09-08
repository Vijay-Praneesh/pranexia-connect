import { DatePipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalService } from '../../core/services/confirmation-modal.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { ToastService } from '../../core/services/toast.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { Media, MediaType } from './media.model';
import { MediaService } from './media.service';

export type MediaSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'size_desc'
  | 'size_asc';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
})
export class MediaComponent implements OnDestroy {
  private readonly api = inject(MediaService);
  private readonly errors = inject(HttpErrorService);
  private readonly modalService = inject(ConfirmationModalService);
  private readonly toastService = inject(ToastService);
  private readonly auth = inject(AuthService, { optional: true });
  private readonly subscriptionApi = inject(SubscriptionService, { optional: true });

  media: Media[] = [];
  loading = true;
  uploading = false;
  uploadProgress = 0;
  uploadingFileName = '';
  errorMessage = '';
  successMessage = '';
  isDragging = false;
  viewMode: 'grid' | 'list' = 'grid';
  keyword = '';
  selectedType: 'ALL' | MediaType = 'ALL';
  sortBy: MediaSortOption = 'date_desc';
  previewItem: Media | null = null;
  previewUrls = new Map<string, string>();
  storageLimitBytes: number | null = 1073741824; // 1 GB default (Starter plan)

  readonly mediaTypes: Array<{ label: string; value: 'ALL' | MediaType }> = [
    { label: 'All Assets', value: 'ALL' },
    { label: 'Images', value: 'IMAGE' },
    { label: 'Videos', value: 'VIDEO' },
    { label: 'Documents', value: 'DOCUMENT' },
  ];

  constructor() {
    this.load();
    this.loadStorageLimit();
  }

  ngOnDestroy(): void {
    this.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    this.previewUrls.clear();
  }

  get userCompanyName(): string {
    return this.auth?.getCurrentUser()?.company?.companyName || 'Seyyon Connect';
  }

  get totalCount(): number {
    return this.media.length;
  }

  get imageCount(): number {
    return this.media.filter((m) => m.mediaType === 'IMAGE').length;
  }

  get videoCount(): number {
    return this.media.filter((m) => m.mediaType === 'VIDEO').length;
  }

  get documentCount(): number {
    return this.media.filter((m) => m.mediaType === 'DOCUMENT').length;
  }

  get totalStorageBytes(): number {
    return this.media.reduce((acc, item) => acc + (item.size || 0), 0);
  }

  get formattedTotalStorage(): string {
    return this.fileSize(this.totalStorageBytes);
  }

  get formattedStorageLimit(): string {
    if (this.storageLimitBytes === null || this.storageLimitBytes === undefined || this.storageLimitBytes <= 0) {
      return 'Unlimited';
    }
    return this.fileSize(this.storageLimitBytes);
  }

  get storageUsagePercent(): number {
    if (!this.storageLimitBytes || this.storageLimitBytes <= 0) return 0;
    const pct = (this.totalStorageBytes / this.storageLimitBytes) * 100;
    return Math.min(100, Math.round(pct * 10) / 10);
  }

  get formattedStorageRemaining(): string {
    if (!this.storageLimitBytes || this.storageLimitBytes <= 0) return 'Unlimited';
    const remaining = Math.max(0, this.storageLimitBytes - this.totalStorageBytes);
    return this.fileSize(remaining);
  }

  loadStorageLimit(): void {
    this.subscriptionApi?.getCurrentSubscription().subscribe({
      next: (res) => {
        const storageMetric = res?.planOverview?.metrics?.find(
          (m) => m.metric === 'MEDIA_STORAGE_BYTES',
        );
        if (storageMetric && storageMetric.limit !== undefined) {
          this.storageLimitBytes = storageMetric.limit;
        } else if (res?.planOverview?.plan?.name) {
          const plan = res.planOverview.plan.name;
          if (plan === 'STARTER') this.storageLimitBytes = 1 * 1024 * 1024 * 1024;
          else if (plan === 'BUSINESS') this.storageLimitBytes = 5 * 1024 * 1024 * 1024;
          else if (plan === 'PROFESSIONAL') this.storageLimitBytes = 20 * 1024 * 1024 * 1024;
          else if (plan === 'ENTERPRISE') this.storageLimitBytes = null;
        }
      },
      error: () => {
        this.storageLimitBytes = 1 * 1024 * 1024 * 1024;
      },
    });
  }

  get filteredMedia(): Media[] {
    let result = this.media;

    if (this.selectedType !== 'ALL') {
      result = result.filter((item) => item.mediaType === this.selectedType);
    }

    if (this.keyword.trim()) {
      const q = this.keyword.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.originalName.toLowerCase().includes(q) ||
          item.mediaType.toLowerCase().includes(q) ||
          item.mimeType.toLowerCase().includes(q),
      );
    }

    return [...result].sort((a, b) => {
      switch (this.sortBy) {
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name_asc':
          return a.originalName.localeCompare(b.originalName);
        case 'name_desc':
          return b.originalName.localeCompare(a.originalName);
        case 'size_desc':
          return (b.size || 0) - (a.size || 0);
        case 'size_asc':
          return (a.size || 0) - (b.size || 0);
        case 'date_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }

  get hasFilters(): boolean {
    return Boolean(
      this.keyword.trim() ||
        this.selectedType !== 'ALL' ||
        this.sortBy !== 'date_desc',
    );
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api
      .getMedia({ page: 1, limit: 100 })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (result) => {
          this.media = result.media;
          this.refreshPreviews();
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  choose(input: HTMLInputElement): void {
    input.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.upload(file);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.upload(file);
    }
  }

  upload(file: File): void {
    if (this.uploading) return;
    const error = this.clientValidation(file);
    if (error) {
      this.errorMessage = error;
      this.toastService.warning(error);
      return;
    }

    this.uploading = true;
    this.uploadingFileName = file.name;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.successMessage = '';

    this.api
      .uploadMedia(file)
      .pipe(
        finalize(() => {
          this.uploading = false;
          this.uploadingFileName = '';
        }),
      )
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress = event.total
              ? Math.round((event.loaded / event.total) * 100)
              : 0;
          }
          if (event.type === HttpEventType.Response) {
            this.notify('Media uploaded successfully.');
            this.load();
          }
        },
        error: (response) => {
          const msg = this.errors.map(response).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  remove(item: Media, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.uploading) return;

    this.modalService
      .confirm({
        title: 'Delete Media?',
        message: `Are you sure you want to delete "${item.originalName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'bi-trash3-fill',
        action: () => this.api.deleteMedia(item.id),
      })
      .then((confirmed) => {
        if (confirmed) {
          if (this.previewItem?.id === item.id) {
            this.previewItem = null;
          }
          this.releasePreview(item.id);
          this.media = this.media.filter((m) => m.id !== item.id);
          this.notify('Media deleted successfully.');
        }
      })
      .catch((error) => {
        const msg =
          this.errors.map(error).message || 'Failed to delete media.';
        this.errorMessage = msg;
        this.toastService.error(msg);
      });
  }

  download(item: Media, event?: Event): void {
    if (event) event.stopPropagation();
    this.api.getMediaFile(item.id).subscribe({
      next: (response) => {
        const url = URL.createObjectURL(response.body ?? new Blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = item.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.toastService.success(`Downloading ${item.originalName}…`);
      },
      error: (error) => {
        const msg = this.errors.map(error).message;
        this.errorMessage = msg;
        this.toastService.error(msg);
      },
    });
  }

  openPreview(item: Media): void {
    this.previewItem = item;
    if (item.mediaType === 'IMAGE' && !this.previewUrls.has(item.id)) {
      this.api.getMediaFile(item.id).subscribe({
        next: (response) => {
          this.previewUrls.set(
            item.id,
            URL.createObjectURL(response.body ?? new Blob()),
          );
        },
        error: () => undefined,
      });
    }
  }

  closePreview(): void {
    this.previewItem = null;
  }

  clearFilters(): void {
    this.keyword = '';
    this.selectedType = 'ALL';
    this.sortBy = 'date_desc';
  }

  previewUrl(item: Media): string | undefined {
    return this.previewUrls.get(item.id);
  }

  icon(type: MediaType): string {
    switch (type) {
      case 'IMAGE':
        return 'bi-image';
      case 'VIDEO':
        return 'bi-film';
      case 'DOCUMENT':
      default:
        return 'bi-file-earmark-text';
    }
  }

  fileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  }

  fileSize(size: number): string {
    if (!size || size <= 0) return '0 B';
    if (size >= 1024 * 1024 * 1024) {
      const gb = (size / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '');
      return `${gb} GB`;
    }
    if (size >= 1024 * 1024) {
      const mb = (size / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
      return `${mb} MB`;
    }
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  private refreshPreviews(): void {
    this.media
      .filter((item) => item.mediaType === 'IMAGE' && !this.previewUrls.has(item.id))
      .forEach((item) => {
        this.api.getMediaFile(item.id).subscribe({
          next: (response) => {
            this.previewUrls.set(
              item.id,
              URL.createObjectURL(response.body ?? new Blob()),
            );
          },
          error: () => undefined,
        });
      });
  }

  private releasePreview(id: string): void {
    const url = this.previewUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrls.delete(id);
  }

  private clientValidation(file: File): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'mp4',
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
    ];
    if (!extension || !allowed.includes(extension)) {
      return 'Choose a JPG, PNG, WEBP, MP4, PDF, DOC, DOCX, XLS, or XLSX file.';
    }
    const max = ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
      ? 5
      : extension === 'mp4'
        ? 16
        : 100;
    return file.size > max * 1024 * 1024
      ? `This file exceeds the ${max} MB limit.`
      : null;
  }

  private notify(message: string): void {
    this.successMessage = message;
    this.toastService.success(message);
    setTimeout(() => {
      this.successMessage = '';
    }, 4000);
  }
}

