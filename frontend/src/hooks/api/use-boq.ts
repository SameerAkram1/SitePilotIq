import api from '@/lib/api';

export const boqKeys = {
  all: ['boq'] as const,
  list: (siteId: string, params?: Record<string, any>) => ['boq', 'list', siteId, params] as const,
  stats: (siteId: string) => ['boq', 'stats', siteId] as const,
  detail: (siteId: string, id: string) => ['boq', 'detail', siteId, id] as const,
};

export async function getBoqItems(siteId: string, params?: { search?: string; page?: number; limit?: number; sectionId?: string }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
  }
  const response = await api.get(`/sites/${siteId}/boq?${query.toString()}`);
  return response.data;
}

export async function getBoqStats(siteId: string) {
  const response = await api.get(`/sites/${siteId}/boq/stats`);
  return response.data;
}

export async function downloadBoqTemplate(siteId: string) {
  const response = await api.get(`/sites/${siteId}/boq/template`, { responseType: 'blob' });
  return response.data;
}

export async function importBoqFile(siteId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/sites/${siteId}/boq/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function createBoqItem(siteId: string, data: any) {
  const response = await api.post(`/sites/${siteId}/boq`, data);
  return response.data;
}

export async function updateBoqItem(siteId: string, id: string, data: any) {
  const response = await api.patch(`/sites/${siteId}/boq/${id}`, data);
  return response.data;
}

export async function deleteBoqItem(siteId: string, id: string) {
  const response = await api.delete(`/sites/${siteId}/boq/${id}`);
  return response.data;
}

export async function approveBaseline(siteId: string) {
  const response = await api.post(`/sites/${siteId}/boq/baseline`);
  return response.data;
}

export async function exportBoq(siteId: string) {
  const response = await api.get(`/sites/${siteId}/boq/export`, { responseType: 'blob' });
  return response.data;
}
