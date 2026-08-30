import { PaginationMeta, PaginationQuery } from '../../core/models/pagination.model';

export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface Media {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  mediaType: MediaType;
  size: number;
  status: 'READY' | 'FAILED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface MediaListData {
  media: Media[];
  pagination: PaginationMeta;
}

export interface MediaListQuery extends PaginationQuery {}
