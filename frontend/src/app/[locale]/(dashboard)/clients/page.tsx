'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useClients, useDeleteClient } from '@/hooks/api/use-clients';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Building2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Pencil,
  MoreHorizontal,
  Users,
  DollarSign,
  FolderKanban,
  MapPin,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function ClientsPage() {
  const t = useTranslations('clients');
  const t_status = useTranslations('clients.status');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useClients({
    search,
    status: statusFilter,
    page,
    limit: 20,
  });

  const deleteMutation = useDeleteClient();

  const stats = useQuery({
    queryKey: ['clientStats'],
    queryFn: async () => {
      const res = await api.get('/clients?limit=1');
      const total = res.data.total || 0;
      const activeRes = await api.get('/clients?status=ACTIVE&limit=1');
      const active = activeRes.data.total || 0;
      const prospectRes = await api.get('/clients?status=PROSPECT&limit=1');
      const prospects = prospectRes.data.total || 0;
      return { total, active, prospects };
    },
  });

  const clients = data?.data || [];
  const pagination = data ? { page: data.page, totalPages: data.totalPages, total: data.total } : null;

  const statusOptions = [
    { value: '', label: t('all_statuses') },
    { value: 'ACTIVE', label: t_status('ACTIVE') },
    { value: 'INACTIVE', label: t_status('INACTIVE') },
    { value: 'PROSPECT', label: t_status('PROSPECT') },
    { value: 'SUSPENDED', label: t_status('SUSPENDED') },
    { value: 'BLACKLISTED', label: t_status('BLACKLISTED') },
  ];

  const statusConfig: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    PROSPECT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SUSPENDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    BLACKLISTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('stats.total'), value: stats.data?.total ?? '—', icon: Building2, color: 'from-blue-500 to-indigo-600' },
          { label: t('stats.active'), value: stats.data?.active ?? '—', icon: Users, color: 'from-green-500 to-emerald-600' },
          { label: t('stats.prospects'), value: stats.data?.prospects ?? '—', icon: FolderKanban, color: 'from-purple-500 to-violet-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
        <Link href="/clients/new">
          <Button><Plus className="h-4 w-4 mr-2" />{t('new_client')}</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_placeholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 bg-muted rounded-xl px-3 text-sm border border-input"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t('empty')}</p>
            <Link href="/clients/new">
              <Button className="mt-4"><Plus className="h-4 w-4 mr-2" />{t('new_client')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('table.code')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('table.name')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('table.status')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('table.projects')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('table.contacts')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t('table.created')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client: any) => (
                  <tr
                    key={client.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-muted-foreground">{client.code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig[client.status] || ''}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{client._count?.projects || 0}</td>
                    <td className="py-3 px-4 text-sm">{client._count?.contacts || 0}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}/edit`)}>
                            <Pencil className="h-4 w-4 mr-2" />{tc('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(client.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />{tc('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {tc('page_of', { page: pagination.page, total: pagination.totalPages })}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {tc('previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
              {tc('next')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t('delete_confirm_title')}
        description={t('delete_confirm_text')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            });
          }
        }}
      />
    </div>
  );
}
