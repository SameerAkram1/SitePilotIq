'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations('super_admin');
  const tCommon = useTranslations('common');
  const [search, setSearch] = useState('');
  const [toggleId, setToggleId] = useState<string | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: queryKeys.tenants.all,
    queryFn: async () => {
      const response = await api.get('/tenants');
      return response.data.data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/tenants/${id}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all });
      toast.success('Tenant status updated');
      setToggleId(null);
    },
  });

  const filteredTenants = (tenants || []).filter(
    (t: any) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return <div className="animate-pulse space-y-4 h-96 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenants')}
        subtitle="Manage company accounts"
        action={
          <Link href="/super-admin/tenants/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tCommon('create_new')}
            </Button>
          </Link>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={tCommon('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredTenants.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
          title="No tenants found"
          description="Create your first tenant to get started"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>{tCommon('status')}</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant: any) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>{tenant._count.users}</TableCell>
                  <TableCell>
                    <StatusBadge
                      value={tenant.isActive ? 'ACTIVE' : 'DISABLED'}
                      type="status"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setToggleId(tenant.id)}
                    >
                      {tenant.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!toggleId}
        onOpenChange={() => setToggleId(null)}
        title="Toggle Tenant Status"
        description="Are you sure you want to change this tenant's status?"
        confirmLabel={tCommon('confirm')}
        onConfirm={() => toggleId && toggleStatus.mutate(toggleId)}
        loading={toggleStatus.isPending}
      />
    </div>
  );
}
