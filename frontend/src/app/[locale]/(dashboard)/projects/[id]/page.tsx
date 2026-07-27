'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getProject,
  disableProject,
  getSites,
  uploadProjectAttachment,
  updateProjectAttachment,
  downloadProjectAttachment,
  deleteProjectAttachment,
} from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  FolderKanban,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  Pause,
  XCircle,
  Download,
  Eye,
  Save,
  X,
  FileImage,
  FileSpreadsheet,
  File,
  UploadCloud,
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

const statusConfig: Record<string, { color: string; icon: any }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock },
  ACTIVE: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  ON_HOLD: { color: 'bg-yellow-100 text-yellow-700', icon: Pause },
  COMPLETED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  CANCELLED: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const td = useTranslations('projects.detail');
  const ts = useTranslations('projects.status');
  const tc = useTranslations('common');
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingAttId, setEditingAttId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });

  const { data: sitesData } = useQuery({
    queryKey: ['sites', { projectId }],
    queryFn: () => getSites({ projectId }),
    enabled: activeTab === 'sites',
  });

  const uploadMutation = useMutation({
    mutationFn: (vars: { file: File; description?: string }) =>
      uploadProjectAttachment(projectId, vars.file, vars.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      closeUploadDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { attachmentId: string; description: string }) =>
      updateProjectAttachment(projectId, vars.attachmentId, { description: vars.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setEditingAttId(null);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (attachmentId: string) => downloadProjectAttachment(projectId, attachmentId),
    onSuccess: (data) => {
      window.open(data.signedUrl, '_blank');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteProjectAttachment(projectId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">{td('not_found')}</h2>
        <Button variant="link" onClick={() => router.push('/projects')}>
          {td('back_to_projects')}
        </Button>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;
  const sites = sitesData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-xl mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                {project.name}
              </h1>
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {project.code}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {ts((project.status || 'DRAFT').toLowerCase())}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {project.category?.name || td('no_category')} • {td('created_label', { date: new Date(project.createdAt).toLocaleDateString() })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}/edit`}>
            <Button variant="outline" className="rounded-xl">
              <Pencil className="h-4 w-4 mr-2" />
              {td('edit')}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-xl text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm(td('disable_confirm'))) {
                disableMutation.mutate(projectId);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {td('disable')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            {td('tab_overview')}
          </TabsTrigger>
          <TabsTrigger value="sites" className="gap-2">
            <MapPin className="h-4 w-4" />
            {td('tab_sites', { count: project.sites?.length || 0 })}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            {td('tab_documents', { count: project.attachments?.length || 0 })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_pm')}</h3>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {project.projectManager?.fullName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{project.projectManager?.fullName}</p>
                      <p className="text-sm text-muted-foreground">{project.projectManager?.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_category')}</h3>
                  <p className="font-medium">{project.category?.name || '—'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_start_date')}</h3>
                  <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_deadline')}</h3>
                  <p className="font-medium">
                    {project.deadline
                      ? new Date(project.deadline).toLocaleDateString()
                      : td('no_deadline')}
                  </p>
                </div>

                {project.summary && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">{td('field_summary')}</h3>
                    <p className="text-sm">{project.summary}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{td('sites_title')}</CardTitle>
              <Link href={`/sites/new?projectId=${projectId}`}>
                <Button size="sm" className="rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  {td('add_site')}
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {sites.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{td('no_sites')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{td('sites_table_code')}</TableHead>
                      <TableHead>{td('sites_table_name')}</TableHead>
                      <TableHead>{td('sites_table_manager')}</TableHead>
                      <TableHead>{td('sites_table_status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.map((site: any) => (
                      <TableRow
                        key={site.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/sites/${site.id}`)}
                      >
                        <TableCell className="font-mono text-sm">{site.code}</TableCell>
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>{site.siteManager?.fullName || '—'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {site.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{td('documents_title')}</CardTitle>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => setUploadOpen(true)}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {td('upload_document')}
              </Button>
            </CardHeader>
            <CardContent>
              {project.attachments?.length === 0 || !project.attachments ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{td('no_documents')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.attachments?.map((att: any) => {
                    const FileIcon = getFileIcon(att.mimeType);
                    const iconColor = getFileColor(att.mimeType);
                    const isEditing = editingAttId === att.id;
                    const isImage = att.mimeType.startsWith('image/');
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

                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="text"
                                  value={editingNote}
                                  onChange={(e) => setEditingNote(e.target.value)}
                                  placeholder={td('description_placeholder')}
                                  className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
                                  autoFocus
                                />
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600"
                                  onClick={() => updateMutation.mutate({ attachmentId: att.id, description: editingNote })}
                                  disabled={updateMutation.isPending}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground"
                                  onClick={() => setEditingAttId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : att.description ? (
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
                                    {isExpanded ? td('show_less') : td('show_more')}
                                  </button>
                                )}
                              </div>
                            ) : null}

                            <div className="flex items-center gap-2 mt-2">
                              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                                {att.uploadedBy?.fullName?.charAt(0) || '?'}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {att.uploadedBy?.fullName || td('unknown_user')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isImage && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-purple-500 hover:text-purple-600"
                                onClick={() => downloadMutation.mutate(att.id)} title={td('view')}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                              onClick={() => downloadMutation.mutate(att.id)} title={td('download')}>
                              <Download className="h-4 w-4" />
                            </Button>
                            {!isEditing && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditingAttId(att.id); setEditingNote(att.description || ''); }}
                                title={td('edit_description')}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => { if (confirm(td('delete_document_confirm'))) deleteMutation.mutate(att.id); }}>
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
                  onClick={() => document.getElementById('upload-file-input')?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : uploadFile
                        ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
                        : 'border-border hover:border-muted-foreground/50 bg-muted/30'
                  }`}
                >
                  <input
                    id="upload-file-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
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
                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploadMutation.isPending}
                >
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
