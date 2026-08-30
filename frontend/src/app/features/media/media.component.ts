import { DatePipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, inject, OnDestroy } from '@angular/core';
import { finalize } from 'rxjs';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { Media, MediaType } from './media.model';
import { MediaService } from './media.service';

@Component({
  selector: 'app-media', standalone: true,
  imports: [DatePipe, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent],
  templateUrl: './media.component.html', styleUrl: './media.component.scss',
})
export class MediaComponent implements OnDestroy {
  private readonly api = inject(MediaService);
  private readonly errors = inject(HttpErrorService);
  media: Media[] = [];
  loading = true;
  uploading = false;
  uploadProgress = 0;
  errorMessage = '';
  successMessage = '';
  previewUrls = new Map<string, string>();

  constructor() { this.load(); }
  ngOnDestroy(): void { this.previewUrls.forEach((url) => URL.revokeObjectURL(url)); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.api.getMedia({ page: 1, limit: 100 }).pipe(finalize(() => { this.loading = false; })).subscribe({
      next: (result) => { this.media = result.media; this.refreshPreviews(); },
      error: (error) => { this.errorMessage = this.errors.map(error).message; },
    });
  }
  choose(input: HTMLInputElement): void { input.click(); }
  onFileChange(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (file) this.upload(file); }
  onDragOver(event: DragEvent): void { event.preventDefault(); }
  onDrop(event: DragEvent): void { event.preventDefault(); const file = event.dataTransfer?.files[0]; if (file) this.upload(file); }
  upload(file: File): void {
    if (this.uploading) return;
    const error = this.clientValidation(file);
    if (error) { this.errorMessage = error; return; }
    this.uploading = true; this.uploadProgress = 0; this.errorMessage = ''; this.successMessage = '';
    this.api.uploadMedia(file).pipe(finalize(() => { this.uploading = false; })).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) this.uploadProgress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
        if (event.type === HttpEventType.Response) { this.successMessage = 'Media uploaded successfully.'; this.load(); }
      },
      error: (response) => { this.errorMessage = this.errors.map(response).message; },
    });
  }
  remove(item: Media): void {
    if (!confirm(`Delete ${item.originalName}?`) || this.uploading) return;
    this.api.deleteMedia(item.id).subscribe({ next: () => { this.releasePreview(item.id); this.media = this.media.filter((media) => media.id !== item.id); this.successMessage = 'Media deleted successfully.'; }, error: (error) => { this.errorMessage = this.errors.map(error).message; } });
  }
  download(item: Media): void {
    this.api.getMediaFile(item.id).subscribe({ next: (response) => { const url = URL.createObjectURL(response.body ?? new Blob()); const link = document.createElement('a'); link.href = url; link.download = item.originalName; link.click(); URL.revokeObjectURL(url); }, error: (error) => { this.errorMessage = this.errors.map(error).message; } });
  }
  previewUrl(item: Media): string | undefined { return this.previewUrls.get(item.id); }
  icon(type: MediaType): string { return type === 'IMAGE' ? 'bi-image' : type === 'VIDEO' ? 'bi-film' : 'bi-file-earmark-text'; }
  fileSize(size: number): string { return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; }
  private refreshPreviews(): void { this.media.filter((item) => item.mediaType === 'IMAGE' && !this.previewUrls.has(item.id)).forEach((item) => this.api.getMediaFile(item.id).subscribe({ next: (response) => this.previewUrls.set(item.id, URL.createObjectURL(response.body ?? new Blob())), error: () => undefined })); }
  private releasePreview(id: string): void { const url = this.previewUrls.get(id); if (url) URL.revokeObjectURL(url); this.previewUrls.delete(id); }
  private clientValidation(file: File): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
    if (!extension || !allowed.includes(extension)) return 'Choose a JPG, PNG, WEBP, MP4, PDF, DOC, DOCX, XLS, or XLSX file.';
    const max = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? 5 : extension === 'mp4' ? 16 : 100;
    return file.size > max * 1024 * 1024 ? `This file exceeds the ${max} MB limit.` : null;
  }
}
