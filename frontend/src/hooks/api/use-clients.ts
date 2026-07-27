import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

export function useClients(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await api.get(`/clients?${params.toString()}`);
      return response.data;
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: async () => {
      const response = await api.get(`/clients/${id}`);
      return response.data.data ?? response.data;
    },
    enabled: !!id,
  });
}

export function useClientDashboard(id: string) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(id), 'dashboard'],
    queryFn: async () => {
      const response = await api.get(`/clients/${id}/dashboard`);
      return response.data.data ?? response.data;
    },
    enabled: !!id,
  });
}

export function useClientFinancialSummary(id: string) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(id), 'financial'],
    queryFn: async () => {
      const response = await api.get(`/clients/${id}/financial-summary`);
      return response.data.data ?? response.data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/clients', data);
      return response.data.data ?? response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Client created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create client');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/clients/${id}`, data);
      return response.data.data ?? response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Client updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update client');
    },
  });
}

export function useDisableClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/clients/${id}/disable`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Client disabled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to disable client');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Client deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete client');
    },
  });
}

export function useAddClientNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.post(`/clients/${id}/notes`, data);
      return response.data.data ?? response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Note added');
    },
  });
}

export function useUpdateClientNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, noteId, data }: { clientId: string; noteId: string; data: any }) => {
      const response = await api.patch(`/clients/${clientId}/notes/${noteId}`, data);
      return response.data.data ?? response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Note updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update note');
    },
  });
}

export function useDeleteClientNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, noteId }: { clientId: string; noteId: string }) => {
      await api.delete(`/clients/${clientId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Note deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete note');
    },
  });
}

export function useClientReminders(id: string) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(id), 'reminders'],
    queryFn: async () => {
      const response = await api.get(`/clients/${id}/reminders`);
      return response.data.data ?? response.data;
    },
    enabled: !!id,
  });
}

export function useClientExpenses(id: string, params: Record<string, any> = {}) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(id), 'expenses', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const response = await api.get(`/clients/${id}/expenses?${searchParams.toString()}`);
      return response.data.data ?? response.data;
    },
    enabled: !!id,
  });
}

export function useCreateClientExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: any }) => {
      const response = await api.post(`/clients/${clientId}/expenses`, data);
      return response.data.data ?? response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Expense created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create expense');
    },
  });
}

export function useClientBudgets(id: string) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(id), 'budgets'],
    queryFn: async () => {
      const response = await api.get(`/clients/${id}/budgets`);
      return response.data.data ?? response.data;
    },
    enabled: !!id,
  });
}

export function useCreateClientBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: any }) => {
      const response = await api.post(`/clients/${clientId}/budgets`, data);
      return response.data.data ?? response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success('Budget created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create budget');
    },
  });
}

export async function getClientsForSelection(filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get(`/clients?${params.toString()}`);
  return response.data.data || response.data || [];
}
