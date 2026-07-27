import { UserBasic, ProjectBasic } from './common.types';

export type SiteStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISABLED';

export interface Site {
  id: string;
  tenantId: string;
  projectId: string;
  code: string;
  name: string;
  locationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationRadius: number;
  creationDate: string;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  siteManagerId: string;
  status: SiteStatus;
  notes?: string | null;
  currencyCode: string;
  retentionPercentage: number;
  advanceRecoveryAmount: number;
  qrCodeToken: string;
  qrCodeGeneratedAt: string;
  isDeleted: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  project?: ProjectBasic;
  siteManager: UserBasic;
  createdBy?: UserBasic;
  locations?: SiteLocation[];
}

export interface SiteLocation {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  levelType: string;
  parentId?: string | null;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: string;
  children?: SiteLocation[];
}

export interface SiteDashboard {
  siteId: string;
  siteName: string;
  siteCode: string;
  workersCount: number;
  boqCount: number;
  ipcCount: number;
  completionProgress: number | null;
  expensesTotal: number;
  inventoryItemsCount: number;
}

export interface CreateSitePayload {
  projectId: string;
  name: string;
  siteManagerId: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  locationRadius?: number;
  plannedEndDate?: string;
  notes?: string;
}

export interface UpdateSitePayload extends Partial<CreateSitePayload> {
  status?: SiteStatus;
  actualEndDate?: string;
  projectId?: string;
  confirmProjectReassignment?: boolean;
}

export interface SiteQueryParams {
  projectId?: string;
  status?: SiteStatus;
  siteManagerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface CreateSiteLocationPayload {
  name: string;
  levelType: string;
  parentId?: string | null;
  sortOrder?: number;
}

export interface UpdateSiteLocationPayload extends Partial<CreateSiteLocationPayload> {}
