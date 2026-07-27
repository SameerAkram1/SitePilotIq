import api from '@/lib/api';

export const mbKeys = {
  all: ['measurements'] as const,
  list: (siteId: string, params?: Record<string, any>) => ['measurements', 'list', siteId, params] as const,
  stats: (siteId: string) => ['measurements', 'stats', siteId] as const,
  aggregate: (siteId: string, startDate: string, endDate: string) =>
    ['measurements', 'aggregate', siteId, startDate, endDate] as const,
};

export async function getMbEntries(
  siteId: string,
  params?: { boqItemId?: string; startDate?: string; endDate?: string; page?: number; limit?: number },
) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
  }
  const response = await api.get(`/sites/${siteId}/measurements?${query.toString()}`);
  return response.data;
}

export async function getMbStats(siteId: string) {
  const response = await api.get(`/sites/${siteId}/measurements/stats`);
  return response.data;
}

export async function getMbAggregated(siteId: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await api.get(`/sites/${siteId}/measurements/aggregate?${query.toString()}`);
  return response.data;
}

export async function createMbEntry(siteId: string, data: any) {
  const response = await api.post(`/sites/${siteId}/measurements`, data);
  return response.data;
}

export async function updateMbEntry(siteId: string, id: string, data: any) {
  const response = await api.patch(`/sites/${siteId}/measurements/${id}`, data);
  return response.data;
}

export async function deleteMbEntry(siteId: string, id: string) {
  const response = await api.delete(`/sites/${siteId}/measurements/${id}`);
  return response.data;
}
