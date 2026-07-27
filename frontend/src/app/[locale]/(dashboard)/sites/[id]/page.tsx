'use client';

import { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getSite,
  getSiteDashboard,
  getSiteLocations,
  getSiteQrCode,
  disableSite,
  regenerateSiteQr,
  deleteSiteLocation,
  createSiteLocation,
  updateSiteLocation,
  downloadSiteReportPdf,
  queryKeys,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TreeView } from '@/components/shared/tree-view';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Users,
  FileText,
  DollarSign,
  Package,
  BarChart3,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  Receipt,
  GitBranch,
  Calendar,
  Camera,
} from 'lucide-react';
import { SiteMap } from '@/components/shared/site-map';
import ActivityFeed from '@/components/activity-feed';
import { toast } from 'sonner';

import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

const LOCATION_LEVEL_TYPES = [
  { value: 'BUILDING', key: 'location_type_building' },
  { value: 'FLOOR', key: 'location_type_floor' },
  { value: 'ZONE', key: 'location_type_zone' },
  { value: 'AREA', key: 'location_type_area' },
  { value: 'BLOCK', key: 'location_type_block' },
  { value: 'TOWER', key: 'location_type_tower' },
  { value: 'PHASE', key: 'location_type_phase' },
  { value: 'ELEMENT', key: 'location_type_element' },
];

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock },
  ACTIVE: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  COMPLETED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  DISABLED: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function SiteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const td = useTranslations('sites.detail');
  const ts = useTranslations('sites.status');
  const tsb = useTranslations('sidebar');
  const tc = useTranslations('common');
  const siteId = params.id as string;
  const [showQrRegenerate, setShowQrRegenerate] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showDeleteLocationConfirm, setShowDeleteLocationConfirm] = useState(false);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<{ id: string; name: string } | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{ id: string; name: string; levelType: string; parentId?: string | null } | null>(null);
  const [locationParentId, setLocationParentId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', levelType: 'BUILDING', sortOrder: '0' });

  const { data: site, isLoading } = useQuery({
    queryKey: queryKeys.sites.detail(siteId),
    queryFn: () => getSite(siteId),
  });

  const { data: dashboard } = useQuery({
    queryKey: queryKeys.sites.dashboard(siteId),
    queryFn: () => getSiteDashboard(siteId),
  });

  const { data: locations } = useQuery({
    queryKey: queryKeys.sites.locations(siteId),
    queryFn: () => getSiteLocations(siteId),
  });

  const { data: qrData } = useQuery({
    queryKey: queryKeys.sites.qrCode(siteId),
    queryFn: () => getSiteQrCode(siteId),
  });

  const disableMutation = useMutation({
    mutationFn: disableSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
      router.push('/sites');
    },
  });

  const regenerateQrMutation = useMutation({
    mutationFn: () => regenerateSiteQr(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.qrCode(siteId) });
      setShowQrRegenerate(false);
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: deleteSiteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.locations(siteId) });
      toast.success(td('location_deleted'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('location_delete_error')),
  });

  const createLocationMutation = useMutation({
    mutationFn: (data: { name: string; levelType: string; parentId?: string | null; sortOrder?: number }) =>
      createSiteLocation(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.locations(siteId) });
      setShowLocationForm(false);
      setLocationForm({ name: '', levelType: 'BUILDING', sortOrder: '0' });
      setLocationParentId(null);
      toast.success(td('location_created'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('location_create_error')),
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; levelType: string; sortOrder?: number } }) =>
      updateSiteLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.locations(siteId) });
      setShowLocationForm(false);
      setEditingLocation(null);
      setLocationForm({ name: '', levelType: 'BUILDING', sortOrder: '0' });
      toast.success(td('location_updated'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message || td('location_update_error')),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">{td('not_found')}</h2>
        <Button variant="link" onClick={() => router.push('/sites')}>
          {td('back_to_sites')}
        </Button>
      </div>
    );
  }

  const status = statusConfig[site.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;

  const dashboardCards = [
    { label: td('dashboard_workers'), value: dashboard?.workersCount ?? '—', icon: Users, color: 'text-blue-600' },
    { label: td('dashboard_boq_items'), value: dashboard?.boqCount ?? '—', icon: FileText, color: 'text-violet-600' },
    { label: td('dashboard_ipc_count'), value: dashboard?.ipcCount ?? '—', icon: BarChart3, color: 'text-emerald-600' },
    { label: td('dashboard_progress'), value: dashboard?.completionProgress != null ? `${dashboard.completionProgress}%` : '—', icon: BarChart3, color: 'text-amber-600' },
    { label: td('dashboard_expenses'), value: dashboard?.expensesTotal != null ? `$${dashboard.expensesTotal.toLocaleString()}` : '—', icon: DollarSign, color: 'text-rose-600' },
    { label: td('dashboard_inventory'), value: dashboard?.inventoryItemsCount ?? '—', icon: Package, color: 'text-sky-600' },
  ];

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">{tsb('projects')}</Link>
        <span>/</span>
        <Link href={`/projects/${site.project?.id}`} className="hover:text-foreground">
          {site.project?.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{site.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-xl mt-1"
            aria-label={tc('back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                {site.name}
              </h1>
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {site.code}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {ts((site.status || 'DRAFT').toLowerCase())}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {site.locationAddress || td('no_address')} • {td('created_label', { date: new Date(site.createdAt).toLocaleDateString() })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={async () => {
            try {
              const blob = await downloadSiteReportPdf(siteId);
              const url = window.URL.createObjectURL(new Blob([blob]));
              const a = document.createElement('a');
              a.href = url;
              a.download = `site-report-${siteId}.pdf`;
              a.click();
              window.URL.revokeObjectURL(url);
            } catch { toast.error('Report export failed'); }
          }}>
            <FileText className="h-4 w-4 mr-2" />
            {td('site_report', { defaultValue: 'Site Report' })}
          </Button>
          <Link href={`/sites/${siteId}/attendance`}>
            <Button variant="outline" className="rounded-xl">
              <CalendarCheck className="h-4 w-4 mr-2" />
              {td('view_attendance')}
            </Button>
          </Link>
          <Link href={`/sites/${siteId}/edit`}>
            <Button variant="outline" className="rounded-xl">
              <Pencil className="h-4 w-4 mr-2" />
              {td('edit')}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-xl text-red-600 hover:bg-red-50"
            onClick={() => setShowDisableConfirm(true)}
            aria-label={td('disable')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {td('disable')}
          </Button>
        </div>
      </div>

      {site.latitude && site.longitude && (
        <Card>
          <CardContent className="p-0">
            <div className="h-[300px] rounded-xl overflow-hidden">
              <SiteMap
                latitude={site.latitude}
                longitude={site.longitude}
                readOnly
                height="300px"
                radius={site.locationRadius}
              />
            </div>
            <div className="px-4 py-3 flex items-center gap-4 text-sm text-muted-foreground border-t">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
              </span>
              <span>{td('radius_label')}: {site.locationRadius}m</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {dashboardCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center`}>
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

      <div className="flex gap-1 border-b">
        {[
          { label: td('tab_overview'), icon: FileText, href: `/sites/${siteId}` },
          { label: td('tab_boq'), icon: BookOpen, href: `/sites/${siteId}/boq` },
          { label: td('tab_vo'), icon: GitBranch, href: `/sites/${siteId}/variation-orders` },
          { label: td('tab_measurements'), icon: ClipboardList, href: `/sites/${siteId}/measurements` },
          { label: td('tab_ipc'), icon: Receipt, href: `/sites/${siteId}/ipc` },
          { label: td('tab_dpr'), icon: Calendar, href: `/sites/${siteId}/dpr` },
          { label: td('tab_photos'), icon: Camera, href: `/sites/${siteId}/photos` },
          { label: td('tab_documents'), icon: FileText, href: `/sites/${siteId}/documents` },
        ].map((tab) => {
          const isActive = pathname === tab.href || (tab.href === `/sites/${siteId}` && !pathname.includes('/boq') && !pathname.includes('/variation-orders') && !pathname.includes('/measurements') && !pathname.includes('/ipc') && !pathname.includes('/dpr') && !pathname.includes('/photos') && !pathname.includes('/documents'));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{td('qr_code')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {qrData?.qrCodeImageUrl ? (
                <img
                  src={qrData.qrCodeImageUrl}
                  alt={`QR code for ${site.name}`}
                  className="h-48 w-48 rounded-xl"
                />
              ) : (
                <div className="h-48 w-48 bg-white border-2 border-dashed border-border rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-2 animate-spin" />
                    <p className="text-xs text-muted-foreground">{td('qr_code')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/sites/${siteId}/qr-code?format=pdf`, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                {td('download_pdf')}
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowQrRegenerate(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {td('regenerate')}
              </Button>
            </div>

            {showQrRegenerate && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                <p className="text-amber-800 font-medium">{td('qr_warning_title')}</p>
                <p className="text-amber-700 text-xs mt-1">
                  {td('qr_warning_text')}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowQrRegenerate(false)}
                  >
                    {td('cancel')}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => regenerateQrMutation.mutate()}
                    disabled={regenerateQrMutation.isPending}
                  >
                    {regenerateQrMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      td('confirm')
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{td('location_hierarchy')}</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setEditingLocation(null);
                setLocationParentId(null);
                setLocationForm({ name: '', levelType: 'BUILDING', sortOrder: '0' });
                setShowLocationForm(true);
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              {td('add_location')}
            </Button>
          </CardHeader>
          <CardContent>
            <TreeView
              data={locations || []}
              onAdd={(parentId) => {
                setEditingLocation(null);
                setLocationParentId(parentId || null);
                setLocationForm({ name: '', levelType: 'BUILDING', sortOrder: '0' });
                setShowLocationForm(true);
              }}
              onEdit={(node) => {
                setEditingLocation({ id: node.id, name: node.name, levelType: node.levelType, parentId: node.parentId });
                setLocationParentId(null);
                setLocationForm({ name: node.name, levelType: node.levelType, sortOrder: String(node.sortOrder || 0) });
                setShowLocationForm(true);
              }}
              onDelete={(node) => {
                setDeleteLocationTarget({ id: node.id, name: node.name });
                setShowDeleteLocationConfirm(true);
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{td('site_details')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_site_manager')}</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {site.siteManager?.fullName?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{site.siteManager?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{site.siteManager?.email}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_project')}</h3>
              <Link
                href={`/projects/${site.project?.id}`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {site.project?.code} - {site.project?.name}
              </Link>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_planned_end')}</h3>
              <p className="font-medium">
                {site.plannedEndDate
                  ? new Date(site.plannedEndDate).toLocaleDateString()
                  : '—'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_actual_end')}</h3>
              <p className="font-medium">
                {site.actualEndDate
                  ? new Date(site.actualEndDate).toLocaleDateString()
                  : '—'}
              </p>
            </div>

            {site.notes && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_notes')}</h3>
                <p className="text-sm">{site.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

      <ActivityFeed siteId={siteId} />

      <ConfirmationDialog
        open={showDisableConfirm}
        onOpenChange={setShowDisableConfirm}
        title={td('disable')}
        description={td('disable_confirm')}
        confirmLabel={td('disable')}
        cancelLabel={td('cancel')}
        variant="destructive"
        loading={disableMutation.isPending}
        onConfirm={() => disableMutation.mutate(siteId)}
      />
      <ConfirmationDialog
        open={showDeleteLocationConfirm}
        onOpenChange={setShowDeleteLocationConfirm}
        title={td('confirm')}
        description={deleteLocationTarget ? td('location_delete_confirm', { name: deleteLocationTarget.name }) : ''}
        confirmLabel={td('confirm')}
        cancelLabel={td('cancel')}
        variant="destructive"
        loading={deleteLocationMutation.isPending}
        onConfirm={() => {
          if (deleteLocationTarget) {
            deleteLocationMutation.mutate(deleteLocationTarget.id);
            setShowDeleteLocationConfirm(false);
            setDeleteLocationTarget(null);
          }
        }}
      />

      {/* Location Form Dialog */}
      {showLocationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingLocation ? td('location_edit_title') : td('location_add_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="locName">{td('location_name')}</Label>
                <Input
                  id="locName"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  placeholder={td('location_name_placeholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="locLevelType">{td('location_level_type')}</Label>
                <select
                  id="locLevelType"
                  value={locationForm.levelType}
                  onChange={(e) => setLocationForm({ ...locationForm, levelType: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {LOCATION_LEVEL_TYPES.map((lt) => (
                    <option key={lt.value} value={lt.value}>{td(lt.key)}</option>
                  ))}
                </select>
              </div>
              {!editingLocation && locationParentId && (
                <div className="p-2 bg-muted rounded-lg text-sm text-muted-foreground">
                  {td('location_parent')}: {locations?.find((l: any) => l.id === locationParentId)?.name || td('location_root')}
                </div>
              )}
              <div>
                <Label htmlFor="locSortOrder">{td('location_sort_order')}</Label>
                <Input
                  id="locSortOrder"
                  type="number"
                  value={locationForm.sortOrder}
                  onChange={(e) => setLocationForm({ ...locationForm, sortOrder: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowLocationForm(false); setEditingLocation(null); }}>
                  {td('cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (!locationForm.name.trim()) return;
                    if (editingLocation) {
                      updateLocationMutation.mutate({
                        id: editingLocation.id,
                        data: {
                          name: locationForm.name,
                          levelType: locationForm.levelType,
                          sortOrder: parseInt(locationForm.sortOrder) || 0,
                        },
                      });
                    } else {
                      createLocationMutation.mutate({
                        name: locationForm.name,
                        levelType: locationForm.levelType,
                        parentId: locationParentId || undefined,
                        sortOrder: parseInt(locationForm.sortOrder) || 0,
                      });
                    }
                  }}
                  disabled={createLocationMutation.isPending || updateLocationMutation.isPending || !locationForm.name.trim()}
                >
                  {(createLocationMutation.isPending || updateLocationMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingLocation ? tc('save') : tc('create')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
