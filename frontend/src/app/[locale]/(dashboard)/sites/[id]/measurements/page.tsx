'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getMbEntries,
  getMbStats,
  getBoqItems,
  createMbEntry,
  updateMbEntry,
  deleteMbEntry,
  getSite,
  mbKeys,
  boqKeys,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UNIT_LABELS, UNIT_DIMENSIONS, DIMENSION_LABELS, type BoqUnit } from '@/lib/finance-utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';

export default function MeasurementsPage() {
  const params = useParams();
  const siteId = params.id as string;
  const queryClient = useQueryClient();
  const td = useTranslations('sites.mb');
  const tc = useTranslations('common');

  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [filterBoqItem, setFilterBoqItem] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  const [form, setForm] = useState({
    boqItemId: '',
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    dim1: '',
    dim2: '',
    dim3: '',
    totalQuantity: '',
  });

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const { data: stats } = useQuery({
    queryKey: mbKeys.stats(siteId),
    queryFn: () => getMbStats(siteId),
  });

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: mbKeys.list(siteId, { boqItemId: filterBoqItem, startDate, endDate, page }),
    queryFn: () => getMbEntries(siteId, { boqItemId: filterBoqItem || undefined, startDate: startDate || undefined, endDate: endDate || undefined, page, limit: 50 }),
  });

  const { data: boqData } = useQuery({
    queryKey: boqKeys.list(siteId, { limit: 500 }),
    queryFn: () => getBoqItems(siteId, { limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createMbEntry(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: mbKeys.stats(siteId) });
      toast.success(td('entry_created'));
      setShowForm(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || td('entry_error'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMbEntry(siteId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: mbKeys.stats(siteId) });
      toast.success(td('entry_updated'));
      setShowForm(false);
      setEditingEntry(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || td('entry_error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMbEntry(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mbKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: mbKeys.stats(siteId) });
      toast.success(td('entry_deleted'));
    },
  });

  const resetForm = () => {
    setForm({
      boqItemId: '',
      entryDate: new Date().toISOString().split('T')[0],
      description: '',
      dim1: '',
      dim2: '',
      dim3: '',
      totalQuantity: '',
    });
  };

  const boqItems = boqData?.data || [];
  const entries = entriesData?.data || [];
  const pagination = entriesData?.pagination;

  const selectedBoqItem = boqItems.find((b: any) => b.id === form.boqItemId);
  const requiredDims = selectedBoqItem ? (UNIT_DIMENSIONS[selectedBoqItem.unit as BoqUnit] || 0) : 0;
  const dimensionFields = DIMENSION_LABELS[requiredDims] || [];

  const cumulativeQty = stats?.cumulativeByItem?.[form.boqItemId] || 0;
  const estimatedQty = selectedBoqItem ? Number(selectedBoqItem.estimatedQty) : 0;
  const newEntryQty = parseFloat(form.totalQuantity) || 0;
  const projectedTotal = cumulativeQty + newEntryQty;
  const isOverDelivery = estimatedQty > 0 && projectedTotal > estimatedQty;
  const overDeliveryPct = estimatedQty > 0 ? ((projectedTotal / estimatedQty) * 100 - 100) : 0;

  const handleDimChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    if (requiredDims > 0) {
      const d1 = parseFloat(updated.dim1) || 0;
      const d2 = requiredDims >= 2 ? (parseFloat(updated.dim2) || 0) : 1;
      const d3 = requiredDims >= 3 ? (parseFloat(updated.dim3) || 0) : 1;
      updated.totalQuantity = d1 > 0 && d2 > 0 && d3 > 0 ? String(d1 * d2 * d3) : '';
    }
    setForm(updated);
  };

  const handleSubmit = () => {
    if (!form.boqItemId || !form.entryDate || !form.description) {
      toast.error(td('validation_required'));
      return;
    }
    const payload: any = {
      boqItemId: form.boqItemId,
      entryDate: form.entryDate,
      description: form.description,
    };
    if (requiredDims > 0) {
      payload.dim1 = parseFloat(form.dim1) || 0;
      if (requiredDims >= 2) payload.dim2 = parseFloat(form.dim2) || 0;
      if (requiredDims >= 3) payload.dim3 = parseFloat(form.dim3) || 0;
    } else {
      payload.totalQuantity = parseFloat(form.totalQuantity) || 0;
    }
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setForm({
      boqItemId: entry.boqItemId,
      entryDate: entry.entryDate.split('T')[0],
      description: entry.description,
      dim1: entry.dim1 ? String(entry.dim1) : '',
      dim2: entry.dim2 ? String(entry.dim2) : '',
      dim3: entry.dim3 ? String(entry.dim3) : '',
      totalQuantity: String(entry.totalQuantity),
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/sites/${siteId}`} className="hover:text-foreground">{td('breadcrumb_sites')}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{td('title')}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{td('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{td('subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {td('new_entry')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_total')}</p>
          <p className="text-2xl font-bold">{stats?.totalEntries || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_today')}</p>
          <p className="text-2xl font-bold">{stats?.todayEntries || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_month')}</p>
          <p className="text-2xl font-bold">{stats?.monthEntries || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{td('stat_quantity')}</p>
          <p className="text-2xl font-bold">{Number(stats?.totalQuantityLogged || 0).toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingEntry ? td('edit_entry') : td('new_entry')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <SearchableSelect
                  label={td('field_boq_item')}
                  options={boqItems.map((item: any) => ({
                    id: item.id,
                    label: `${item.itemCode} - ${item.description}`,
                    sublabel: UNIT_LABELS[item.unit as BoqUnit] || item.unit,
                  }))}
                  value={form.boqItemId}
                  onChange={(v) => setForm({ ...form, boqItemId: v })}
                  placeholder={td('select_boq_item')}
                  required
                />
              </div>
              <div>
                <Label>{td('field_date')}</Label>
                <Input type="date" value={form.entryDate}
                  onChange={(e) => setForm({ ...form, entryDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>{td('field_description')}</Label>
                <Input placeholder={td('description_placeholder')} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
              </div>
            </div>

            {requiredDims > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dimensionFields.map((dim) => (
                  <div key={dim.key}>
                    <Label>{td(`dim_${dim.key}`)} ({dim.label})</Label>
                    <Input type="number" step="0.01" min="0"
                      value={form[dim.key as keyof typeof form] as string}
                      onChange={(e) => handleDimChange(dim.key, e.target.value)}
                      className="mt-1" />
                  </div>
                ))}
                <div>
                  <Label>{td('dim_total')} ({td('auto')})</Label>
                  <Input type="number" value={form.totalQuantity} readOnly className="mt-1 bg-muted" />
                </div>
              </div>
            )}

            {requiredDims === 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>{td('field_quantity')}</Label>
                  <Input type="number" step="0.01" min="0" value={form.totalQuantity}
                    onChange={(e) => setForm({ ...form, totalQuantity: e.target.value })} className="mt-1" />
                </div>
              </div>
            )}

            {isOverDelivery && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{td('over_delivery_warning')}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {td('over_delivery_detail', {
                      current: cumulativeQty.toLocaleString(),
                      adding: newEntryQty.toLocaleString(),
                      total: projectedTotal.toLocaleString(),
                      estimated: estimatedQty.toLocaleString(),
                      percent: overDeliveryPct.toFixed(1),
                    })}
                  </p>
                </div>
              </div>
            )}
            {!isOverDelivery && form.boqItemId && estimatedQty > 0 && newEntryQty > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <span className="text-green-800">
                  {td('delivery_progress', {
                    current: cumulativeQty.toLocaleString(),
                    adding: newEntryQty.toLocaleString(),
                    total: projectedTotal.toLocaleString(),
                    estimated: estimatedQty.toLocaleString(),
                    percent: ((projectedTotal / estimatedQty) * 100).toFixed(1),
                  })}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingEntry(null); resetForm(); }}>{td('cancel')}</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingEntry ? tc('save') : td('save_entry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">{td('entries_title')}</CardTitle>
          <div className="flex items-center gap-2">
            <SearchableSelect
              options={[{ id: '', label: td('all_boq_items') }, ...boqItems.map((item: any) => ({
                id: item.id,
                label: `${item.itemCode} - ${item.description}`,
              }))]}
              value={filterBoqItem}
              onChange={(v) => { setFilterBoqItem(v); setPage(1); }}
              placeholder={td('all_boq_items')}
            />
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-40" />
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-40" />
          </div>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{td('no_entries')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_date')}</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_boq_item')}</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_description')}</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_dim1')}</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_dim2')}</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_dim3')}</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_quantity')}</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_entered_by')}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: any) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">{new Date(entry.entryDate).toLocaleDateString()}</td>
                      <td className="py-3 px-2 font-mono text-xs">{entry.boqItem?.itemCode}</td>
                      <td className="py-3 px-2">{entry.description}</td>
                      <td className="py-3 px-2 text-right">{entry.dim1 ?? '—'}</td>
                      <td className="py-3 px-2 text-right">{entry.dim2 ?? '—'}</td>
                      <td className="py-3 px-2 text-right">{entry.dim3 ?? '—'}</td>
                      <td className="py-3 px-2 text-right font-medium">{Number(entry.totalQuantity).toLocaleString()}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{entry.enteredBy?.fullName}</td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700"
                            onClick={() => handleEdit(entry)}
                            aria-label={td('edit_entry')}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => { setDeleteTargetId(entry.id); setShowDeleteConfirm(true); }}
                            aria-label={td('entry_deleted')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {td('pagination', { page, totalPages: pagination.totalPages })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={td('delete_confirm')}
        description={td('delete_confirm')}
        confirmLabel={td('entry_deleted')}
        cancelLabel={td('cancel')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
            setShowDeleteConfirm(false);
            setDeleteTargetId(null);
          }
        }}
      />
    </div>
  );
}
