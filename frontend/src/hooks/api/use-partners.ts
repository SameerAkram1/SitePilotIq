import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

export function usePartners(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.partners.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await api.get(`/partners?${params.toString()}`);
      return response.data;
    },
  });
}

export function usePartner(id: string) {
  return useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: async () => {
      const response = await api.get(`/partners/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function usePartnerLedger(id: string) {
  return useQuery({
    queryKey: queryKeys.partners.ledger(id),
    queryFn: async () => {
      const response = await api.get(`/partners/${id}/ledger`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/partners', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      toast.success('Partner created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create partner');
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/partners/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      toast.success('Partner updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update partner');
    },
  });
}

export function useDisablePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/partners/${id}/disable`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      toast.success('Partner disabled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to disable partner');
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/partners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      toast.success('Partner deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete partner');
    },
  });
}

export function useAddPartnerNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { noteText: string } }) => {
      const response = await api.post(`/partners/${id}/notes`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      toast.success('Note added');
    },
  });
}

export async function getPartnersForSelection(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get(`/partners?${params.toString()}`);
  return response.data.data || [];
}
