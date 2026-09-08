import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { Media, MediaListData } from './media.model';
import { MediaService } from './media.service';

describe('MediaService', () => {
  let service: MediaService;
  let http: HttpTestingController;

  const sampleMedia: Media = {
    id: 'm1',
    originalName: 'banner.png',
    storedName: 'banner_123.png',
    mimeType: 'image/png',
    mediaType: 'IMAGE',
    size: 2048,
    status: 'READY',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const envelope = <T>(data: T): ApiResponse<T> => ({
    success: true,
    message: 'ok',
    data,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });
    service = TestBed.inject(MediaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets media list with pagination query', () => {
    const listData: MediaListData = {
      media: [sampleMedia],
      pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 },
    };

    service.getMedia({ page: 1, limit: 10 }).subscribe((res) => {
      expect(res).toEqual(listData);
    });

    const req = http.expectOne((r) => r.url === '/api/v1/media');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(envelope(listData));
  });

  it('uploads a media file with FormData', () => {
    const file = new File(['fake data'], 'test.png', { type: 'image/png' });
    service.uploadMedia(file).subscribe();

    const req = http.expectOne('/api/v1/media/upload');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush(envelope(sampleMedia));
  });

  it('retrieves raw media blob stream', () => {
    const blob = new Blob(['sample blob'], { type: 'image/png' });
    service.getMediaFile('m1').subscribe((res) => {
      expect(res.body).toEqual(blob);
    });

    const req = http.expectOne('/api/v1/media/m1');
    expect(req.request.method).toBe('GET');
    req.flush(blob);
  });

  it('deletes media by id', () => {
    service.deleteMedia('m1').subscribe((res) => {
      expect(res).toBeUndefined();
    });

    const req = http.expectOne('/api/v1/media/m1');
    expect(req.request.method).toBe('DELETE');
    req.flush(envelope(null));
  });
});
