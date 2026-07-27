'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getSitePhotos, uploadSitePhoto, deleteSitePhoto, updateSitePhoto, getSite, getSiteLocations } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  ArrowLeft,
  Loader2,
  Upload,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Camera,
  MapPin,
  X,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SitePhotosPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('sites.photos');
  const tc = useTranslations('common');
  const siteId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadLocationId, setUploadLocationId] = useState('');
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<any>(null);
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocationId, setEditLocationId] = useState('');

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const { data: locations } = useQuery({
    queryKey: ['siteLocations', siteId],
    queryFn: () => getSiteLocations(siteId),
  });

  const { data: photosData, isLoading } = useQuery({
    queryKey: ['sitePhotos', siteId, page, startDate, endDate, locationFilter],
    queryFn: () => getSitePhotos(siteId, {
      page,
      limit: 20,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      locationId: locationFilter || undefined,
    }),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) throw new Error('No file');
      return uploadSitePhoto(siteId, uploadFile, {
        caption: uploadCaption || undefined,
        description: uploadDescription || undefined,
        locationId: uploadLocationId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePhotos', siteId] });
      toast.success(t('uploaded'));
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadCaption('');
      setUploadDescription('');
      setUploadLocationId('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('upload_error')),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingPhoto) throw new Error('No photo');
      return updateSitePhoto(siteId, editingPhoto.id, {
        caption: editCaption || undefined,
        description: editDescription || undefined,
        locationId: editLocationId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePhotos', siteId] });
      toast.success(t('updated'));
      setEditingPhoto(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('update_error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSitePhoto(siteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePhotos', siteId] });
      toast.success(t('deleted'));
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setPreviewPhoto(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('delete_error')),
  });

  const photos = photosData?.data || [];
  const pagination = photosData?.pagination;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const openEdit = (photo: any) => {
    setEditingPhoto(photo);
    setEditCaption(photo.caption || '');
    setEditDescription(photo.description || '');
    setEditLocationId(photo.locationId || '');
    setPreviewPhoto(null);
  };

  const locationList = (locations || []) as any[];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/sites/${siteId}`} className="hover:text-foreground">{tc('sites')}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{t('title')}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/sites/${siteId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{site?.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowUploadForm(true)}>
          <Upload className="h-4 w-4 mr-2" />{t('upload_photo')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>{t('filter_from')}</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label>{t('filter_to')}</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label>{t('filter_location')}</Label>
              <select
                className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
                value={locationFilter}
                onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('all_locations')}</option>
                {locationList.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); setLocationFilter(''); setPage(1); }}>
                {tc('clear_filters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t('empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo: any) => (
            <div
              key={photo.id}
              className="group relative rounded-xl overflow-hidden bg-muted cursor-pointer border border-border/50 hover:border-border transition-colors"
              onClick={() => setPreviewPhoto(photo)}
            >
              <div className="aspect-square overflow-hidden">
                <img src={photo.fileUrl} alt={photo.caption || ''} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium truncate">{photo.caption || photo.fileName}</p>
                {photo.description && (
                  <p className="text-white/70 text-xs truncate mt-0.5">{photo.description}</p>
                )}
                <p className="text-white/50 text-xs mt-1">{new Date(photo.takenAt).toLocaleDateString()}</p>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 bg-black/50 text-white hover:bg-blue-600"
                  onClick={(e) => { e.stopPropagation(); openEdit(photo); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 bg-black/50 text-white hover:bg-red-600"
                  onClick={(e) => { e.stopPropagation(); setDeleteTargetId(photo.id); setShowDeleteConfirm(true); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{tc('page_of', { page: pagination.page, total: pagination.totalPages })}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('upload_photo')}</h2>
                <Button variant="ghost" size="sm" onClick={() => { setShowUploadForm(false); setUploadFile(null); }}><X className="h-4 w-4" /></Button>
              </div>

              <input ref={uploadFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              {uploadFile ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                  <img src={URL.createObjectURL(uploadFile)} alt="Preview" className="object-cover w-full h-full" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => { setUploadFile(null); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => uploadFileInputRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer bg-muted/50"
                >
                  <Camera className="h-10 w-10 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">Click to select a photo</span>
                </button>
              )}

              <div className="space-y-2">
                <Label>{t('caption')}</Label>
                <Input value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} placeholder={t('caption_placeholder')} />
              </div>

              <div className="space-y-2">
                <Label>{t('description')}</Label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder={t('description_placeholder')}
                  rows={3}
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-input resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('location')}</Label>
                <select
                  className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
                  value={uploadLocationId}
                  onChange={(e) => setUploadLocationId(e.target.value)}
                >
                  <option value="">{t('no_location')}</option>
                  {locationList.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowUploadForm(false); setUploadFile(null); }}>{tc('cancel')}</Button>
                <Button onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
                  {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t('upload')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Dialog */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-white hover:text-white/80" onClick={() => setPreviewPhoto(null)}>
                  <X className="h-5 w-5" />
                </Button>
                {previewPhoto.uploadedBy && (
                  <span className="text-white/60 text-sm">{tc('by')} {previewPhoto.uploadedBy.fullName}</span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-white hover:text-white/80" onClick={() => openEdit(previewPhoto)}>
                <Pencil className="h-4 w-4 mr-1" />{t('edit_photo')}
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-0">
              <img src={previewPhoto.fileUrl} alt={previewPhoto.caption || ''} className="max-h-[70vh] max-w-full rounded-xl object-contain" />
            </div>

            <div className="mt-3 text-center">
              <p className="text-white font-medium text-lg">{previewPhoto.caption || previewPhoto.fileName}</p>
              {previewPhoto.description && (
                <p className="text-white/60 text-sm mt-1 max-w-2xl mx-auto whitespace-pre-wrap">{previewPhoto.description}</p>
              )}
              <div className="flex items-center justify-center gap-4 text-white/40 text-sm mt-2">
                {previewPhoto.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{previewPhoto.location.name}</span>}
                <span>{new Date(previewPhoto.takenAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingPhoto(null)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('edit_photo')}</h2>
                <Button variant="ghost" size="sm" onClick={() => setEditingPhoto(null)}><X className="h-4 w-4" /></Button>
              </div>

              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={editingPhoto.fileUrl} alt={editingPhoto.caption || ''} className="object-cover w-full h-full" />
              </div>

              <div className="space-y-2">
                <Label>{t('caption')}</Label>
                <Input value={editCaption} onChange={(e) => setEditCaption(e.target.value)} placeholder={t('caption_placeholder')} />
              </div>

              <div className="space-y-2">
                <Label>{t('description')}</Label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('description_placeholder')}
                  rows={4}
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-input resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('location')}</Label>
                <select
                  className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
                  value={editLocationId}
                  onChange={(e) => setEditLocationId(e.target.value)}
                >
                  <option value="">{t('no_location')}</option>
                  {locationList.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingPhoto(null)}>{tc('cancel')}</Button>
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-1" />{t('save_changes')}
                </Button>
              </div>
            </CardContent>
          </Card>
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
