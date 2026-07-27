import api from '@/lib/api';

export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: (filters: Record<string, any>) => ['projects', 'list', filters] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  sites: {
    all: ['sites'] as const,
    list: (filters: Record<string, any>) => ['sites', 'list', filters] as const,
    detail: (id: string) => ['sites', 'detail', id] as const,
    dashboard: (id: string) => ['sites', 'dashboard', id] as const,
    locations: (id: string) => ['sites', 'locations', id] as const,
    qrCode: (id: string) => ['sites', 'qrCode', id] as const,
  },
  projectCategories: {
    all: ['projectCategories'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: Record<string, any>) => ['users', 'list', filters] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    today: ['attendance', 'today'] as const,
    history: (params?: Record<string, any>) => ['attendance', 'history', params] as const,
    site: (siteId: string, params?: Record<string, any>) => ['attendance', 'site', siteId, params] as const,
  },
};

// Projects API
export async function getProjects(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get(`/projects?${params.toString()}`);
  return response.data;
}

export async function getProject(id: string) {
  const response = await api.get(`/projects/${id}`);
  return response.data.data ?? response.data;
}

export async function createProject(data: any) {
  const response = await api.post('/projects', data);
  return response.data.data ?? response.data;
}

export async function updateProject(id: string, data: any) {
  const response = await api.patch(`/projects/${id}`, data);
  return response.data.data ?? response.data;
}

export async function disableProject(id: string) {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
}

