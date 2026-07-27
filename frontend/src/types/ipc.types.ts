import { UserBasic } from './common.types';

export type IpcStatus = 'DRAFT' | 'SUBMITTED' | 'CERTIFIED' | 'REJECTED' | 'PAID';

export interface IpcRecord {
  id: string;
  tenantId: string;
  siteId: string;
  ipcNumber: number;
  billingStartDate: string;
  billingEndDate: string;
  status: IpcStatus;
  isFinal: boolean;
  isMbLinked: boolean;
  grossClaimed: number;
  retentionDeduction: number;
  advanceRecovery: number;
  netPayable: number;
  certifiedGross?: number | null;
  certifiedRetention?: number | null;
  certifiedAdvanceRecovery?: number | null;
  certifiedNetPayable?: number | null;
  retentionReleased: boolean;
  retentionReleasedAt?: string | null;
  submittedAt?: string | null;
  certifiedAt?: string | null;
  paidAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lineItems?: IpcLineItem[];
  paymentRecords?: IpcPaymentRecord[];
  createdBy?: UserBasic;
  certifiedBy?: UserBasic | null;
}

export interface IpcLineItem {
  id: string;
  ipcRecordId: string;
  boqItemId: string;
  boqUnitRate: number;
  boqQuantity: number;
  previousQuantity: number;
  previousAmount: number;
  currentQuantity: number;
  currentPercent: number;
  currentAmount: number;
  cumulativeQuantity: number;
  cumulativeAmount: number;
  certifiedQuantity?: number | null;
  certifiedAmount?: number | null;
  createdAt: string;
  updatedAt: string;
  boqItem?: {
    id: string;
    itemCode: string;
    description: string;
    unit: string;
  };
}

export interface IpcPaymentRecord {
  id: string;
  ipcRecordId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  recordedById: string;
  createdAt: string;
  recordedBy?: UserBasic;
}

export interface IpcStats {
  totalIpcs: number;
  totalGrossClaimed: number;
  totalNetPayable: number;
  totalCertified: number;
  totalPaid: number;
  pendingPayment: number;
}

export interface CreateIpcPayload {
  billingStartDate: string;
  billingEndDate: string;
  isFinal?: boolean;
}

export interface SubmitIpcPayload {
  lineItems: {
    boqItemId: string;
    currentQuantity: number;
  }[];
}

export interface CertifyIpcPayload {
  certifiedGross: number;
  certifiedRetention?: number;
  certifiedAdvanceRecovery?: number;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface IpcQueryParams {
  status?: IpcStatus;
  page?: number;
  limit?: number;
}
