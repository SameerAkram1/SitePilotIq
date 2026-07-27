import api from '@/lib/api';

export const boqSectionKeys = {
  all: ['boqSections'] as const,
  list: (siteId: string) => ['boqSections', 'list', siteId] as const,
  detail: (siteId: string, id: string) => ['boqSections', 'detail', siteId, id] as const,
};

export async function getBoqSections(siteId: string) {
  const response = await api.get(`/sites/${siteId}/boq/sections`);
  return response.data;
}

export async function getBoqSection(siteId: string, id: string) {
  const response = await api.get(`/sites/${siteId}/boq/sections/${id}`);
  return response.data;
}

export async function createBoqSection(siteId: string, data: { code: string; name: string; sortOrder?: number }) {
  const response = await api.post(`/sites/${siteId}/boq/sections`, data);
  return response.data;
}

export async function updateBoqSection(siteId: string, id: string, data: { code?: string; name?: string; sortOrder?: number }) {
  const response = await api.patch(`/sites/${siteId}/boq/sections/${id}`, data);
  return response.data;
}

export async function deleteBoqSection(siteId: string, id: string) {
  const response = await api.delete(`/sites/${siteId}/boq/sections/${id}`);
  return response.data;
}