// Project Attachments API
export async function uploadProjectAttachment(projectId: string, file: File, description?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }
  const response = await api.post(`/projects/${projectId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateProjectAttachment(projectId: string, attachmentId: string, data: { description?: string }) {
  const response = await api.patch(`/projects/${projectId}/attachments/${attachmentId}`, data);
  return response.data;
}

export async function downloadProjectAttachment(projectId: string, attachmentId: string) {
  const response = await api.get(`/projects/${projectId}/attachments/${attachmentId}/download`);
  return response.data;
}

export async function deleteProjectAttachment(projectId: string, attachmentId: string) {
  const response = await api.delete(`/projects/${projectId}/attachments/${attachmentId}`);
  return response.data;
}

// Sites API
export async function getSites(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get(`/sites?${params.toString()}`);
  return response.data;
}

export async function getSite(id: string) {
  const response = await api.get(`/sites/${id}`);
  return response.data.data ?? response.data;
}

export async function getSiteDashboard(id: string) {
  const response = await api.get(`/sites/${id}/dashboard`);
  return response.data.data ?? response.data;
}

export async function createSite(data: any) {
  const response = await api.post('/sites', data);
  return response.data.data ?? response.data;
}

export async function updateSite(id: string, data: any) {
  const response = await api.patch(`/sites/${id}`, data);
  return response.data.data ?? response.data;
}

export async function disableSite(id: string) {
  const response = await api.delete(`/sites/${id}`);
  return response.data;
}

export async function regenerateSiteQr(id: string) {
  const response = await api.post(`/sites/${id}/regenerate-qr`);
  return response.data.data ?? response.data;
}

export async function getSiteQrCode(id: string) {
  const response = await api.get(`/sites/${id}/qr-code`);
  return response.data;
}

// Site Locations API
export async function getSiteLocations(siteId: string) {
  const response = await api.get(`/sites/${siteId}/locations`);
  return response.data;
}

export async function createSiteLocation(siteId: string, data: any) {
  const response = await api.post(`/sites/${siteId}/locations`, data);
  return response.data.data ?? response.data;
}

export async function updateSiteLocation(locId: string, data: any) {
  const response = await api.patch(`/sites/locations/${locId}`, data);
  return response.data.data ?? response.data;
}

export async function deleteSiteLocation(locId: string) {
  const response = await api.delete(`/sites/locations/${locId}`);
  return response.data;
}

// Project Categories API
export async function getProjectCategories() {
  const response = await api.get('/project-categories');
  return response.data;
}

export async function createProjectCategory(data: { name: string }) {
  const response = await api.post('/project-categories', data);
  return response.data.data ?? response.data;
}

export async function updateProjectCategory(id: string, data: { name: string }) {
  const response = await api.patch(`/project-categories/${id}`, data);
  return response.data.data ?? response.data;
}

export async function deleteProjectCategory(id: string) {
  const response = await api.delete(`/project-categories/${id}`);
  return response.data;
}

// Users API (for manager selection)
export async function getUsersForSelection() {
  const response = await api.get('/users?limit=100');
  return response.data.data?.data || response.data.data || response.data || [];
}

// Geocoding API
export async function geocodeAddress(address: string) {
  const response = await api.post('/sites/geocode', { address });
  return response.data;
}

export async function searchAddresses(address: string) {
  const response = await api.post('/sites/geocode/search', { address });
  return response.data;
}

// Dashboard API
export async function getDashboardStats() {
  const response = await api.get('/dashboard/stats');
  return response.data.data ?? response.data;
}

export async function getFinancialOverview() {
  const response = await api.get('/dashboard/financial');
  return response.data.data ?? response.data;
}

export async function getRevenueTrend() {
  const response = await api.get('/dashboard/revenue-trend');
  return response.data.data ?? response.data;
}

export async function getIpcPipeline() {
  const response = await api.get('/dashboard/ipc-pipeline');
  return response.data.data ?? response.data;
}

export async function getExpensesByType() {
  const response = await api.get('/dashboard/expenses-by-type');
  return response.data.data ?? response.data;
}

export async function getProjectStatus() {
  const response = await api.get('/dashboard/project-status');
  return response.data.data ?? response.data;
}

export async function getRecentActivity() {
  const response = await api.get('/dashboard/recent-activity');
  return response.data.data ?? response.data;
}

export async function getUpcomingEvents() {
  const response = await api.get('/dashboard/upcoming-events');
  return response.data.data ?? response.data;
}

// Calendar API
export async function getCalendarEvents(params: { startDate: string; endDate: string; type?: string }) {
  const query = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.type) query.append('type', params.type);
  const response = await api.get(`/calendar/events?${query.toString()}`);
  return response.data.data ?? response.data;
}

// Reports API
export async function downloadBoqExcel(siteId: string) {
  const response = await api.get(`/reports/boq/${siteId}/excel`, { responseType: 'blob' });
  return response.data;
}

export async function downloadBoqPdf(siteId: string) {
  const response = await api.get(`/reports/boq/${siteId}/pdf`, { responseType: 'blob' });
  return response.data;
}

export async function downloadDprPdf(siteId: string, dprId: string) {
  const response = await api.get(`/reports/dpr/${siteId}/${dprId}/pdf`, { responseType: 'blob' });
  return response.data;
}

export async function downloadExpensesExcel(clientId: string) {
  const response = await api.get(`/reports/expenses/${clientId}/excel`, { responseType: 'blob' });
  return response.data;
}

export async function downloadExpensesPdf(clientId: string) {
  const response = await api.get(`/reports/expenses/${clientId}/pdf`, { responseType: 'blob' });
  return response.data;
}

export async function downloadSiteReportPdf(siteId: string) {
  const response = await api.get(`/reports/site-summary/${siteId}/pdf`, { responseType: 'blob' });
  return response.data;
}

// Attendance API
export async function checkIn(data: { siteId?: string; qrPayload?: string; latitude: number; longitude: number; notes?: string }) {
  const response = await api.post('/attendance/check-in', data);
  return response.data.data ?? response.data;
}

export async function checkOut(data: { latitude: number; longitude: number; notes?: string }) {
  const response = await api.post('/attendance/check-out', data);
  return response.data.data ?? response.data;
}

export async function getTodayAttendance() {
  const response = await api.get('/attendance/today');
  return response.data.data ?? response.data;
}

export async function getAttendanceHistory(params?: { siteId?: string; employeeId?: string; startDate?: string; endDate?: string }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
  }
  const response = await api.get(`/attendance/history?${query.toString()}`);
  return response.data.data ?? response.data;
}

export async function getSiteAttendance(siteId: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) query.append(key, String(value));
    });
  }
  const response = await api.get(`/attendance/site/${siteId}?${query.toString()}`);
  return response.data.data ?? response.data;
}

export async function createAttendance(data: { siteId: string; employeeId: string; attendanceDate: string; checkInTime?: string; checkInLat?: number; checkInLng?: number; checkOutTime?: string; checkOutLat?: number; checkOutLng?: number; notes?: string }) {
  const response = await api.post('/attendance', data);
  return response.data.data ?? response.data;
}

export async function updateAttendance(id: string, data: { attendanceDate?: string; checkInTime?: string; checkInLat?: number; checkInLng?: number; checkOutTime?: string; checkOutLat?: number; checkOutLng?: number; notes?: string }) {
  const response = await api.patch(`/attendance/${id}`, data);
  return response.data.data ?? response.data;
}

export async function deleteAttendance(id: string) {
  const response = await api.delete(`/attendance/${id}`);
  return response.data.data ?? response.data;
}

// Attendance Export API
export async function exportAttendance(params?: { siteId?: string; startDate?: string; endDate?: string }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
  }
  const response = await api.get(`/attendance/export?${query.toString()}`, { responseType: 'blob' });
  return response.data;
}

// Site Assignments API (re-export hooks + types)
export { assignmentKeys } from './use-assignments';
export type {
  SiteAssignment,
  SiteWithAssignments,
  AvailableWorker,
  AssignmentStats,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
  ReassignPayload,
  BulkAssignResult,
  WorkerHistory,
  TradeBreakdown,
  OverlapWarning,
} from './use-assignments';
export {
  useAssignmentStats,
  useSitesWithAssignments,
  useAssignmentsForSite,
  useAssignmentsForUser,
  useAvailableWorkers,
  useWorkerHistory,
  useTradeBreakdown,
  useCreateAssignment,
  useUpdateAssignment,
  useEndAssignment,
  useCancelAssignment,
  useReassignUser,
} from './use-assignments';

// BoQ API
export { boqKeys } from './use-boq';
export {
  getBoqItems,
  getBoqStats,
  downloadBoqTemplate,
  importBoqFile,
  createBoqItem,
  updateBoqItem,
  deleteBoqItem,
  approveBaseline,
  exportBoq,
} from './use-boq';

// BoQ Sections API
export { boqSectionKeys } from './use-boq-sections';
export {
  getBoqSections,
  getBoqSection,
  createBoqSection,
  updateBoqSection,
  deleteBoqSection,
} from './use-boq-sections';

// Measurement Book API
export { mbKeys } from './use-measurement-book';
export {
  getMbEntries,
  getMbStats,
  getMbAggregated,
  createMbEntry,
  updateMbEntry,
  deleteMbEntry,
} from './use-measurement-book';

// IPC API
export { ipcKeys } from './use-ipc';
export {
  getIpcRecords,
  getIpcStats,
  getIpcRecord,
  createIpcRecord,
  submitIpc,
  certifyIpc,
  rejectIpc,
  recordIpcPayment,
  markIpcPaid,
  downloadIpcPdf,
} from './use-ipc';

// Variation Orders API
export { voKeys } from './use-variation-orders';
export {
  getVariationOrders,
  getVariationOrder,
  createVariationOrder,
  submitVariationOrder,
  approveVariationOrder,
  rejectVariationOrder,
} from './use-variation-orders';

// Site Activity API
export async function getSiteActivity(siteId: string, params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
  }
  const response = await api.get(`/sites/${siteId}/activity?${query.toString()}`);
  return response.data;
}

// Site Attachments API
export async function getSiteAttachments(siteId: string) {
  const response = await api.get(`/sites/${siteId}/attachments`);
  return response.data;
}

export async function uploadSiteAttachment(siteId: string, file: File, description?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (description) formData.append('description', description);
  const response = await api.post(`/sites/${siteId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteSiteAttachment(siteId: string, attachmentId: string) {
  const response = await api.delete(`/sites/${siteId}/attachments/${attachmentId}`);
  return response.data;
}

// Daily Progress Reports (DPR) API
export async function getDprList(siteId: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
  }
  const response = await api.get(`/sites/${siteId}/dpr?${query.toString()}`);
  return response.data;
}

export async function getDpr(siteId: string, id: string) {
  const response = await api.get(`/sites/${siteId}/dpr/${id}`);
  return response.data;
}

export async function createDpr(siteId: string, data: any) {
  const response = await api.post(`/sites/${siteId}/dpr`, data);
  return response.data;
}

export async function updateDpr(siteId: string, id: string, data: any) {
  const response = await api.patch(`/sites/${siteId}/dpr/${id}`, data);
  return response.data;
}

export async function deleteDpr(siteId: string, id: string) {
  const response = await api.delete(`/sites/${siteId}/dpr/${id}`);
  return response.data;
}

// Site Photos API
export async function getSitePhotos(siteId: string, params?: { page?: number; limit?: number; locationId?: string; startDate?: string; endDate?: string }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
  }
  const response = await api.get(`/sites/${siteId}/photos?${query.toString()}`);
  return response.data;
}

