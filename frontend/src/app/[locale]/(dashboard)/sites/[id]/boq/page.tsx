'use client';

import { useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getBoqItems,
  getBoqStats,
  downloadBoqTemplate,
  importBoqFile,
  approveBaseline,
  deleteBoqItem,
  createBoqItem,
  updateBoqItem,
  getBoqSections,
  createBoqSection,
  deleteBoqSection,
  getSite,
  exportBoq,
  downloadBoqPdf,
  boqKeys,
  boqSectionKeys,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Download,
  Upload,
  Loader2,
  Search,
  CheckCircle,
  Lock,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  FolderOpen,
  GripVertical,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UNIT_LABELS, formatCurrency, type BoqUnit } from '@/lib/finance-utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { BOQ_UNITS } from '@/lib/finance-utils';

export default function BoqPage() {
  const params = useParams();
  const siteId = params.id as string;
  const queryClient = useQueryClient();
  const td = useTranslations('sites.boq');
  const ts = useTranslations('sites.status');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showBaselineConfirm, setShowBaselineConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterSection, setFilterSection] = useState<string>('');

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    itemCode: '',
    description: '',
    unit: 'm3' as string,
    estimatedQty: '',
    unitRate: '',
    sectionId: '',
  });

  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState({ code: '', name: '' });
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [showDeleteSectionConfirm, setShowDeleteSectionConfirm] = useState(false);

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const { data: stats } = useQuery({
    queryKey: boqKeys.stats(siteId),
    queryFn: () => getBoqStats(siteId),
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: boqKeys.list(siteId, { search, page, sectionId: filterSection }),
    queryFn: () => getBoqItems(siteId, { search, page, limit: 50, sectionId: filterSection || undefined }),
  });

  const { data: sections } = useQuery({
    queryKey: boqSectionKeys.list(siteId),
    queryFn: () => getBoqSections(siteId),
  });

  const currencyCode = site?.currencyCode || 'USD';
  const isBaselined = stats?.isBaselined;
  const displayValue = isBaselined ? (stats?.totalContractValue || 0) : (stats?.totalDraftValue || 0);

  const importMutation = useMutation({
    mutationFn: (file: File) => importBoqFile(siteId, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: boqKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.stats(siteId) });
      toast.success(td('import_success', { count: data.imported }));
      setUploading(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || td('import_error'));
      setUploading(false);
    },
  });

  const baselineMutation = useMutation({
    mutationFn: () => approveBaseline(siteId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: boqKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.stats(siteId) });
      toast.success(td('baseline_success', { count: data.itemCount }));
      setShowBaselineConfirm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || td('baseline_error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBoqItem(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.stats(siteId) });
      toast.success(td('item_deleted'));
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: any) => createBoqItem(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.stats(siteId) });
      toast.success(td('item_created'));
      setShowItemForm(false);
      resetItemForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || td('create_error'));
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBoqItem(siteId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.stats(siteId) });
      toast.success(td('item_updated'));
      setShowItemForm(false);
      resetItemForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || td('update_error'));
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: (data: any) => createBoqSection(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqSectionKeys.list(siteId) });
      toast.success(td('section_created'));
      setShowSectionForm(false);
      setSectionForm({ code: '', name: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || td('section_create_error'));
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => deleteBoqSection(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boqSectionKeys.list(siteId) });
      queryClient.invalidateQueries({ queryKey: boqKeys.list(siteId) });
      toast.success(td('section_deleted'));
      setShowDeleteSectionConfirm(false);
      setDeleteSectionId(null);
    },
  });

  const resetItemForm = () => {
    setItemForm({ itemCode: '', description: '', unit: 'm3', estimatedQty: '', unitRate: '', sectionId: '' });
    setEditingItem(null);
  };

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({
      itemCode: item.itemCode,
      description: item.description,
      unit: item.unit,
      estimatedQty: String(Number(item.estimatedQty)),
      unitRate: String(Number(item.unitRate)),
      sectionId: item.sectionId || '',
    });
    setShowItemForm(true);
  };

  const handleSubmitItem = () => {
    if (!itemForm.itemCode || !itemForm.description || !itemForm.estimatedQty || !itemForm.unitRate) {
      toast.error(td('validation_required'));
      return;
    }
    const payload = {
      itemCode: itemForm.itemCode,
      description: itemForm.description,
      unit: itemForm.unit,
      estimatedQty: parseFloat(itemForm.estimatedQty),
      unitRate: parseFloat(itemForm.unitRate),
      sectionId: itemForm.sectionId || undefined,
    };
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createItemMutation.mutate(payload);
    }
  };

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      importMutation.mutate(file);
      e.target.value = '';
    },
    [importMutation],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      setUploading(true);
      importMutation.mutate(file);
    },
    [importMutation],
  );

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadBoqTemplate(siteId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'boq-template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(td('template_download_error'));
    }
  };

  const handleExportBoq = async () => {
    try {
      const blob = await exportBoq(siteId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `boq-export-${siteId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(td('export_error'));
    }
  };

  const allItems = itemsData?.data || [];
  const items = filterSection
    ? allItems.filter((item: any) => item.sectionId === filterSection)
    : allItems;
  const unsectionedItems = allItems.filter((item: any) => !item.sectionId);
  const pagination = itemsData?.pagination;

  const sectionList = (sections || []) as any[];

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
        <div className="flex gap-2">
          {!isBaselined && (
            <>
              <Button variant="outline" onClick={() => { resetItemForm(); setShowItemForm(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {td('add_item')}
              </Button>
              <Button variant="outline" onClick={() => setShowSectionForm(true)}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {td('add_section')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{td('stat_total_items')}</p>
            <p className="text-2xl font-bold">{stats?.totalItems || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{td('stat_baselined')}</p>
            <p className="text-2xl font-bold">{stats?.baselineItems || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{isBaselined ? td('stat_contract_value') : td('stat_draft_value')}</p>
            <p className="text-2xl font-bold">{formatCurrency(displayValue, currencyCode)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{td('stat_status')}</p>
            <p className={`text-lg font-bold ${isBaselined ? 'text-green-600' : 'text-amber-600'}`}>
              {isBaselined ? td('status_baselined') : td('status_draft')}
            </p>
          </CardContent>
        </Card>
      </div>

      {!isBaselined && allItems.length === 0 && (
        <Card
          className="border-dashed border-2 cursor-pointer hover:border-blue-400 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            {uploading ? (
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            )}
            <p className="font-medium">{td('upload_title')}</p>
            <p className="text-sm text-muted-foreground mt-1">{td('upload_subtitle')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.xlsm"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}>
                <Download className="h-4 w-4 mr-2" />
                {td('download_template')}
              </Button>
              {allItems.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleExportBoq(); }}>
                    <Download className="h-4 w-4 mr-2" />
                    {td('export_boq')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const blob = await downloadBoqPdf(siteId);
                      const url = window.URL.createObjectURL(new Blob([blob]));
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `boq-${siteId}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch { toast.error('PDF export failed'); }
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    {td('export_pdf', { defaultValue: 'Export PDF' })}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {allItems.length > 0 && (
        <div className="flex gap-6">
          {sectionList.length > 0 && (
            <div className="w-56 shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{td('sections')}</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!filterSection ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-muted'}`}
                    onClick={() => setFilterSection('')}
                  >
                    {td('all_items')} ({unsectionedItems.length})
                  </button>
                  {sectionList.map((section: any) => {
                    const count = allItems.filter((i: any) => i.sectionId === section.id).length;
                    return (
                      <div key={section.id} className="group flex items-center justify-between">
                        <button
                          className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterSection === section.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-muted'}`}
                          onClick={() => setFilterSection(section.id)}
                        >
                          {section.code} - {section.name} ({count})
                        </button>
                        {!isBaselined && (
                          <button
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"
                            onClick={() => { setDeleteSectionId(section.id); setShowDeleteSectionConfirm(true); }}
                            aria-label={td('delete_section')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">
                  {filterSection
                    ? sectionList.find((s: any) => s.id === filterSection)?.name || td('items_title')
                    : td('items_title')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={td('search_placeholder')}
                      className="pl-9 w-64"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                  {allItems.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleExportBoq}>
                      <Download className="h-4 w-4 mr-2" />
                      {td('export')}
                    </Button>
                  )}
                  {!isBaselined && (
                    <Button onClick={() => setShowBaselineConfirm(true)}>
                      <Lock className="h-4 w-4 mr-2" />
                      {td('approve_baseline')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground w-8"></th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_item_code')}</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_description')}</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">{td('col_unit')}</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_est_qty')}</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_unit_rate')}</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">{td('col_total_amount')}</th>
                        {!isBaselined && <th className="text-center py-3 px-2 font-medium text-muted-foreground w-20"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 text-muted-foreground">
                            <GripVertical className="h-3.5 w-3.5" />
                          </td>
                          <td className="py-3 px-2 font-mono text-xs">{item.itemCode}</td>
                          <td className="py-3 px-2">{item.description}</td>
                          <td className="py-3 px-2">{UNIT_LABELS[item.unit as BoqUnit] || item.unit}</td>
                          <td className="py-3 px-2 text-right">{Number(item.estimatedQty).toLocaleString()}</td>
                          <td className="py-3 px-2 text-right">{formatCurrency(Number(item.unitRate), currencyCode)}</td>
                          <td className="py-3 px-2 text-right font-medium">{formatCurrency(Number(item.totalAmount), currencyCode)}</td>
                          {!isBaselined && (
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => openEditItem(item)}
                                  aria-label={td('edit_item')}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => { setDeleteTargetId(item.id); setShowDeleteConfirm(true); }}
                                  aria-label={td('delete_item')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={6} className="py-3 px-2 text-right">{td('total_value')}:</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(displayValue, currencyCode)}</td>
                        {!isBaselined && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {td('pagination', { from: (page - 1) * 50 + 1, to: Math.min(page * 50, pagination.total), total: pagination.total })}
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
          </div>
        </div>
      )}

      {/* Baseline Confirm */}
      {showBaselineConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                {td('baseline_confirm_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{td('baseline_confirm_text')}</p>
              <p className="text-sm font-medium">
                {td('baseline_summary', { count: allItems.length, total: formatCurrency(displayValue, currencyCode) })}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBaselineConfirm(false)}>{td('cancel')}</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => baselineMutation.mutate()}
                  disabled={baselineMutation.isPending}
                >
                  {baselineMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {td('confirm_baseline')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Item Create/Edit Form */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{editingItem ? td('edit_item') : td('add_item')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{td('col_item_code')}</Label>
                  <Input
                    value={itemForm.itemCode}
                    onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })}
                    disabled={!!editingItem}
                    placeholder={td('item_code_placeholder')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{td('col_unit')}</Label>
                  <SearchableSelect
                    options={BOQ_UNITS.map((u) => ({ id: u, label: UNIT_LABELS[u as BoqUnit] || u }))}
                    value={itemForm.unit}
                    onChange={(v) => setItemForm({ ...itemForm, unit: v })}
                  />
                </div>
              </div>
              <div>
                <Label>{td('col_description')}</Label>
                <Input
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder={td('col_description')}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{td('col_est_qty')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.estimatedQty}
                    onChange={(e) => setItemForm({ ...itemForm, estimatedQty: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{td('col_unit_rate')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.unitRate}
                    onChange={(e) => setItemForm({ ...itemForm, unitRate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              {sectionList.length > 0 && (
                <div>
                  <Label>{td('section')}</Label>
                  <SearchableSelect
                    options={[{ id: '', label: td('no_section') }, ...sectionList.map((s: any) => ({ id: s.id, label: `${s.code} - ${s.name}` }))]}
                    value={itemForm.sectionId}
                    onChange={(v) => setItemForm({ ...itemForm, sectionId: v })}
                  />
                </div>
              )}
              {itemForm.estimatedQty && itemForm.unitRate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{td('total_value')}:</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(parseFloat(itemForm.estimatedQty) * parseFloat(itemForm.unitRate), currencyCode)}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowItemForm(false); resetItemForm(); }}>{td('cancel')}</Button>
                <Button
                  onClick={handleSubmitItem}
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                >
                  {(createItemMutation.isPending || updateItemMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingItem ? td('save_changes') : td('add_item')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section Create Form */}
      {showSectionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{td('add_section')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{td('section_code')}</Label>
                <Input
                  value={sectionForm.code}
                  onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
                  placeholder={td('section_code_placeholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{td('section_name')}</Label>
                <Input
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                  placeholder={td('section_name_placeholder')}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowSectionForm(false); setSectionForm({ code: '', name: '' }); }}>{td('cancel')}</Button>
                <Button
                  onClick={() => {
                    if (!sectionForm.code || !sectionForm.name) {
                      toast.error(td('validation_required'));
                      return;
                    }
                    createSectionMutation.mutate(sectionForm);
                  }}
                  disabled={createSectionMutation.isPending}
                >
                  {createSectionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {td('add_section')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Item Confirm */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={td('delete_confirm')}
        description={td('delete_confirm')}
        confirmLabel={td('item_deleted')}
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

      {/* Delete Section Confirm */}
      <ConfirmationDialog
        open={showDeleteSectionConfirm}
        onOpenChange={setShowDeleteSectionConfirm}
        title={td('delete_section')}
        description={td('delete_section_confirm')}
        confirmLabel={td('section_deleted')}
        cancelLabel={td('cancel')}
        variant="destructive"
        loading={deleteSectionMutation.isPending}
        onConfirm={() => {
          if (deleteSectionId) {
            deleteSectionMutation.mutate(deleteSectionId);
          }
        }}
      />
    </div>
  );
}
