import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface Department {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  _count?: { users: number };
  createdAt: string;
}

const departmentsKeys = {
  all: ['departments'] as const,
  list: () => [...departmentsKeys.all, 'list'] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: departmentsKeys.list(),
    queryFn: async () => {
      try {
        const { data } = await api.get('/departments');
        const list = Array.isArray(data) ? data : data.data ?? [];
        return list as Department[];
      } catch {
        return [];
      }
    },
    placeholderData: [],
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; code?: string }) => {
      const { data } = await api.post('/departments', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsKeys.all });
      toast.success('Department created');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create department');
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; code?: string }) => {
      const { data } = await api.patch(`/departments/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsKeys.all });
      toast.success('Department updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update department');
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/departments/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsKeys.all });
      toast.success('Department deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete department');
    },
  });
}