export async function uploadSitePhoto(siteId: string, file: File, dto?: { caption?: string; description?: string; locationId?: string; dprId?: string }) {
  const formData = new FormData();
  formData.append('file', file);
  if (dto?.caption) formData.append('caption', dto.caption);
  if (dto?.description) formData.append('description', dto.description);
  if (dto?.locationId) formData.append('locationId', dto.locationId);
  if (dto?.dprId) formData.append('dprId', dto.dprId);
  const response = await api.post(`/sites/${siteId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteSitePhoto(siteId: string, photoId: string) {
  const response = await api.delete(`/sites/${siteId}/photos/${photoId}`);
  return response.data;
}

export async function updateSitePhoto(siteId: string, photoId: string, dto: { caption?: string; description?: string; locationId?: string }) {
  const response = await api.patch(`/sites/${siteId}/photos/${photoId}`, dto);
  return response.data;
}

// Notifications API
export async function getNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
  }
  const response = await api.get(`/notifications?${query.toString()}`);
  return response.data;
}

export async function markNotificationAsRead(id: string) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await api.patch('/notifications/read-all');
  return response.data;
}

export async function deleteNotification(id: string) {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
}

// Project Milestones API
export async function getMilestones(projectId: string) {
  const response = await api.get(`/projects/${projectId}/milestones`);
  return response.data;
}

export async function getMilestone(projectId: string, id: string) {
  const response = await api.get(`/projects/${projectId}/milestones/${id}`);
  return response.data;
}

export async function createMilestone(projectId: string, data: any) {
  const response = await api.post(`/projects/${projectId}/milestones`, data);
  return response.data;
}

export async function updateMilestone(projectId: string, id: string, data: any) {
  const response = await api.patch(`/projects/${projectId}/milestones/${id}`, data);
  return response.data;
}

export async function deleteMilestone(projectId: string, id: string) {
  const response = await api.delete(`/projects/${projectId}/milestones/${id}`);
  return response.data;
}

export async function forgotPassword(email: string, tenantSlug?: string) {
  const response = await api.post('/auth/forgot-password', { email, tenantSlug });
  return response.data;
}

export async function resetPassword(token: string, password: string) {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
}

export { updateVariationOrder, deleteVariationOrder } from './use-variation-orders';
export { useClients, useClient, useClientDashboard, useClientFinancialSummary, useCreateClient, useUpdateClient, useDisableClient, useDeleteClient, useAddClientNote, useUpdateClientNote, useDeleteClientNote, useClientReminders, useClientExpenses, useCreateClientExpense, useClientBudgets, useCreateClientBudget, getClientsForSelection } from './use-clients';
