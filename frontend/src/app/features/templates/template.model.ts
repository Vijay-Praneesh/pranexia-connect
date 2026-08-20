import { PaginationMeta, PaginationQuery } from '../../core/models/pagination.model';
import { ApiErrorResponse } from '../../core/models/api-response.model';

export type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateHeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type TemplateLanguage = string;
export type TemplateSortField = 'createdAt' | 'updatedAt' | 'name' | 'category' | 'language' | 'status';
export type TemplateApiError = ApiErrorResponse;

export type TemplateJson = string | number | boolean | null | TemplateJson[] | { [key: string]: TemplateJson };

export interface TemplateButton {
  type?: string;
  text?: string;
  url?: string;
  phoneNumber?: string;
  [key: string]: TemplateJson | undefined;
}

export interface Template {
  id: string;
  name: string;
  metaTemplateName: string | null;
  metaTemplateId: string | null;
  category: TemplateCategory;
  language: TemplateLanguage;
  headerType: TemplateHeaderType;
  headerText: string | null;
  body: string;
  footer: string | null;
  buttons: TemplateButton[] | null;
  status: TemplateStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListData {
  templates: Template[];
  pagination: PaginationMeta;
}

export interface TemplateListQuery extends PaginationQuery {
  category?: TemplateCategory;
  status?: TemplateStatus;
  language?: TemplateLanguage;
  sortBy?: TemplateSortField;
}

export interface TemplateWriteRequest {
  name: string;
  metaTemplateName: string | null;
  metaTemplateId: string | null;
  category: TemplateCategory;
  language: TemplateLanguage;
  headerType: TemplateHeaderType;
  headerText: string | null;
  body: string;
  footer: string | null;
  buttons: TemplateButton[] | null;
}

export type CreateTemplateRequest = TemplateWriteRequest;
export type UpdateTemplateRequest = TemplateWriteRequest;
