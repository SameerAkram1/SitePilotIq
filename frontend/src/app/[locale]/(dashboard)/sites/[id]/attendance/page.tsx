'use client';

import { useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getSiteAttendance,
  getSite,
  exportAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getUsersForSelection,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  CalendarCheck,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  ShieldAlert,
  Download,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function SiteAttendanceContent() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const t = useTranslations('attendance.site_attendance');
  const tc = useTranslations('common');
  const siteId = params.id as string;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const { data: users } = useQuery({
    queryKey: ['usersList'],
    queryFn: () => getUsersForSelection(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'site', siteId, { startDate, endDate, page }],
    queryFn: () =>
      getSiteAttendance(siteId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 25,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'site', siteId] });
      toast.success(t('record_created'));
      closeForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || tc('something_went_wrong')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'site', siteId] });
      toast.success(t('record_updated'));
      closeForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || tc('something_went_wrong')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'site', siteId] });
      toast.success(t('record_deleted'));
      setDeleteTargetId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || tc('something_went_wrong')),
  });

  function closeForm() {
    setShowAddForm(false);
    setEditRecord(null);
    setFormEmployeeId('');
    setFormDate('');
    setFormCheckIn('');
    setFormCheckOut('');
    setFormNotes('');
  }

  function openEditForm(record: any) {
    setEditRecord(record);
    setFormEmployeeId(record.employeeId);
    setFormDate(record.attendanceDate?.split('T')[0] || '');
    setFormCheckIn(record.checkInTime ? new Date(record.checkInTime).toISOString().slice(11, 16) : '');
    setFormCheckOut(record.checkOutTime ? new Date(record.checkOutTime).toISOString().slice(11, 16) : '');
    setFormNotes(record.notes || '');
    setShowAddForm(true);
  }

  function handleSubmit() {
    if (!formEmployeeId || !formDate) {
      toast.error(tc('required_field'));
      return;
    }

    const dateStr = formDate;
    const data: any = {
      siteId,
      employeeId: formEmployeeId,
      attendanceDate: dateStr,
      notes: formNotes || undefined,
    };

    if (formCheckIn) {
      data.checkInTime = `${dateStr}T${formCheckIn}:00.000Z`;
      data.checkInLat = 0;
      data.checkInLng = 0;
    }
    if (formCheckOut) {
      data.checkOutTime = `${dateStr}T${formCheckOut}:00.000Z`;
      data.checkOutLat = 0;
      data.checkOutLng = 0;
    }

    if (editRecord) {
      updateMutation.mutate({ id: editRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const handleExport = async () => {
    try {
      const blob = await exportAttendance({
        siteId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${siteId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(tc('something_went_wrong'));
    }
  };

  const records = data?.records || [];
  const summary = data?.summary || {};
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  const workerOptions = (users || []).map((u: any) => ({
    id: u.id,
    label: `${u.code || ''} - ${u.fullName}`,
  }));

  const summaryCards = [
    { label: t('summary_total'), value: summary.total || 0, icon: CalendarCheck, color: 'text-blue-600' },
    { label: t('summary_checked_in'), value: summary.checkedIn || 0, icon: Clock, color: 'text-green-600' },
    { label: t('summary_checked_out'), value: summary.checkedOut || 0, icon: CheckCircle, color: 'text-gray-600' },
    { label: t('summary_valid'), value: summary.validCheckIns || 0, icon: ShieldCheck, color: 'text-emerald-600' },
    { label: t('summary_offsite'), value: summary.invalidCheckIns || 0, icon: ShieldAlert, color: 'text-red-600' },
    { label: t('summary_workers'), value: summary.uniqueWorkers || 0, icon: Users, color: 'text-violet-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sites" className="hover:text-foreground">{t('breadcrumb_sites')}</Link>
        <span>/</span>
        <Link href={`/sites/${siteId}`} className="hover:text-foreground">{site?.name || '...'}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{t('title')}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/sites/${siteId}`)}
            className="rounded-xl mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
              {t('title')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{site?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            {tc('export')}
          </Button>
          <Button onClick={() => { closeForm(); setShowAddForm(true); }} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            {t('add_record')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4" />
            {tc('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('filter_from')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('filter_to')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_worker')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_date')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_check_in')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_check_out')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">{t('table_hours')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_status')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">{t('table_location')}</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: any) => {
                    const checkIn = record.checkInTime ? new Date(record.checkInTime) : null;
                    const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
                    const hours = checkIn && checkOut
                      ? ((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(1)
                      : '—';

                    return (
                      <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              {record.employee?.fullName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{record.employee?.fullName || '—'}</p>
                              <p className="text-xs text-muted-foreground">{record.employee?.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(record.attendanceDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {checkIn ? checkIn.toLocaleTimeString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {checkOut ? checkOut.toLocaleTimeString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {hours !== '—' ? `${hours}h` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'CHECKED_IN'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {record.status === 'CHECKED_IN' ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {record.status === 'CHECKED_IN' ? t('status_checked_in') : t('status_checked_out')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-1">
                            {record.checkInLocationValid ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <MapPin className="h-4 w-4 text-red-500" />
                            )}
                            <span className={record.checkInLocationValid ? 'text-green-700' : 'text-red-700'}>
                              {record.checkInLocationValid ? t('location_on_site') : t('location_off_site')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditForm(record)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteTargetId(record.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc('page_of', { page, totalPages: pagination.totalPages })}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              {tc('next')}
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRecord ? t('edit_record') : t('add_record')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('form_worker')}</Label>
              <SearchableSelect
                options={workerOptions}
                value={formEmployeeId}
                onChange={setFormEmployeeId}
                placeholder={t('form_worker_placeholder')}
              />
            </div>
            <div>
              <Label>{t('form_date')}</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('form_check_in')}</Label>
                <Input type="time" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>{t('form_check_out')}</Label>
                <Input type="time" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>{t('form_notes')}</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t('form_notes_placeholder')} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>{tc('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editRecord ? tc('save_changes') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title={tc('confirm_delete')}
        description={tc('confirm_delete')}
        confirmLabel={tc('confirm')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTargetId) deleteMutation.mutate(deleteTargetId); }}
      />
    </div>
  );
}

export default function SiteAttendancePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}>
      <SiteAttendanceContent />
    </Suspense>
  );
}
