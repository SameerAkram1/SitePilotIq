import { UserBasic } from './common.types';

export interface MeasurementEntry {
  id: string;
  tenantId: string;
  siteId: string;
  boqItemId: string;
  entryDate: string;
  description: string;
  dim1?: number | null;
  dim2?: number | null;
  dim3?: number | null;
  totalQuantity: number;
  enteredById: string;
  createdAt: string;
  updatedAt: string;
  boqItem?: {
    id: string;
    itemCode: string;
    description: string;
    unit: string;
    estimatedQty: number;
  };
  enteredBy?: UserBasic;
}

export interface MeasurementAggregate {
  boqItemId: string;
  itemCode: string;
  description: string;
  unit: string;
  estimatedQty: number;
  totalMeasured: number;
  remaining: number;
  percentComplete: number;
}

export interface MeasurementStats {
  totalEntries: number;
  totalBoqItemsMeasured: number;
  totalBoqItems: number;
  overallProgress: number;
}

export interface CreateMeasurementPayload {
  boqItemId: string;
  entryDate: string;
  description: string;
  dim1?: number | null;
  dim2?: number | null;
  dim3?: number | null;
  totalQuantity: number;
}

export interface UpdateMeasurementPayload extends Partial<CreateMeasurementPayload> {}

export interface MeasurementQueryParams {
  boqItemId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
