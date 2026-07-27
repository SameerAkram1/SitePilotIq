'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getSites, getProjects, disableSite } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react';

const statusConfig: Record<string, { color: string; icon: any }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock },
  ACTIVE: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  COMPLETED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  DISABLED: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function SitesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('sites.list');
  const ts = useTranslations('sites.status');
  const tc = useTranslations('common');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [disableTargetId, setDisableTargetId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sites', { search, statusFilter, projectFilter, page }],
    queryFn: () =>
      getSites({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        projectId: projectFilter !== 'all' ? projectFilter : undefined,
        page,
        limit: 25,
      }),
  });

  const { data: projects } = useQuery({
    queryKey: ['projectsList'],
    queryFn: () => getProjects({ limit: 100 }),
  });

  const disableMutation = useMutation({
    mutationFn: disableSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });

  const sites = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const projectList = projects?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/sites/new">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            {t('new_site')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_placeholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-10"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder={tc('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter_status_all')}</SelectItem>
                <SelectItem value="DRAFT">{ts('draft')}</SelectItem>
                <SelectItem value="ACTIVE">{ts('active')}</SelectItem>
                <SelectItem value="COMPLETED">{ts('completed')}</SelectItem>
                <SelectItem value="DISABLED">{ts('disabled')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={projectFilter}
              onValueChange={(v) => {
                setProjectFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder={t('filter_project')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter_project_all')}</SelectItem>
                {projectList.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">{t('empty_title')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all'
                  ? t('empty_filter_hint')
                  : t('empty_create_hint')}
              </p>
              {!search && statusFilter === 'all' && (
                <Link href="/sites/new" className="mt-4">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('new_site')}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table_code')}</TableHead>
                    <TableHead>{t('table_name')}</TableHead>
                    <TableHead>{t('table_project')}</TableHead>
                    <TableHead>{t('table_site_manager')}</TableHead>
                    <TableHead>{t('table_status')}</TableHead>
                    <TableHead>{t('table_created')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site: any) => {
                    const status = statusConfig[site.status] || statusConfig.DRAFT;
                    const StatusIcon = status.icon;

                    return (
                      <TableRow
                        key={site.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/sites/${site.id}`)}
                      >
                        <TableCell className="font-mono text-sm">{site.code}</TableCell>
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {site.project?.code} - {site.project?.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              {site.siteManager?.fullName?.charAt(0)}
                            </div>
                            <span className="text-sm">{site.siteManager?.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {ts((site.status || 'DRAFT').toLowerCase())}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(site.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/sites/${site.id}`)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                {t('actions_view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/sites/${site.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t('actions_edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDisableTargetId(site.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('actions_disable')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc('showing_to_of', { from: (page - 1) * 25 + 1, to: Math.min(page * 25, total), total, items: tc('sites').toLowerCase() })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {tc('previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {tc('page_of', { page, totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {tc('next')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!disableTargetId}
        onOpenChange={(open) => { if (!open) setDisableTargetId(null); }}
        title={t('disable_confirm')}
        description={t('disable_confirm')}
        confirmLabel={tc('confirm')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        loading={disableMutation.isPending}
        onConfirm={() => {
          if (disableTargetId) {
            disableMutation.mutate(disableTargetId);
            setDisableTargetId(null);
          }
        }}
      />
    </div>
  );
}
