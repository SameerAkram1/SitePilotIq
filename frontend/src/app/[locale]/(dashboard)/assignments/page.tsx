'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  useSitesWithAssignments,
  useAssignmentsForSite,
  useAvailableWorkers,
  useCreateAssignment,
  useEndAssignment,
  useUpdateAssignment,
  useCancelAssignment,
  useAssignmentStats,
  useTradeBreakdown,
  useWorkerHistory,
  type SiteAssignment,
  type OverlapWarning,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Search,
  MapPin,
  Users,
  CalendarCheck,
  Plus,
  X,
  Loader2,
  CheckCircle,
  Clock,
  Pencil,
  StopCircle,
  Building2,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Download,
} from 'lucide-react';

export default function AssignmentsPage() {
  const t = useTranslations('assignments');
  const tc = useTranslations('common');

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteSearch, setSiteSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState<SiteAssignment | null>(null);
  const [showEditModal, setShowEditModal] = useState<SiteAssignment | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState<SiteAssignment | null>(null);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [assignTrade, setAssignTrade] = useState('');
  const [editTrade, setEditTrade] = useState('');
  const [overlapWarnings, setOverlapWarnings] = useState<Record<string, OverlapWarning>>({});
  const [checkingOverlaps, setCheckingOverlaps] = useState(false);
  const [workerSlideOverUserId, setWorkerSlideOverUserId] = useState<string | null>(null);

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignEndDate, setAssignEndDate] = useState<string | undefined>(undefined);
  const [assignOngoing, setAssignOngoing] = useState(false);
  const [assignNotes, setAssignNotes] = useState('');
  const [workerModalSearch, setWorkerModalSearch] = useState('');

  const [editEndDate, setEditEndDate] = useState<string | undefined>(undefined);
  const [editOngoing, setEditOngoing] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const { data: stats, isLoading: statsLoading } = useAssignmentStats();
  const { data: sites, isLoading: sitesLoading } = useSitesWithAssignments();
  const [workersPage, setWorkersPage] = useState(1);
  const { data: assignmentsResult, isLoading: assignmentsLoading } = useAssignmentsForSite(selectedSiteId, statusFilter, workersPage);
  const { data: workersResult, isLoading: workersLoading } = useAvailableWorkers(workerModalSearch);
  const { data: tradeBreakdown, isLoading: breakdownLoading } = useTradeBreakdown(selectedSiteId);
  const { data: workerHistory, isLoading: historyLoading } = useWorkerHistory(workerSlideOverUserId);

  const assignments = assignmentsResult?.data;
  const assignmentsPagination = assignmentsResult?.pagination;
  const availableWorkers = workersResult?.data;

  const createMutation = useCreateAssignment();
  const endMutation = useEndAssignment();
  const updateMutation = useUpdateAssignment();
  const cancelMutation = useCancelAssignment();

  const selectedSite = sites?.find((s) => s.id === selectedSiteId);

  const filteredSites = sites?.filter((s) =>
    s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
    s.project?.name?.toLowerCase().includes(siteSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(siteSearch.toLowerCase())
  );

  const resetAssignModal = () => {
    setSelectedWorkerIds([]);
    setAssignStartDate(new Date().toISOString().split('T')[0]);
    setAssignEndDate(undefined);
    setAssignOngoing(false);
    setAssignNotes('');
    setWorkerModalSearch('');
    setAssignTrade('');
    setOverlapWarnings({});
  };

  const checkOverlaps = useCallback(async () => {
    if (selectedWorkerIds.length === 0 || !assignStartDate) return;
    setCheckingOverlaps(true);
    const warnings: Record<string, OverlapWarning> = {};
    try {
      await Promise.all(
        selectedWorkerIds.map(async (userId) => {
          try {
            const { data } = await api.get('/assignments/overlap-check', {
              params: { userId, startDate: assignStartDate, endDate: assignOngoing ? undefined : assignEndDate },
            });
            const result = (data.data ?? data) as OverlapWarning;
            if (result.hasOverlap) {
              warnings[userId] = result;
            }
          } catch {
            // ignore
          }
        })
      );
    } finally {
      setOverlapWarnings(warnings);
      setCheckingOverlaps(false);
    }
  }, [selectedWorkerIds, assignStartDate, assignEndDate, assignOngoing]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (showAssignModal && selectedWorkerIds.length > 0 && assignStartDate) {
      debounceRef.current = setTimeout(checkOverlaps, 300);
    } else {
      setOverlapWarnings({});
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedWorkerIds, assignStartDate, assignEndDate, assignOngoing, showAssignModal, checkOverlaps]);

  const handleAssign = async () => {
    if (!selectedSiteId || selectedWorkerIds.length === 0) return;
    try {
      const result = await createMutation.mutateAsync({
        siteId: selectedSiteId,
        userIds: selectedWorkerIds,
        trade: assignTrade || undefined,
        startDate: assignStartDate,
        endDate: assignOngoing ? undefined : assignEndDate,
        notes: assignNotes || undefined,
      });
      if (result.errors.length > 0) {
        result.errors.forEach((err) => toast.error(err.reason));
      }
      if (result.created.length > 0) {
        toast.success(tc('workers_assigned', { count: result.created.length }));
        setShowAssignModal(false);
        resetAssignModal();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || tc('error'));
    }
  };

  const handleEndAssignment = async () => {
    if (!showEndDialog) return;
    try {
      await endMutation.mutateAsync(showEndDialog.id);
      toast.success(tc('success'));
      setShowEndDialog(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || tc('error'));
    }
  };

  const handleEditSave = async () => {
    if (!showEditModal) return;
    try {
      await updateMutation.mutateAsync({
        id: showEditModal.id,
        payload: {
          endDate: editOngoing ? undefined : editEndDate,
          trade: editTrade || undefined,
          notes: editNotes,
        },
      });
      toast.success(tc('success'));
      setShowEditModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || tc('error'));
    }
  };

  const handleCancelAssignment = async () => {
    if (!showCancelDialog) return;
    try {
      await cancelMutation.mutateAsync(showCancelDialog.id);
      toast.success(tc('success'));
      setShowCancelDialog(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || tc('error'));
    }
  };

  const openEditModal = (assignment: SiteAssignment) => {
    setEditEndDate(assignment.endDate?.split('T')[0] || undefined);
    setEditOngoing(!assignment.endDate);
    setEditNotes(assignment.notes || '');
    setEditTrade(assignment.trade || '');
    setShowEditModal(assignment);
  };

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const handleExport = async () => {
    if (!selectedSiteId) return;
    try {
      const response = await api.get(`/assignments/site/${selectedSiteId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignments-${selectedSiteId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(tc('error'));
    }
  };

  const breakdownEntries = tradeBreakdown
    ? Object.entries(tradeBreakdown.breakdown).filter(([, count]) => count > 0)
    : [];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <CalendarCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-heading)]">
              {t('page_title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('page_subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-border bg-muted/30">
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">{t('total_workers')}:</span>
            <span className="font-semibold">{statsLoading ? '...' : stats?.totalWorkers ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span className="text-muted-foreground">{t('active_sites')}:</span>
            <span className="font-semibold">{statsLoading ? '...' : stats?.activeSites ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <UserCheck className="h-4 w-4 text-violet-600" />
            <span className="text-muted-foreground">{t('assigned_today')}:</span>
            <span className="font-semibold">{statsLoading ? '...' : stats?.activeAssignments ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder={t('search_sites')}
                className="pl-9 h-10 bg-muted rounded-xl"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sitesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : filteredSites?.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{tc('no_results')}</p>
              </div>
            ) : (
              filteredSites?.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setSelectedSiteId(site.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    selectedSiteId === site.id ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{site.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{site.project?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                        {site.assignedCount}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {!selectedSiteId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground">{t('page_title')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('page_subtitle')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold font-[family-name:var(--font-heading)]">
                      {selectedSite?.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedSite?.project?.name} &bull; {tc('workers_assigned', { count: assignments?.length || 0 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="rounded-xl"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('export')}
                    </Button>
                    <Button
                      onClick={() => {
                        resetAssignModal();
                        setShowAssignModal(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('add_worker')}
                    </Button>
                  </div>
                </div>
                {breakdownEntries.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{t('breakdown_title')}:</span>
                    {breakdownEntries.map(([trade, count]) => (
                      <span
                        key={trade}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400"
                      >
                        {count} {trade}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      &bull; {t('breakdown_total')}: {tradeBreakdown?.total}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-6 py-2 border-b border-border flex gap-1">
                {(['ACTIVE', 'ENDED', 'CANCELLED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {status === 'ACTIVE' ? t('status_active') : status === 'ENDED' ? t('status_ended') : t('status_cancelled')}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : !assignments || assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold">{t('no_assignments')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('add_worker')}
                    </p>
                  </div>
                ) : (
                  <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-6 text-sm font-semibold text-foreground">{t('table_worker')}</th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-foreground">{t('table_trade')}</th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-foreground">{t('table_start_date')}</th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-foreground">{t('table_end_date')}</th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-foreground">{t('table_status')}</th>
                        <th className="text-right py-3 px-6 text-sm font-semibold text-foreground">{t('table_actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="py-3 px-6">
                            <button
                              onClick={() => setWorkerSlideOverUserId(a.user?.id || null)}
                              className="flex items-center gap-3 text-left hover:opacity-80"
                            >
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                {a.user?.fullName?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium hover:underline">{a.user?.fullName}</p>
                                <p className="text-xs text-muted-foreground">{a.user?.email}</p>
                              </div>
                            </button>
                          </td>
                          <td className="py-3 px-6">
                            <span className="text-xs bg-muted px-2 py-1 rounded-full">
                              {a.trade || '\u2014'}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-sm">
                            {new Date(a.startDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-6 text-sm">
                            {a.endDate ? new Date(a.endDate).toLocaleDateString() : (
                              <span className="text-muted-foreground italic">{tc('ongoing')}</span>
                            )}
                          </td>
                          <td className="py-3 px-6">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              a.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : a.status === 'ENDED'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {a.status === 'ACTIVE' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {a.status === 'ACTIVE' ? t('status_active') : a.status === 'ENDED' ? t('status_ended') : t('status_cancelled')}
                            </span>
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-end gap-1">
                              {a.status === 'ACTIVE' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditModal(a)}
                                    className="h-8 w-8 p-0"
                                    title={t('edit_title')}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowEndDialog(a)}
                                    className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                    title={t('end_title')}
                                  >
                                    <StopCircle className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCancelDialog(a)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    title={t('cancel_title')}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {assignmentsPagination && assignmentsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-500">
                        {tc('showing_to_of', { from: ((assignmentsPagination.page - 1) * assignmentsPagination.limit) + 1, to: Math.min(assignmentsPagination.page * assignmentsPagination.limit, assignmentsPagination.total), total: assignmentsPagination.total, items: '' })}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={assignmentsPagination.page <= 1}
                          onClick={() => setWorkersPage((p) => Math.max(1, p - 1))}
                        >
                          {tc('previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={assignmentsPagination.page >= assignmentsPagination.totalPages}
                          onClick={() => setWorkersPage((p) => p + 1)}
                        >
                          {tc('next')}
                        </Button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('assign_title')} {selectedSite?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t('select_workers')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={workerModalSearch}
                  onChange={(e) => setWorkerModalSearch(e.target.value)}
                  placeholder={t('search_available_workers')}
                  className="pl-9 h-10 bg-muted rounded-xl"
                />
              </div>
              <div className="border rounded-xl max-h-48 overflow-y-auto">
                {availableWorkers?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('no_available_workers')}
                  </div>
                ) : (
                  availableWorkers?.map((worker) => (
                    <label
                      key={worker.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0"
                    >
                      <Checkbox
                        checked={selectedWorkerIds.includes(worker.id)}
                        onCheckedChange={() => toggleWorkerSelection(worker.id)}
                      />
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {worker.fullName?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{worker.fullName}</p>
                        <p className="text-xs text-muted-foreground">{worker.role?.replaceAll('_', ' ')}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {tc('available')}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedWorkerIds.length > 0 && (
                <p className="text-xs text-blue-600">{selectedWorkerIds.length} {t('remaining')}</p>
              )}
            </div>

            {Object.keys(overlapWarnings).length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('overlap_warning')}</p>
                </div>
                {Object.entries(overlapWarnings).map(([userId, warning]) => {
                  const worker = availableWorkers?.find((w) => w.id === userId);
                  return (
                    <p key={userId} className="text-xs text-amber-600 dark:text-amber-500 ml-6">
                      {worker?.fullName}: {t('overlap_conflicting_site')} {warning.conflictingSite}
                    </p>
                  );
                })}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t('trade_placeholder')}</Label>
              <Input
                value={assignTrade}
                onChange={(e) => setAssignTrade(e.target.value.slice(0, 100))}
                placeholder={t('trade_placeholder')}
                maxLength={100}
                className="bg-muted rounded-xl"
              />
            </div>

            <DateRangePicker
              startDateLabel={tc('start_date_readonly')}
              endDateLabel={tc('end_date')}
              startDate={assignStartDate}
              endDate={assignEndDate}
              ongoing={assignOngoing}
              onStartDateChange={setAssignStartDate}
              onEndDateChange={setAssignEndDate}
              onOngoingChange={setAssignOngoing}
              ongoingLabel={t('ongoing_label')}
              ongoingHint={t('ongoing_hint')}
            />

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t('notes')}</Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder={t('notes_placeholder')}
                rows={2}
                className="bg-muted rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAssignModal(false)} className="rounded-xl">
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedWorkerIds.length === 0 || createMutation.isPending || checkingOverlaps}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('assign_title')} ({selectedWorkerIds.length})
            </Button>
          </div>

          {createMutation.data?.errors && createMutation.data.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">{tc('error')}:</p>
              {createMutation.data.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-500">
                  {err.userId}: {err.reason}
                </p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!workerSlideOverUserId} onOpenChange={() => setWorkerSlideOverUserId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('worker_history_title')}</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : workerHistory ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                  {workerHistory.user?.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-semibold">{workerHistory.user?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{workerHistory.user?.email}</p>
                  {workerHistory.user?.phone && (
                    <p className="text-sm text-muted-foreground">{workerHistory.user?.phone}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {workerHistory.assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('no_assignments')}</p>
                ) : (
                  workerHistory.assignments.map((a) => (
                    <div key={a.id} className="p-3 border border-border rounded-xl">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.site?.name || tc('unknown_site')}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : a.status === 'ENDED'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {a.status === 'ACTIVE' ? t('status_active') : a.status === 'ENDED' ? t('status_ended') : t('status_cancelled')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {a.trade && <span>{a.trade}</span>}
                        <span>{new Date(a.startDate).toLocaleDateString()} - {a.endDate ? new Date(a.endDate).toLocaleDateString() : tc('ongoing')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">{t('no_assignments')}</p>
          )}
          </DialogContent>
        </Dialog>

      <Dialog open={!!showEditModal} onOpenChange={() => setShowEditModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              {t('table_worker')}: <strong>{showEditModal?.user?.fullName}</strong>
            </div>
            <DateRangePicker
              startDateLabel={tc('start_date_readonly')}
              endDateLabel={tc('end_date')}
              startDate={showEditModal?.startDate?.split('T')[0]}
              endDate={editEndDate}
              ongoing={editOngoing}
              onStartDateChange={() => {}}
              onEndDateChange={setEditEndDate}
              onOngoingChange={setEditOngoing}
              disablePastStart={false}
              ongoingLabel={t('ongoing_label')}
              ongoingHint={t('ongoing_hint')}
            />
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t('trade_placeholder')}</Label>
              <Input
                value={editTrade}
                onChange={(e) => setEditTrade(e.target.value.slice(0, 100))}
                placeholder={t('trade_placeholder')}
                maxLength={100}
                className="bg-muted rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t('notes')}</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder={t('notes_placeholder')}
                rows={2}
                className="bg-muted rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditModal(null)} className="rounded-xl">
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!showEndDialog}
        onOpenChange={() => setShowEndDialog(null)}
        title={t('end_title')}
        description={
          showEndDialog
            ? `${showEndDialog.user?.fullName || tc('unknown_user')} ${t('end_description')} ${selectedSite?.name}.`
            : ''
        }
        confirmLabel={t('end_title')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        loading={endMutation.isPending}
        onConfirm={handleEndAssignment}
      />

      <ConfirmationDialog
        open={!!showCancelDialog}
        onOpenChange={() => setShowCancelDialog(null)}
        title={t('cancel_title')}
        description={
          showCancelDialog
            ? `${showCancelDialog.user?.fullName || tc('unknown_user')} - ${t('cancel_description')} ${selectedSite?.name}.`
            : ''
        }
        confirmLabel={t('cancel_title')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        loading={cancelMutation.isPending}
        onConfirm={handleCancelAssignment}
      />
    </div>
  );
}
