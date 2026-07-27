import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SiteAssignment {
  id: string;
  tenantId: string;
  siteId: string;
  userId: string;
  trade: string | null;
  startDate: string;
  endDate: string | null;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  notes: string | null;
  assignedById: string;
  endedById: string | null;
  endedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    role: string;
    email: string;
    phone: string | null;
  };
  site?: {
    id: string;
    name: string;
    code: string;
  };
  assignedBy?: {
    id: string;
    fullName: string;
  };
  endedBy?: {
    id: string;
    fullName: string;
  };
}

export interface SiteWithAssignments {
  id: string;
  name: string;
  code: string;
  status: string;
  assignedCount: number;
  project: {
    id: string;
    name: string;
  };
}

export interface AvailableWorker {
  id: string;
  fullName: string;
  role: string;
  email: string;
  phone: string | null;
  department: {
    id: string;
    name: string;
  } | null;
}

export interface AssignmentStats {
  totalWorkers: number;
  activeSites: number;
  activeAssignments: number;
}

export interface CreateAssignmentPayload {
  siteId: string;
  userId?: string;
  userIds?: string[];
  trade?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateAssignmentPayload {
  endDate?: string;
  trade?: string;
  notes?: string;
}

export interface ReassignPayload {
  userId: string;
  newSiteId: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface BulkAssignResult {
  created: SiteAssignment[];
  errors: { userId: string; reason: string }[];
}

export interface WorkerHistory {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    phone: string | null;
  };
  assignments: SiteAssignment[];
  pagination: Pagination;
}

export interface TradeBreakdown {
  total: number;
  breakdown: Record<string, number>;
}

export interface OverlapWarning {
  hasOverlap: boolean;
  conflictingSite?: string;
  conflictingSiteId?: string;
  existingStart?: string;
  existingEnd?: string;
}

export interface PaginatedAssignments {
  data: SiteAssignment[];
  pagination: Pagination;
}

export interface PaginatedWorkers {
  data: AvailableWorker[];
  pagination: Pagination;
}

export const assignmentKeys = {
  all: ['assignments'] as const,
  stats: () => ['assignments', 'stats'] as const,
  sites: () => ['assignments', 'sites'] as const,
  bySite: (siteId: string, status?: string) => ['assignments', 'site', siteId, status] as const,
  byUser: (userId: string) => ['assignments', 'user', userId] as const,
  available: (search?: string) => ['assignments', 'available', search] as const,
  workerHistory: (userId: string) => ['assignments', 'worker-history', userId] as const,
  tradeBreakdown: (siteId: string) => ['assignments', 'trade-breakdown', siteId] as const,
};

export function useAssignmentStats() {
  return useQuery({
    queryKey: assignmentKeys.stats(),
    queryFn: async (): Promise<AssignmentStats> => {
      const { data } = await api.get('/assignments/stats');
      return data.data ?? data;
    },
    staleTime: 30_000,
  });
}

export function useSitesWithAssignments() {
  return useQuery({
    queryKey: assignmentKeys.sites(),
    queryFn: async (): Promise<SiteWithAssignments[]> => {
      const { data } = await api.get('/assignments/sites');
      return data.data ?? data;
    },
    staleTime: 15_000,
  });
}

export function useAssignmentsForSite(siteId: string | null, status: string = 'ACTIVE', page: number = 1, search: string = '') {
  return useQuery({
    queryKey: assignmentKeys.bySite(siteId || '', status),
    queryFn: async (): Promise<PaginatedAssignments> => {
      const params = new URLSearchParams();
      if (siteId) params.append('siteId', siteId);
      if (status) params.append('status', status);
      params.append('page', String(page));
      params.append('limit', '25');
      if (search) params.append('search', search);
      const { data } = await api.get(`/assignments?${params.toString()}`);
      return data.data ?? data;
    },
    enabled: !!siteId,
    staleTime: 10_000,
  });
}

export function useAssignmentsForUser(userId: string | null, page: number = 1) {
  return useQuery({
    queryKey: [...assignmentKeys.byUser(userId || ''), page],
    queryFn: async (): Promise<PaginatedAssignments> => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '25');
      const { data } = await api.get(`/assignments/user/${userId}?${params.toString()}`);
      return data.data ?? data;
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
}

export function useAvailableWorkers(search?: string) {
  return useQuery({
    queryKey: assignmentKeys.available(search),
    queryFn: async (): Promise<PaginatedWorkers> => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const qs = params.toString();
      const { data } = await api.get(`/assignments/available-workers${qs ? `?${qs}` : ''}`);
      return data.data ?? data;
    },
    staleTime: 10_000,
  });
}

export function useWorkerHistory(userId: string | null) {
  return useQuery({
    queryKey: assignmentKeys.workerHistory(userId || ''),
    queryFn: async (): Promise<WorkerHistory> => {
      const { data } = await api.get(`/assignments/worker/${userId}/history`);
      return data.data ?? data;
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
}

export function useTradeBreakdown(siteId: string | null) {
  return useQuery({
    queryKey: assignmentKeys.tradeBreakdown(siteId || ''),
    queryFn: async (): Promise<TradeBreakdown> => {
      const { data } = await api.get(`/assignments/site/${siteId}/trades`);
      return data.data ?? data;
    },
    enabled: !!siteId,
    staleTime: 10_000,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAssignmentPayload): Promise<BulkAssignResult> => {
      const { data } = await api.post('/assignments', payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateAssignmentPayload }): Promise<SiteAssignment> => {
      const { data } = await api.patch(`/assignments/${id}`, payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

export function useEndAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<SiteAssignment> => {
      const { data } = await api.patch(`/assignments/${id}/end`);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

export function useCancelAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const { data } = await api.delete(`/assignments/${id}`);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

export function useReassignUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReassignPayload): Promise<{ endedOldAssignmentId: string; newAssignment: SiteAssignment }> => {
      const { data } = await api.post('/assignments/reassign', payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}
