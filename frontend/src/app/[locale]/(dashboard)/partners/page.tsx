'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePartners } from '@/hooks/api/use-partners';
import api from '@/lib/api';
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Ban,
} from 'lucide-react';
import { TypeBadges } from '@/components/shared/type-badges';

export default function PartnersPage() {
  const t = useTranslations('partners.list');
  const t_status = useTranslations('partners.status');
  const t_risk = useTranslations('partners.risk');
  const t_types = useTranslations('partners.types');
  const t_common = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const statusConfig: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: t_status('active'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    INACTIVE: { label: t_status('inactive'), color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
    BLACKLISTED: { label: t_status('blacklisted'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    PROSPECT: { label: t_status('prospect'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    SUSPENDED: { label: t_status('suspended'), color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  };

  const riskConfig: Record<string, { label: string; color: string }> = {
    LOW: { label: t_risk('low'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    MEDIUM: { label: t_risk('medium'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    HIGH: { label: t_risk('high'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePartners({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    riskLevel: riskFilter !== 'all' ? riskFilter : undefined,
    ...(typeFilter === 'client' ? { isClient: 'true' } : {}),
    ...(typeFilter === 'supplier' ? { isSupplier: 'true' } : {}),
    ...(typeFilter === 'subcontractor' ? { isSubcontractor: 'true' } : {}),
    page,
    limit: 25,
  });

  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/partners/${id}/disable`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });

  const partners = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

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
        <Link href="/partners/new">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            {t('new_partner')}
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 h-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder={t('filter_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter_status_all')}</SelectItem>
                <SelectItem value="ACTIVE">{t_status('active')}</SelectItem>
                <SelectItem value="INACTIVE">{t_status('inactive')}</SelectItem>
                <SelectItem value="PROSPECT">{t_status('prospect')}</SelectItem>
                <SelectItem value="SUSPENDED">{t_status('suspended')}</SelectItem>
                <SelectItem value="BLACKLISTED">{t_status('blacklisted')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder={t('filter_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter_type_all')}</SelectItem>
                <SelectItem value="client">{t_types('client')}</SelectItem>
                <SelectItem value="supplier">{t_types('supplier')}</SelectItem>
                <SelectItem value="subcontractor">{t_types('subcontractor')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px] h-10">
                <SelectValue placeholder={t('filter_risk')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter_risk_all')}</SelectItem>
                <SelectItem value="LOW">{t_risk('low')}</SelectItem>
                <SelectItem value="MEDIUM">{t_risk('medium')}</SelectItem>
                <SelectItem value="HIGH">{t_risk('high')}</SelectItem>
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
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">{t('empty_title')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all' ? t('empty_filter_hint') : t('empty_create_hint')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table_code')}</TableHead>
                    <TableHead>{t('table_name')}</TableHead>
                    <TableHead>{t('table_type')}</TableHead>
                    <TableHead>{t('table_category')}</TableHead>
                    <TableHead>{t('table_status')}</TableHead>
                    <TableHead>{t('table_risk')}</TableHead>
                    <TableHead>{t('table_contact')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner: any) => {
                    const status = statusConfig[partner.status] || statusConfig.ACTIVE;
                    const risk = riskConfig[partner.riskLevel] || riskConfig.LOW;
                    return (
                      <TableRow
                        key={partner.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/partners/${partner.id}`)}
                      >
                        <TableCell className="font-mono text-sm">{partner.code}</TableCell>
                        <TableCell className="font-medium">{partner.name}</TableCell>
                        <TableCell>
                          <TypeBadges
                            isClient={partner.isClient}
                            isSupplier={partner.isSupplier}
                            isSubcontractor={partner.isSubcontractor}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{partner.category}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${risk.color}`}>
                            {risk.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {partner.phone || partner.email || '—'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/partners/${partner.id}/edit`)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t('actions_edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-orange-600"
                                onClick={() => {
                                  if (confirm(t('disable_confirm'))) {
                                    disableMutation.mutate(partner.id);
                                  }
                                }}
                              >
                                <Ban className="h-4 w-4 mr-2" />
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
            Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} partners
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
