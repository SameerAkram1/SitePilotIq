import { UserBasic, ProjectBasic, CategoryBasic, PartnerBasic } from './common.types';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  startDate: string;
  deadline?: string | null;
  categoryId?: string | null;
  clientId?: string | null;
  summary?: string | null;
  projectManagerId: string;
  status: ProjectStatus;
  createdById: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  category?: CategoryBasic | null;
  client?: PartnerBasic | null;
  projectManager: UserBasic;
  createdBy?: UserBasic;
  sites?: SiteBasic[];
  attachments?: ProjectAttachment[];
  _count?: { sites: number };
}

export interface SiteBasic {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface ProjectAttachment {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  createdAt: string;
}

export interface ProjectCategory {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count?: { projects: number };
}

export interface CreateProjectPayload {
  name: string;
  startDate: string;
  deadline?: string | null;
  categoryId?: string | null;
  clientId?: string | null;
  summary?: string | null;
  projectManagerId: string;
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  status?: ProjectStatus;
}

export interface ProjectQueryParams {
  status?: ProjectStatus;
  categoryId?: string;
  projectManagerId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
