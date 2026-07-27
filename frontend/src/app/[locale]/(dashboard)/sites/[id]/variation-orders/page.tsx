'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getVariationOrders,
  getVariationOrder,
  createVariationOrder,
  submitVariationOrder,
  approveVariationOrder,
  rejectVariationOrder,
  updateVariationOrder,
  deleteVariationOrder,
  getBoqItems,
  getSite,
  voKeys,
  boqKeys,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UNIT_LABELS, formatCurrency, BOQ_UNITS, type BoqUnit } from '@/lib/finance-utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';

const VO_STATUS_CONFIG: Record<string, { key: string; color: string }> = {
  DRAFT: { key: 'status_draft', color: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { key: 'status_submitted', color: 'bg-blue-100 text-blue-700' },
  APPROVED: { key: 'status_approved', color: 'bg-green-100 text-green-700' },
  REJECTED: { key: 'status_rejected', color: 'bg-red-100 text-red-700' },
};

export default function VariationOrdersPage() {
  const params = useParams();
  const siteId = params.id as string;
  const queryClient = useQueryClient();
  const td = useTranslations('sites.vo');

  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
  });
  const [voItems, setVoItems] = useState<Array<{
    action: 'ADD' | 'MODIFY';
    boqItemId?: string;
    itemCode: string;
    description: string;
    unit: string;
    estimatedQty: number;
    unitRate: number;
  }>>([]);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const currencyCode = site?.currencyCode || 'USD';

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: voKeys.list(siteId),
    queryFn: () => getVariationOrders(siteId),
  });

  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: voKeys.detail(siteId, selectedId || ''),
    queryFn: () => getVariationOrder(siteId, selectedId!),
    enabled: !!selectedId,
  });

  const { data: boqData } = useQuery({
    queryKey: boqKeys.list(siteId, { limit: 500 }),
    queryFn: () => getBoqItems(siteId, { limit: 500 }),
    enabled: view === 'create' || !!editingId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createVariationOrder(siteId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: voKeys.list(siteId) });
      setSelectedId(data.id);
      setView('detail');
      toast.success(td('created'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('create_error')),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitVariationOrder(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: voKeys.list(siteId) });
      toast.success(td('submitted'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('submit_error')),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveVariationOrder(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: voKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.stats(siteId) });
      toast.success(td('approved'));
      setShowApproveConfirm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('approve_error')),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectVariationOrder(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voKeys.detail(siteId, selectedId || '') });
      queryClient.invalidateQueries({ queryKey: voKeys.list(siteId) });
      toast.success(td('rejected'));
      setShowRejectConfirm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('reject_error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVariationOrder(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voKeys.list(siteId) });
      toast.success(td('deleted'));
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      if (view === 'detail') {
        setView('list');
        setSelectedId(null);
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('delete_error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateVariationOrder(siteId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: voKeys.detail(siteId, editingId || '') });
      toast.success(td('updated'));
      setEditingId(null);
      setVoItems([]);
      setCreateForm({ title: '', description: '' });
      setView('list');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('update_error')),
  });

  const boqItems = (boqData?.data || []) as any[];
  const records = (recordsData?.data || []) as any[];

  const addVoItem = (action: 'ADD' | 'MODIFY') => {
    if (action === 'ADD') {
      setVoItems([...voItems, {
        action: 'ADD',
        itemCode: '',
        description: '',
        unit: 'm3',
        estimatedQty: 0,
        unitRate: 0,
      }]);
    } else {
      setVoItems([...voItems, {
        action: 'MODIFY',
        boqItemId: '',
        itemCode: '',
        description: '',
        unit: 'm3',
        estimatedQty: 0,
        unitRate: 0,
      }]);
    }
  };

  const updateVoItem = (index: number, field: string, value: any) => {
    const updated = [...voItems];
    (updated[index] as any)[field] = value;
    if (field === 'boqItemId' && value) {
      const boqItem = boqItems.find((b: any) => b.id === value);
      if (boqItem) {
        updated[index].itemCode = boqItem.itemCode;
        updated[index].description = boqItem.description;
        updated[index].unit = boqItem.unit;
        updated[index].estimatedQty = Number(boqItem.estimatedQty);
        updated[index].unitRate = Number(boqItem.unitRate);
      }
    }
    setVoItems(updated);
  };

  const removeVoItem = (index: number) => {
    setVoItems(voItems.filter((_, i) => i !== index));
  };

  const totalValue = voItems.reduce((sum, item) => sum + item.estimatedQty * item.unitRate, 0);

  if (view === 'create' || editingId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/sites/${siteId}`} className="hover:text-foreground">{td('breadcrumb_sites')}</Link>
          <span>/</span>
          <button onClick={() => setView('list')} className="hover:text-foreground">{td('breadcrumb_vo')}</button>
          <span>/</span>
          <span className="text-foreground font-medium">{editingId ? td('edit') : td('breadcrumb_new')}</span>
        </div>
        <Card className="max-w-3xl">
          <CardHeader><CardTitle>{editingId ? td('edit') : td('create_title')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{td('field_title')}</Label>
              <Input value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder={td('title_placeholder')}
                className="mt-1" />
            </div>
            <div>
              <Label>{td('field_description')}</Label>
              <Input value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder={td('description_placeholder')}
                className="mt-1" />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-medium">{td('items')}</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addVoItem('ADD')}>
                  <Plus className="h-4 w-4 mr-1" /> {td('add_new_item')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => addVoItem('MODIFY')}>
                  <Plus className="h-4 w-4 mr-1" /> {td('modify_existing')}
                </Button>
              </div>
            </div>

            {voItems.map((item, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.action === 'ADD' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.action === 'ADD' ? td('action_add') : td('action_modify')}
                  </span>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeVoItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {item.action === 'MODIFY' && (
                    <div className="col-span-2">
                      <Label>{td('select_boq_item')}</Label>
                      <SearchableSelect
                        options={boqItems.map((b: any) => ({ id: b.id, label: `${b.itemCode} - ${b.description}` }))}
                        value={item.boqItemId || ''}
                        onChange={(v) => updateVoItem(idx, 'boqItemId', v)}
                      />
                    </div>
                  )}
                  {item.action === 'ADD' && (
                    <div>
                      <Label>{td('col_item_code')}</Label>
                      <Input value={item.itemCode} onChange={(e) => updateVoItem(idx, 'itemCode', e.target.value)} className="mt-1" />
                    </div>
                  )}
                  <div>
                    <Label>{td('col_unit')}</Label>
                    <SearchableSelect
                      options={BOQ_UNITS.map((u) => ({ id: u, label: UNIT_LABELS[u as BoqUnit] || u }))}
                      value={item.unit}
                      onChange={(v) => updateVoItem(idx, 'unit', v)}
                    />
                  </div>
                  {item.action === 'ADD' && (
                    <div className="col-span-2">
                      <Label>{td('col_description')}</Label>
                      <Input value={item.description} onChange={(e) => updateVoItem(idx, 'description', e.target.value)} className="mt-1" />
                    </div>
                  )}
                  <div>
                    <Label>{td('col_est_qty')}</Label>
                    <Input type="number" step="0.01" value={item.estimatedQty}
                      onChange={(e) => updateVoItem(idx, 'estimatedQty', parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                  <div>
                    <Label>{td('col_unit_rate')}</Label>
                    <Input type="number" step="0.01" value={item.unitRate}
                      onChange={(e) => updateVoItem(idx, 'unitRate', parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
              </Card>
            ))}

            {voItems.length > 0 && (
              <div className="p-3 bg-muted rounded-lg text-right">
                <span className="text-sm text-muted-foreground">{td('total_value')}: </span>
                <span className="text-lg font-bold">{formatCurrency(totalValue, currencyCode)}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setView('list'); setVoItems([]); setCreateForm({ title: '', description: '' }); setEditingId(null); }}>{td('cancel')}</Button>
              <Button
                onClick={() => {
                  if (!createForm.title || voItems.length === 0) {
                    toast.error(td('validation_required'));
                    return;
                  }
                  if (editingId) {
                    updateMutation.mutate({ id: editingId, data: { ...createForm, items: voItems } });
                  } else {
                    createMutation.mutate({ ...createForm, items: voItems });
                  }
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? td('save_changes') : td('create_button')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'detail' && record) {
    const voItems = (record.variationOrderItems || []) as any[];
    const totalValue = voItems.reduce((sum: number, item: any) => sum + Number(item.totalAmount), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/sites/${siteId}`} className="hover:text-foreground">{td('breadcrumb_sites')}</Link>
          <span>/</span>
          <button onClick={() => { setView('list'); setSelectedId(null); }} className="hover:text-foreground">{td('breadcrumb_vo')}</button>
          <span>/</span>
          <span className="text-foreground font-medium">VO-{String(record.voNumber).padStart(2, '0')}</span>
          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VO_STATUS_CONFIG[record.status]?.color || ''}`}>
            {td(VO_STATUS_CONFIG[record.status]?.key) || record.status}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">VO-{String(record.voNumber).padStart(2, '0')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{record.title}</p>
          </div>
          <div className="flex gap-2">
            {record.status === 'DRAFT' && (
              <Button onClick={() => submitMutation.mutate(record.id)} disabled={submitMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {td('submit')}
              </Button>
            )}
            {record.status === 'SUBMITTED' && (
              <>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowApproveConfirm(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {td('approve')}
                </Button>
                <Button variant="destructive" onClick={() => setShowRejectConfirm(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  {td('reject')}
                </Button>
              </>
            )}
          </div>
        </div>

        {record.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{record.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium">{td('col_action')}</th>
                    <th className="text-left py-2 px-3 font-medium">{td('col_item_code')}</th>
                    <th className="text-left py-2 px-3 font-medium">{td('col_description')}</th>
                    <th className="text-left py-2 px-3 font-medium">{td('col_unit')}</th>
                    <th className="text-right py-2 px-3 font-medium">{td('col_est_qty')}</th>
                    <th className="text-right py-2 px-3 font-medium">{td('col_unit_rate')}</th>
                    <th className="text-right py-2 px-3 font-medium">{td('col_total_amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {voItems.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.action === 'ADD' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">{item.itemCode}</td>
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="py-2 px-3">{UNIT_LABELS[item.unit as BoqUnit] || item.unit}</td>
                      <td className="py-2 px-3 text-right">{Number(item.estimatedQty).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(Number(item.unitRate), currencyCode)}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(Number(item.totalAmount), currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={6} className="py-3 px-3 text-right">{td('total_value')}:</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(totalValue, currencyCode)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <span>{td('created_by')}: </span>
            <span className="text-foreground">{record.createdBy?.fullName}</span>
          </div>
          <div>
            <span>{td('created_at')}: </span>
            <span className="text-foreground">{new Date(record.createdAt).toLocaleDateString()}</span>
          </div>
          {record.approvedBy && (
            <div>
              <span>{td('approved_by')}: </span>
              <span className="text-foreground">{record.approvedBy.fullName}</span>
            </div>
          )}
          {record.approvedAt && (
            <div>
              <span>{td('approved_at')}: </span>
              <span className="text-foreground">{new Date(record.approvedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <ConfirmationDialog
          open={showApproveConfirm}
          onOpenChange={setShowApproveConfirm}
          title={td('approve_confirm_title')}
          description={td('approve_confirm_text')}
          confirmLabel={td('approve')}
          cancelLabel={td('cancel')}
          variant="default"
          loading={approveMutation.isPending}
          onConfirm={() => approveMutation.mutate(record.id)}
        />
        <ConfirmationDialog
          open={showRejectConfirm}
          onOpenChange={setShowRejectConfirm}
          title={td('reject_confirm_title')}
          description={td('reject_confirm_text')}
          confirmLabel={td('reject')}
          cancelLabel={td('cancel')}
          variant="destructive"
          loading={rejectMutation.isPending}
          onConfirm={() => rejectMutation.mutate(record.id)}
        />
      </div>
    );
  }

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
        <Button onClick={() => { setVoItems([]); setCreateForm({ title: '', description: '' }); setView('create'); }}>
          <Plus className="h-4 w-4 mr-2" />
          {td('create_new')}
        </Button>
      </div>

      <Card>
        <CardContent>
          {recordsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{td('no_records')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">{td('col_number')}</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">{td('col_title')}</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">{td('col_status')}</th>
                    <th className="text-center py-3 px-3 font-medium text-muted-foreground">{td('col_items')}</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">{td('col_created_by')}</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">{td('col_created_at')}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec: any) => (
                    <tr key={rec.id} className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => { setSelectedId(rec.id); setView('detail'); }}>
                      <td className="py-3 px-3 font-mono font-medium">VO-{String(rec.voNumber).padStart(2, '0')}</td>
                      <td className="py-3 px-3">{rec.title}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VO_STATUS_CONFIG[rec.status]?.color || ''}`}>
                          {td(VO_STATUS_CONFIG[rec.status]?.key) || rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">{rec._count?.variationOrderItems || 0}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{rec.createdBy?.fullName}</td>
                      <td className="py-3 px-3 text-xs">{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3">
                        {rec.status === 'DRAFT' ? (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(rec.id);
                                setSelectedId(rec.id);
                                setCreateForm({ title: rec.title, description: rec.description || '' });
                                setVoItems((rec.variationOrderItems || []).map((item: any) => ({
                                  action: item.action,
                                  boqItemId: item.boqItemId || undefined,
                                  itemCode: item.itemCode,
                                  description: item.description,
                                  unit: item.unit,
                                  estimatedQty: Number(item.estimatedQty),
                                  unitRate: Number(item.unitRate),
                                })));
                              }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={(e) => { e.stopPropagation(); setDeleteTargetId(rec.id); setShowDeleteConfirm(true); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={td('delete_confirm_title')}
        description={td('delete_confirm_text')}
        confirmLabel={td('delete')}
        cancelLabel={td('cancel')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
          }
        }}
      />
    </div>
  );
}
