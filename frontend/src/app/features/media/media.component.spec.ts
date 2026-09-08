import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalService } from '../../core/services/confirmation-modal.service';
import { ToastService } from '../../core/services/toast.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { Media, MediaListData } from './media.model';
import { MediaService } from './media.service';
import { MediaComponent } from './media.component';

describe('MediaComponent', () => {
  let fixture: ComponentFixture<MediaComponent>;
  let component: MediaComponent;
  let api: jasmine.SpyObj<MediaService>;
  let modalService: jasmine.SpyObj<ConfirmationModalService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let authService: jasmine.SpyObj<AuthService>;

  const imageMedia: Media = {
    id: 'm1',
    originalName: 'banner.png',
    storedName: 'banner_123.png',
    mimeType: 'image/png',
    mediaType: 'IMAGE',
    size: 1024 * 1024 * 2, // 2 MB
    status: 'READY',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  };

  const videoMedia: Media = {
    id: 'm2',
    originalName: 'promo.mp4',
    storedName: 'promo_456.mp4',
    mimeType: 'video/mp4',
    mediaType: 'VIDEO',
    size: 1024 * 1024 * 10, // 10 MB
    status: 'READY',
    createdAt: '2026-01-02T10:00:00Z',
    updatedAt: '2026-01-02T10:00:00Z',
  };

  const docMedia: Media = {
    id: 'm3',
    originalName: 'catalog.pdf',
    storedName: 'catalog_789.pdf',
    mimeType: 'application/pdf',
    mediaType: 'DOCUMENT',
    size: 1024 * 500, // 500 KB
    status: 'READY',
    createdAt: '2026-01-03T10:00:00Z',
    updatedAt: '2026-01-03T10:00:00Z',
  };

  const mediaList: MediaListData = {
    media: [imageMedia, videoMedia, docMedia],
    pagination: { page: 1, limit: 100, totalRecords: 3, totalPages: 1 },
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<MediaService>('MediaService', [
      'getMedia',
      'uploadMedia',
      'getMediaFile',
      'deleteMedia',
    ]);
    api.getMedia.and.returnValue(of(mediaList));
    api.getMediaFile.and.returnValue(
      of(new HttpResponse<Blob>({ body: new Blob(['fake content'], { type: 'image/png' }) })),
    );

    modalService = jasmine.createSpyObj<ConfirmationModalService>(
      'ConfirmationModalService',
      ['confirm'],
    );
    toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'success',
      'error',
      'warning',
    ]);

    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getCurrentUser',
    ]);
    authService.getCurrentUser.and.returnValue({
      id: 'u1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      mobile: '1234567890',
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      companyId: 'c1',
      createdAt: '',
      updatedAt: '',
      company: {
        id: 'c1',
        companyName: 'Seyyon Connect',
        email: 'info@seyyon.com',
        mobile: '1234567890',
        plan: 'BUSINESS',
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      },
    });

    const subscriptionService = jasmine.createSpyObj('SubscriptionService', ['getCurrentSubscription']);
    subscriptionService.getCurrentSubscription.and.returnValue(
      of({
        subscription: {
          id: 'sub1',
          companyId: 'c1',
          plan: 'STARTER',
          status: 'ACTIVE',
          startDate: '',
          currentPeriodStart: '',
          currentPeriodEnd: '',
          cancelAtPeriodEnd: false,
        },
        planOverview: {
          plan: {
            name: 'STARTER',
            displayName: 'Starter',
            tagline: '',
            customLimits: null,
          },
          metrics: [
            {
              metric: 'MEDIA_STORAGE_BYTES',
              label: 'Storage',
              description: '',
              unit: 'bytes',
              isMonthly: false,
              currentUsage: 1300000,
              limit: 1073741824,
              remaining: 1072441824,
              percentage: 0.1,
              status: 'NORMAL',
            },
          ],
          availablePlans: [],
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [MediaComponent],
      providers: [
        { provide: MediaService, useValue: api },
        { provide: ConfirmationModalService, useValue: modalService },
        { provide: ToastService, useValue: toastService },
        { provide: AuthService, useValue: authService },
        { provide: SubscriptionService, useValue: subscriptionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the media list and calculates summary KPI metrics', () => {
    expect(component.media.length).toBe(3);
    expect(component.totalCount).toBe(3);
    expect(component.imageCount).toBe(1);
    expect(component.videoCount).toBe(1);
    expect(component.documentCount).toBe(1);
    expect(component.formattedTotalStorage).toContain('MB');
    expect(component.formattedStorageLimit).toBe('1 GB');
    expect(component.storageUsagePercent).toBeGreaterThanOrEqual(0);
    expect(component.formattedStorageRemaining).toContain('MB');
    expect(fixture.nativeElement.textContent).toContain('banner.png');
    expect(fixture.nativeElement.textContent).toContain('promo.mp4');
    expect(fixture.nativeElement.textContent).toContain('/ 1 GB');
  });

  it('switches between grid and list views', () => {
    expect(component.viewMode).toBe('grid');
    component.viewMode = 'list';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });

  it('filters media by search keyword and type filter', () => {
    component.keyword = 'banner';
    expect(component.filteredMedia.length).toBe(1);
    expect(component.filteredMedia[0].originalName).toBe('banner.png');

    component.keyword = '';
    component.selectedType = 'VIDEO';
    expect(component.filteredMedia.length).toBe(1);
    expect(component.filteredMedia[0].mediaType).toBe('VIDEO');

    component.clearFilters();
    expect(component.selectedType).toBe('ALL');
    expect(component.filteredMedia.length).toBe(3);
  });

  it('sorts media by name and size', () => {
    component.sortBy = 'name_asc';
    expect(component.filteredMedia[0].originalName).toBe('banner.png');
    expect(component.filteredMedia[2].originalName).toBe('promo.mp4');

    component.sortBy = 'size_desc';
    expect(component.filteredMedia[0].originalName).toBe('promo.mp4'); // 10MB is largest
  });

  it('handles dragover, dragleave, and drop events', () => {
    const dragEvent = new DragEvent('dragover');
    spyOn(dragEvent, 'preventDefault');
    component.onDragOver(dragEvent);
    expect(component.isDragging).toBeTrue();
    expect(dragEvent.preventDefault).toHaveBeenCalled();

    const leaveEvent = new DragEvent('dragleave');
    component.onDragLeave(leaveEvent);
    expect(component.isDragging).toBeFalse();
  });

  it('rejects unsupported file formats during upload', () => {
    const invalidFile = new File(['binary'], 'script.exe', { type: 'application/x-msdownload' });
    component.upload(invalidFile);
    expect(toastService.warning).toHaveBeenCalled();
    expect(api.uploadMedia).not.toHaveBeenCalled();
    expect(component.uploading).toBeFalse();
  });

  it('rejects oversized images exceeding the 5 MB limit', () => {
    const bigBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' });
    const bigFile = new File([bigBlob], 'huge.png', { type: 'image/png' });
    component.upload(bigFile);
    expect(toastService.warning).toHaveBeenCalledWith('This file exceeds the 5 MB limit.');
    expect(api.uploadMedia).not.toHaveBeenCalled();
  });

  it('uploads valid files and tracks progress events', fakeAsync(() => {
    const validFile = new File(['imagecontent'], 'avatar.png', { type: 'image/png' });
    api.uploadMedia.and.returnValue(
      of(
        { type: HttpEventType.UploadProgress, loaded: 50, total: 100 } as any,
        { type: HttpEventType.Response, body: { success: true, message: 'ok', data: imageMedia } } as any,
      ),
    );

    component.upload(validFile);
    tick(4000);
    expect(api.uploadMedia).toHaveBeenCalledWith(validFile);
    expect(toastService.success).toHaveBeenCalledWith('Media uploaded successfully.');
  }));

  it('opens and closes the preview lightbox modal', () => {
    component.openPreview(imageMedia);
    expect(component.previewItem).toEqual(imageMedia);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.lightbox-dialog')).toBeTruthy();

    component.closePreview();
    expect(component.previewItem).toBeNull();
  });

  it('triggers download for a media file', () => {
    component.download(imageMedia);
    expect(api.getMediaFile).toHaveBeenCalledWith('m1');
    expect(toastService.success).toHaveBeenCalledWith('Downloading banner.png…');
  });

  it('deletes media using custom confirmation modal', fakeAsync(() => {
    modalService.confirm.and.returnValue(Promise.resolve(true));
    api.deleteMedia.and.returnValue(of(undefined));

    component.remove(imageMedia);
    tick(4000);

    expect(modalService.confirm).toHaveBeenCalled();
    expect(component.media.find((m) => m.id === 'm1')).toBeUndefined();
    expect(toastService.success).toHaveBeenCalledWith('Media deleted successfully.');
  }));
});
