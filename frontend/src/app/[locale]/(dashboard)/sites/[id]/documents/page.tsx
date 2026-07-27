'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getSite,
  getSiteAttachments,
  uploadSiteAttachment,
  deleteSiteAttachment,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Download,
  Eye,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  UploadCloud,
  X,
} from 'lucide-react';

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
  if (mimeType.includes('word') || mimeType.includes('document')) return File;
  return File;
}

function getFileColor(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'text-purple-500';
  if (mimeType.includes('pdf')) return 'text-red-500';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'text-green-600';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-500';
  return 'text-muted-foreground';
}

export default function SiteDocumentsPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const td = useTranslations('sites.detail');
  const tc = useTranslations('common');
  const siteId = params.id as string;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: site } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => getSite(siteId),
  });

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['site-attachments', siteId],
    queryFn: () => getSiteAttachments(siteId),
  });

  const uploadMutation = useMutation({
    mutationFn: (vars: { file: File; description?: string }) =>
      uploadSiteAttachment(siteId, vars.file, vars.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-attachments', siteId] });
      closeUploadDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteSiteAttachment(siteId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-attachments', siteId] });
    },
  });

  function closeUploadDialog() {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadNote('');
    setIsDragOver(false);
  }

  function handleUpload() {
    if (!uploadFile) return;
    uploadMutation.mutate({
      file: uploadFile,
      description: uploadNote.trim() || undefined,
    });
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadFile(file);
  }, []);

  const docs = attachments?.data || attachments || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
            {td('documents_title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {site?.name || '...'} — {site?.code || ''}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {[
          { label: td('tab_overview'), href: `/sites/${siteId}` },
          { label: td('tab_boq'), href: `/sites/${siteId}/boq` },
          { label: td('tab_vo'), href: `/sites/${siteId}/variation-orders` },
          { label: td('tab_measurements'), href: `/sites/${siteId}/measurements` },
          { label: td('tab_ipc'), href: `/sites/${siteId}/ipc` },
          { label: td('tab_dpr'), href: `/sites/${siteId}/dpr` },
          { label: td('tab_photos'), href: `/sites/${siteId}/photos` },
          { label: td('tab_documents'), href: `/sites/${siteId}/documents` },
        ].map((tab) => {
          const isActive = tab.href.endsWith('/documents');
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
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{td('documents_title')}</CardTitle>
          <Button size="sm" className="rounded-xl" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {td('upload_document')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : !docs || docs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{td('no_documents')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((att: any) => {
                const FileIcon = getFileIcon(att.mimeType);
                const iconColor = getFileColor(att.mimeType);
                const isExpanded = expandedNotes.has(att.id);
                const hasLongNote = att.description && att.description.length > 80;
                return (
                  <div key={att.id} className="rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-lg bg-muted/50 ${iconColor}`}>
                        <FileIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {td('file_info', { size: (att.fileSize / 1024).toFixed(1), date: new Date(att.createdAt).toLocaleDateString() })}
                        </p>

                        {att.description && (
                          <div className="mt-2">
                            <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap ${!isExpanded && hasLongNote ? 'line-clamp-3' : ''}`}>
                              {att.description}
                            </p>
                            {hasLongNote && (
                              <button
                                className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium"
                                onClick={() => {
                                  const next = new Set(expandedNotes);
                                  if (isExpanded) next.delete(att.id);
                                  else next.add(att.id);
                                  setExpandedNotes(next);
                                }}
                              >
                                {isExpanded ? tc('show_less') : tc('show_more')}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                            {att.uploadedBy?.fullName?.charAt(0) || '?'}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {att.uploadedBy?.fullName || tc('unknown_user')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {att.mimeType.startsWith('image/') && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-purple-500 hover:text-purple-600"
                            onClick={() => {
                              const url = `/api/sites/${siteId}/attachments/${att.id}/download`;
                              window.open(url, '_blank');
                            }} title={td('view')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            const url = `/api/sites/${siteId}/attachments/${att.id}/download`;
                            window.open(url, '_blank');
                          }} title={td('download')}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTargetId(att.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!open) closeUploadDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{td('upload_document')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('site-upload-file-input')?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : uploadFile
                    ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
                    : 'border-border hover:border-muted-foreground/50 bg-muted/30'
              }`}
            >
              <input
                id="site-upload-file-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadFile(file);
                  e.target.value = '';
                }}
              />
              {uploadFile ? (
                <>
                  <FileText className="h-10 w-10 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium text-sm">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium text-sm">{td('drop_zone_text')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{td('drop_zone_hint')}</p>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">{td('upload_notes_label')}</label>
              <Textarea
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                placeholder={td('upload_notes_placeholder')}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeUploadDialog}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4 mr-2" />
              )}
              {td('upload_document')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title={tc('confirm_delete')}
        description={tc('confirm_delete')}
        confirmLabel={tc('confirm')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
      />
    </div>
  );
}
