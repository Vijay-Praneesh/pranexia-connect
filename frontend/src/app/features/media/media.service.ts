import { HttpClient, HttpEvent, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { Media, MediaListData, MediaListQuery } from './media.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/media`;

  getMedia(query: MediaListQuery = {}): Observable<MediaListData> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    return this.http.get<ApiResponse<MediaListData>>(this.endpoint, { params }).pipe(map((response) => response.data));
  }

  uploadMedia(file: File): Observable<HttpEvent<ApiResponse<Media>>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<Media>>(`${this.endpoint}/upload`, formData, { observe: 'events', reportProgress: true });
  }

  getMediaFile(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.endpoint}/${id}`, { observe: 'response', responseType: 'blob' });
  }

  deleteMedia(id: string): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.endpoint}/${id}`).pipe(map(() => undefined));
  }
}
