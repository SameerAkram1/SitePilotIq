import { UserBasic } from './common.types';

export type BoqUnit = 'NOS' | 'M' | 'M2' | 'M3' | 'KG' | 'TON' | 'LT' | 'HR' | 'DAY' | 'MONTH' | 'LS';

export interface BoQItem {
  id: string;
  tenantId: string;
  siteId: string;
  sectionId?: string | null;
  itemCode: string;
  description: string;
  unit: BoqUnit;
  estimatedQty: number;
  unitRate: number;
  totalAmount: number;
  isBaseline: boolean;
  variationOrderId?: string | null;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  section?: BoqSection | null;
  createdBy?: UserBasic;
}

export interface BoqSection {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: string;
  items?: BoQItem[];
  _count?: { items: number };
}

export interface BoqStats {
  totalItems: number;
  totalAmount: number;
  baselineItems: number;
  baselineAmount: number;
  sectionsCount: number;
}

export interface CreateBoqItemPayload {
  sectionId?: string | null;
  itemCode: string;
  description: string;
  unit: BoqUnit;
  estimatedQty: number;
  unitRate: number;
}

export interface UpdateBoqItemPayload extends Partial<CreateBoqItemPayload> {}

export interface CreateBoqSectionPayload {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateBoqSectionPayload extends Partial<CreateBoqSectionPayload> {}

export interface BoqQueryParams {
  search?: string;
  sectionId?: string;
  page?: number;
  limit?: number;
}
