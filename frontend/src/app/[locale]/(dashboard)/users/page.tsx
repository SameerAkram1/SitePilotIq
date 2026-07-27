'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { useDepartments } from '@/hooks/api/use-departments';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserPlus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  department?: { id: string; name: string } | string | null;
  jobTitle?: string;
  createdAt: string;
}

interface PaginatedResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function InviteUserModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const tu = useTranslations('users');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const { data: departments = [] } = useDepartments();

  const ROLES = [
    { value: 'ADMIN', label: tu('roles.admin') },
    { value: 'PROJECT_MANAGER', label: tu('roles.project_manager') },
    { value: 'SITE_MANAGER', label: tu('roles.site_manager') },
    { value: 'ENGINEER', label: tu('roles.engineer') },
    { value: 'WORKER', label: tu('roles.worker') },
  ];

  const inviteMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      role: string;
      jobTitle: string;
      departmentId?: string;
    }) => {
      const response = await api.post('/users/invite', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(tu('invite_success'));
      setEmail('');
      setRole('');
      setJobTitle('');
      setDepartmentId('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || tu('invite_failed'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;
    inviteMutation.mutate({ email, role, jobTitle, departmentId: departmentId || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tu('invite_dialog_title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{tu('invite_email_label')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={tu('invite_email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{tu('invite_role_label')}</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder={tu('invite_role_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">{tu('invite_jobtitle_label')}</Label>
            <Input
              id="jobTitle"
              placeholder={tu('invite_jobtitle_placeholder')}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">{tu('invite_department_label')}</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder={tu('invite_department_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={inviteMutation.isPending || !email || !role}
            >
              {inviteMutation.isPending ? tu('invite_sending') : tu('invite_send')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const tu = useTranslations('users');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const ROLES = [
    { value: 'ADMIN', label: tu('roles.admin') },
    { value: 'PROJECT_MANAGER', label: tu('roles.project_manager') },
    { value: 'SITE_MANAGER', label: tu('roles.site_manager') },
    { value: 'ENGINEER', label: tu('roles.engineer') },
    { value: 'WORKER', label: tu('roles.worker') },
  ];

  const filters = useMemo(
    () => ({
      page,
      limit,
      search,
      role: roleFilter === 'all' ? '' : roleFilter,
    }),
    [page, search, roleFilter]
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(filters.page));
      params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      const response = await api.get(`/users?${params.toString()}`);
      return response.data.data as PaginatedResponse;
    },
  });

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title={tu('page_title')}
        subtitle={`${users.length} of ${total} seats used`}
        action={
          isAdmin ? (
            <Button onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {tu('invite_member')}
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tu('search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(val) => {
            setRoleFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={tu('filter_role')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tu('filter_role_all')}</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-muted-foreground">{tu('loading')}</div>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-8 w-8 text-muted-foreground" />}
          title={tu('empty_title')}
          description={
            search || roleFilter !== 'all'
              ? tu('empty_search_hint')
              : tu('empty_invite_hint')
          }
          action={
            isAdmin && !search && roleFilter === 'all'
              ? {
                  label: tu('invite_first'),
                  onClick: () => setInviteModalOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tu('table_member')}</TableHead>
                  <TableHead>{tu('table_email')}</TableHead>
                  <TableHead>{tu('table_role')}</TableHead>
                  <TableHead>{tu('table_status')}</TableHead>
                  <TableHead>{tu('table_department')}</TableHead>
                  <TableHead>{tu('table_joined')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {getInitials(u.fullName)}
                        </div>
                        <span className="font-medium">{u.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={u.role} type="role" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={u.status} type="status" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {typeof u.department === 'object' && u.department !== null
                        ? u.department.name
                        : u.department || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {isAdmin && (
        <InviteUserModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
        />
      )}
    </div>
  );
}
