import { UserBasic } from './common.types';

export type VoStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type VoItemType = 'ADD' | 'MODIFY';

export interface VariationOrder {
  id: string;
  tenantId: string;
  siteId: string;
  voNumber: number;
  title: string;
  description?: string | null;
  status: VoStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items?: VariationOrderItem[];
  createdBy?: UserBasic;
}

export interface VariationOrderItem {
  id: string;
  variationOrderId: string;
  boqItemId?: string | null;
  itemType: VoItemType;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  createdAt: string;
  boqItem?: {
    id: string;
    itemCode: string;
    description: string;
  };
}

export interface CreateVoPayload {
  title: string;
  description?: string;
  items: {
    boqItemId?: string | null;
    itemType: VoItemType;
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitRate: number;
  }[];
}

export interface VoQueryParams {
  status?: VoStatus;
  page?: number;
  limit?: number;
}
