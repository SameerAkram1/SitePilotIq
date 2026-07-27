import api from '@/lib/api';

export const ipcKeys = {
  all: ['ipc'] as const,
  list: (siteId: string, params?: Record<string, any>) => ['ipc', 'list', siteId, params] as const,
  stats: (siteId: string) => ['ipc', 'stats', siteId] as const,
  detail: (siteId: string, id: string) => ['ipc', 'detail', siteId, id] as const,
};

export async function getIpcRecords(siteId: string, params?: { status?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
  }
  const response = await api.get(`/sites/${siteId}/ipc?${query.toString()}`);
  return response.data;
}

export async function getIpcStats(siteId: string) {
  const response = await api.get(`/sites/${siteId}/ipc/stats`);
  return response.data;
}

export async function getIpcRecord(siteId: string, id: string) {
  const response = await api.get(`/sites/${siteId}/ipc/${id}`);
  return response.data;
}

export async function createIpcRecord(siteId: string, data: { billingStartDate: string; billingEndDate: string; isFinal?: boolean; isMbLinked?: boolean }) {
  const response = await api.post(`/sites/${siteId}/ipc`, data);
  return response.data;
}

export async function submitIpc(siteId: string, id: string, data: { lineItems: Array<{ boqItemId: string; currentQuantity: number }> }) {
  const response = await api.patch(`/sites/${siteId}/ipc/${id}/submit`, data);
  return response.data;
}

export async function certifyIpc(
  siteId: string,
  id: string,
  data: { lineItems: Array<{ boqItemId: string; certifiedQuantity: number }>; retentionReleased?: boolean },
) {
  const response = await api.patch(`/sites/${siteId}/ipc/${id}/certify`, data);
  return response.data;
}

export async function rejectIpc(siteId: string, id: string, data?: { reason?: string }) {
  const response = await api.patch(`/sites/${siteId}/ipc/${id}/reject`, data || {});
  return response.data;
}

export async function recordIpcPayment(
  siteId: string,
  id: string,
  data: { amount: number; paymentDate: string; paymentMethod?: string; referenceNumber?: string; notes?: string },
) {
  const response = await api.patch(`/sites/${siteId}/ipc/${id}/payment`, data);
  return response.data;
}

export async function markIpcPaid(siteId: string, id: string) {
  const response = await api.patch(`/sites/${siteId}/ipc/${id}/mark-paid`);
  return response.data;
}

export async function downloadIpcPdf(siteId: string, id: string): Promise<Blob> {
  const response = await api.get(`/sites/${siteId}/ipc/${id}/pdf`, { responseType: 'blob' });
  return response.data;
}
