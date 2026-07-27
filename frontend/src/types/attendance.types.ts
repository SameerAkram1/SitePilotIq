import { UserBasic } from './common.types';

export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  siteId: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime: string;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkInLocationValid: boolean;
  checkOutTime?: string | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkOutLocationValid?: boolean | null;
  status: AttendanceStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: UserBasic;
  site?: { id: string; name: string; code: string };
}

export interface AttendanceQueryParams {
  siteId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceSummary {
  total: number;
  checkedIn: number;
  checkedOut: number;
  validCheckIns: number;
  invalidCheckIns: number;
  uniqueWorkers: number;
}
