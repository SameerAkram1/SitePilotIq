import api from '@/lib/api';

export const voKeys = {
  all: ['variationOrders'] as const,
  list: (siteId: string, params?: Record<string, any>) => ['variationOrders', 'list', siteId, params] as const,
  detail: (siteId: string, id: string) => ['variationOrders', 'detail', siteId, id] as const,
};

export async function getVariationOrders(siteId: string, params?: { status?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
  }
  const response = await api.get(`/sites/${siteId}/variation-orders?${query.toString()}`);
  return response.data;
}

export async function getVariationOrder(siteId: string, id: string) {
  const response = await api.get(`/sites/${siteId}/variation-orders/${id}`);
  return response.data;
}

export async function createVariationOrder(siteId: string, data: {
  title: string;
  description?: string;
  items: Array<{
    action: 'ADD' | 'MODIFY';
    boqItemId?: string;
    itemCode: string;
    description: string;
    unit: string;
    estimatedQty: number;
    unitRate: number;
    sectionId?: string;
  }>;
}) {
  const response = await api.post(`/sites/${siteId}/variation-orders`, data);
  return response.data;
}

export async function submitVariationOrder(siteId: string, id: string) {
  const response = await api.patch(`/sites/${siteId}/variation-orders/${id}/submit`);
  return response.data;
}

export async function approveVariationOrder(siteId: string, id: string) {
  const response = await api.patch(`/sites/${siteId}/variation-orders/${id}/approve`);
  return response.data;
}

export async function rejectVariationOrder(siteId: string, id: string) {
  const response = await api.patch(`/sites/${siteId}/variation-orders/${id}/reject`);
  return response.data;
}

export async function updateVariationOrder(siteId: string, id: string, data: {
  title?: string;
  description?: string;
  items?: Array<{
    action: 'ADD' | 'MODIFY';
    boqItemId?: string;
    itemCode: string;
    description: string;
    unit: string;
    estimatedQty: number;
    unitRate: number;
    sectionId?: string;
  }>;
}) {
  const response = await api.patch(`/sites/${siteId}/variation-orders/${id}`, data);
  return response.data;
}

export async function deleteVariationOrder(siteId: string, id: string) {
  const response = await api.delete(`/sites/${siteId}/variation-orders/${id}`);
  return response.data;
}
