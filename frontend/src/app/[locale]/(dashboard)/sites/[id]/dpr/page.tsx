'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getDprList, getDpr, createDpr, updateDpr, deleteDpr, getSite, downloadDprPdf } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Calendar,
  FileText,
  Cloud,
  Users,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = {
  reportDate: new Date().toISOString().slice(0, 10),
  title: '',
  narrative: '',
  weather: '',
  temperature: '',
  workersOnSite: 0,
  equipmentOnSite: '',
  workCompleted: '',
  workPlanned: '',
  issuesRisks: '',
};

export default function DprPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('sites.dpr');
  const tc = useTranslations('common');
  const siteId = params.id as string;

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['dpr', siteId, page],
    queryFn: () => getDprList(siteId, { page, limit: 15 }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['dpr', siteId, selectedId],
    queryFn: () => getDpr(siteId, selectedId!),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createDpr(siteId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dpr', siteId] });
      setSelectedId(data.id);
      setView('detail');
      toast.success(t('created'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('create_error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDpr(siteId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpr', siteId] });
      setEditingId(null);
      toast.success(t('updated'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('update_error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDpr(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dpr', siteId] });
      toast.success(t('deleted'));
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      if (view === 'detail') {
        setView('list');
        setSelectedId(null);
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('delete_error')),
  });

  const reports = listData?.data || [];
  const pagination = listData?.pagination;

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (report: any) => {
    setForm({
      reportDate: new Date(report.reportDate).toISOString().slice(0, 10),
      title: report.title,
      narrative: report.narrative,
      weather: report.weather || '',
      temperature: report.temperature || '',
      workersOnSite: report.workersOnSite || 0,
      equipmentOnSite: report.equipmentOnSite || '',
      workCompleted: report.workCompleted,
      workPlanned: report.workPlanned,
      issuesRisks: report.issuesRisks || '',
    });
    setEditingId(report.id);
    setView('create');
  };

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/sites/${siteId}`} className="hover:text-foreground">{tc('sites')}</Link>
          <span>/</span>
          <button onClick={() => { setView('list'); setEditingId(null); }} className="hover:text-foreground">{t('title')}</button>
          <span>/</span>
          <span className="text-foreground font-medium">{editingId ? tc('edit') : tc('create')}</span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); setEditingId(null); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{editingId ? t('edit_report') : t('new_report')}</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('report_date')}</Label>
                <Input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} />
              </div>
              <div>
                <Label>{t('title')}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('title_placeholder')} />
              </div>
            </div>

            <div>
              <Label>{t('narrative')}</Label>
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={form.narrative}
                onChange={(e) => setForm({ ...form, narrative: e.target.value })}
                placeholder={t('narrative_placeholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{t('weather')}</Label>
                <Input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} placeholder={t('weather_placeholder')} />
              </div>
              <div>
                <Label>{t('temperature')}</Label>
                <Input value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} placeholder={t('temperature_placeholder')} />
              </div>
              <div>
                <Label>{t('workers_on_site')}</Label>
                <Input type="number" min="0" value={form.workersOnSite} onChange={(e) => setForm({ ...form, workersOnSite: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label>{t('equipment_on_site')}</Label>
              <Input value={form.equipmentOnSite} onChange={(e) => setForm({ ...form, equipmentOnSite: e.target.value })} placeholder={t('equipment_placeholder')} />
            </div>

            <div>
              <Label>{t('work_completed')}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={form.workCompleted}
                onChange={(e) => setForm({ ...form, workCompleted: e.target.value })}
                placeholder={t('work_completed_placeholder')}
              />
            </div>

            <div>
              <Label>{t('work_planned')}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={form.workPlanned}
                onChange={(e) => setForm({ ...form, workPlanned: e.target.value })}
                placeholder={t('work_planned_placeholder')}
              />
            </div>

            <div>
              <Label>{t('issues_risks')}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={form.issuesRisks}
                onChange={(e) => setForm({ ...form, issuesRisks: e.target.value })}
                placeholder={t('issues_risks_placeholder')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setView('list'); setEditingId(null); }}>{tc('cancel')}</Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.title.trim() || !form.narrative.trim() || !form.workCompleted.trim() || !form.workPlanned.trim() || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? tc('save') : tc('create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'detail' && detail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/sites/${siteId}`} className="hover:text-foreground">{tc('sites')}</Link>
          <span>/</span>
          <button onClick={() => setView('list')} className="hover:text-foreground">{t('title')}</button>
          <span>/</span>
          <span className="text-foreground font-medium">{detail.title}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setView('list')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{detail.title}</h1>
              <p className="text-muted-foreground text-sm">{new Date(detail.reportDate).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const blob = await downloadDprPdf(siteId, detail.id);
                const url = window.URL.createObjectURL(new Blob([blob]));
                const a = document.createElement('a');
                a.href = url;
                a.download = `dpr-${detail.id}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch { toast.error('PDF export failed'); }
            }}>
              <Download className="h-4 w-4 mr-2" />Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => startEdit(detail)}>
              <Pencil className="h-4 w-4 mr-2" />{tc('edit')}
            </Button>
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => { setDeleteTargetId(detail.id); setShowDeleteConfirm(true); }}>
              <Trash2 className="h-4 w-4 mr-2" />{tc('delete')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Cloud className="h-5 w-5 text-blue-500" /><div><p className="text-xs text-muted-foreground">{t('weather')}</p><p className="font-medium">{detail.weather || '—'}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Cloud className="h-5 w-5 text-orange-500" /><div><p className="text-xs text-muted-foreground">{t('temperature')}</p><p className="font-medium">{detail.temperature || '—'}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-green-500" /><div><p className="text-xs text-muted-foreground">{t('workers_on_site')}</p><p className="font-medium">{detail.workersOnSite}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-violet-500" /><div><p className="text-xs text-muted-foreground">{t('photos')}</p><p className="font-medium">{detail.photos?.length || 0}</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('narrative')}</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{detail.narrative}</p></CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-green-600">{t('work_completed')}</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{detail.workCompleted}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-blue-600">{t('work_planned')}</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{detail.workPlanned}</p></CardContent>
          </Card>
        </div>

        {detail.issuesRisks && (
          <Card>
            <CardHeader><CardTitle className="text-red-600">{t('issues_risks')}</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{detail.issuesRisks}</p></CardContent>
          </Card>
        )}

        {detail.equipmentOnSite && (
          <Card>
            <CardHeader><CardTitle>{t('equipment_on_site')}</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{detail.equipmentOnSite}</p></CardContent>
          </Card>
        )}

        {detail.photos && detail.photos.length > 0 && (
          <Card>
            <CardHeader><CardTitle>{t('photos')}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {detail.photos.map((photo: any) => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={photo.fileUrl} alt={photo.caption || ''} className="object-cover w-full h-full" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">{photo.caption}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title={t('delete_confirm_title')}
          description={t('delete_confirm_text')}
          confirmLabel={tc('delete')}
          cancelLabel={tc('cancel')}
          variant="destructive"
          loading={deleteMutation.isPending}
          onConfirm={() => { if (deleteTargetId) deleteMutation.mutate(deleteTargetId); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/sites/${siteId}`} className="hover:text-foreground">{tc('sites')}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{t('title')}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{site?.name}</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setView('create'); }}>
          <Plus className="h-4 w-4 mr-2" />{t('new_report')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {listLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold">{t('table_date')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">{t('table_title')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">{t('weather')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">{t('workers_on_site')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">{t('photos')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">{tc('created_by')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report: any) => (
                    <tr
                      key={report.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => { setSelectedId(report.id); setView('detail'); }}
                    >
                      <td className="py-3 px-4 text-sm">{new Date(report.reportDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm font-medium">{report.title}</td>
                      <td className="py-3 px-4 text-sm">{report.weather || '—'}</td>
                      <td className="py-3 px-4 text-sm">{report.workersOnSite}</td>
                      <td className="py-3 px-4 text-sm">{report._count?.photos || 0}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{report.createdBy?.fullName}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); startEdit(report); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(report.id); setShowDeleteConfirm(true); }}>
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
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{tc('page_of', { page: pagination.page, total: pagination.totalPages })}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('delete_confirm_title')}
        description={t('delete_confirm_text')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTargetId) deleteMutation.mutate(deleteTargetId); }}
      />
    </div>
  );
}
