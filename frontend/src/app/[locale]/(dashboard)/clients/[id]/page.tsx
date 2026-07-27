'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  useClient,
  useClientDashboard,
  useAddClientNote,
  useUpdateClientNote,
  useDeleteClientNote,
  useClientReminders,
  useClientExpenses,
  useClientBudgets,
  useCreateClientExpense,
  useCreateClientBudget,
} from '@/hooks/api/use-clients';
import { downloadExpensesExcel, downloadExpensesPdf } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Building2,
  FolderKanban,
  MapPin,
  Users,
  DollarSign,
  FileText,
  MessageSquare,
  CreditCard,
  Receipt,
  Plus,
  X,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Calendar,
  Flag,
  Edit3,
  Download,
} from 'lucide-react';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

type NoteForm = {
  content: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  noteDate: string;
  isReminder: boolean;
  reminderDate: string;
};

const emptyNoteForm: NoteForm = {
  content: '',
  type: 'GENERAL',
  title: '',
  status: 'DRAFT',
  priority: 'MEDIUM',
  noteDate: '',
  isReminder: false,
  reminderDate: '',
};

export default function ClientDetailPage() {
  const t = useTranslations('clients.detail');
  const tc = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [noteForm, setNoteForm] = useState<NoteForm>(emptyNoteForm);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTypeFilter, setNoteTypeFilter] = useState('ALL');

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '', role: '', email: '', phone: '', isPrimary: false,
  });

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: 'INVOICE', description: '', amount: '', taxAmount: '',
    referenceNumber: '', date: new Date().toISOString().split('T')[0],
    dueDate: '', paymentMethod: '', notes: '',
  });

  // Budget form
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    name: '', description: '', totalAmount: '', currencyCode: '', startDate: '', endDate: '',
  });

  const { data: client, isLoading } = useClient(clientId);
  const { data: dashboard } = useClientDashboard(clientId);
  const { data: expenses } = useClientExpenses(clientId, { page: 1, limit: 10 });
  const { data: budgets } = useClientBudgets(clientId);
  const { data: reminders } = useClientReminders(clientId);

  const addNoteMutation = useAddClientNote();
  const updateNoteMutation = useUpdateClientNote();
  const deleteNoteMutation = useDeleteClientNote();
  const createExpenseMutation = useCreateClientExpense();
  const createBudgetMutation = useCreateClientBudget();

  const addContactMutation = (window as any).__addContactMutation || (function() { return { mutate: () => {} }; })();
  const deleteContactMutation = (window as any).__deleteContactMutation || (function() { return { mutate: () => {} }; })();

  // Contact mutations (inline since they're not in a hook)
  const [contactMutations, setContactMutations] = useState({ addPending: false, deletePending: false });

  const statusConfig: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    INACTIVE: { label: 'Inactive', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
    PROSPECT: { label: 'Prospect', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    SUSPENDED: { label: 'Suspended', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    BLACKLISTED: { label: 'Blacklisted', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  const riskConfig: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'bg-green-100 text-green-700' },
    MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    HIGH: { label: 'High', color: 'bg-red-100 text-red-700' },
  };

  const noteTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
    GENERAL: { label: 'General', icon: FileText, color: 'bg-gray-100 text-gray-700' },
    CALL: { label: 'Call', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
    MEETING: { label: 'Meeting', icon: Users, color: 'bg-purple-100 text-purple-700' },
    EMAIL: { label: 'Email', icon: FileText, color: 'bg-cyan-100 text-cyan-700' },
    TASK: { label: 'Task', icon: CheckCircle2, color: 'bg-orange-100 text-orange-700' },
    FOLLOW_UP: { label: 'Follow-up', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  };

  const noteStatusConfig: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
    PLANNED: { label: 'Planned', color: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
    SKIPPED: { label: 'Skipped', color: 'bg-gray-100 text-gray-500' },
  };

  const notePriorityConfig: Record<string, { label: string; color: string; icon: any }> = {
    LOW: { label: 'Low', color: 'text-gray-500', icon: Flag },
    MEDIUM: { label: 'Medium', color: 'text-blue-500', icon: Flag },
    HIGH: { label: 'High', color: 'text-orange-500', icon: Flag },
    URGENT: { label: 'Urgent', color: 'text-red-600', icon: AlertTriangle },
  };

  const expenseTypeConfig: Record<string, { label: string; color: string }> = {
    INVOICE: { label: 'Invoice', color: 'bg-blue-100 text-blue-700' },
    PAYMENT_RECEIVED: { label: 'Payment', color: 'bg-green-100 text-green-700' },
    CREDIT_NOTE: { label: 'Credit Note', color: 'bg-purple-100 text-purple-700' },
    DIRECT_EXPENSE: { label: 'Expense', color: 'bg-orange-100 text-orange-700' },
  };

  const expenseStatusConfig: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">{t('not_found')}</h2>
        <Button variant="link" onClick={() => router.push('/clients')}>{t('back_to_clients')}</Button>
      </div>
    );
  }

  const status = statusConfig[client.status] || statusConfig.ACTIVE;
  const risk = riskConfig[client.riskLevel] || riskConfig.LOW;
  const stats = dashboard?.stats;

  // Notes
  const filteredNotes = client.clientNotes?.filter((n: any) =>
    noteTypeFilter === 'ALL' || n.type === noteTypeFilter
  ) || [];

  const handleSaveNote = () => {
    if (!noteForm.title.trim()) return;

    const payload: any = {
      content: noteForm.content || undefined,
      type: noteForm.type,
      title: noteForm.title,
      status: noteForm.status,
      priority: noteForm.priority,
      isReminder: noteForm.isReminder,
    };

    const typesWithDate = ['CALL', 'MEETING', 'TASK', 'FOLLOW_UP'];
    if (typesWithDate.includes(noteForm.type) && noteForm.noteDate) {
      payload.noteDate = new Date(noteForm.noteDate + 'T00:00:00.000Z').toISOString();
    }

    if (noteForm.isReminder && noteForm.reminderDate) {
      payload.reminderDate = new Date(noteForm.reminderDate + 'T00:00:00.000Z').toISOString();
    }

    if (editingNoteId) {
      updateNoteMutation.mutate(
        { clientId, noteId: editingNoteId, data: payload },
        { onSuccess: () => { setNoteForm(emptyNoteForm); setEditingNoteId(null); } }
      );
    } else {
      addNoteMutation.mutate(
        { id: clientId, data: payload },
        { onSuccess: () => setNoteForm(emptyNoteForm) }
      );
    }
  };

  const handleEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setNoteForm({
      content: note.content || '',
      type: note.type,
      title: note.title || '',
      status: note.status,
      priority: note.priority,
      noteDate: note.noteDate ? new Date(note.noteDate).toISOString().split('T')[0] : '',
      isReminder: note.isReminder,
      reminderDate: note.reminderDate ? new Date(note.reminderDate).toISOString().split('T')[0] : '',
    });
  };

  const handleDeleteNote = (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    deleteNoteMutation.mutate({ clientId, noteId });
  };

  const handleCreateExpense = () => {
    createExpenseMutation.mutate(
      {
        clientId,
        data: {
          ...expenseForm,
          amount: Number(expenseForm.amount),
          taxAmount: expenseForm.taxAmount ? Number(expenseForm.taxAmount) : undefined,
        },
      },
      {
        onSuccess: () => {
          setShowExpenseForm(false);
          setExpenseForm({
            type: 'INVOICE', description: '', amount: '', taxAmount: '',
            referenceNumber: '', date: new Date().toISOString().split('T')[0],
            dueDate: '', paymentMethod: '', notes: '',
          });
        },
      }
    );
  };

  const handleCreateBudget = () => {
    createBudgetMutation.mutate(
      {
        clientId,
        data: {
          name: budgetForm.name,
          description: budgetForm.description || undefined,
          totalAmount: Number(budgetForm.totalAmount),
          currencyCode: budgetForm.currencyCode || undefined,
          startDate: budgetForm.startDate ? new Date(budgetForm.startDate + 'T00:00:00.000Z').toISOString() : undefined,
          endDate: budgetForm.endDate ? new Date(budgetForm.endDate + 'T00:00:00.000Z').toISOString() : undefined,
        },
      },
      {
        onSuccess: () => {
          setShowBudgetForm(false);
          setBudgetForm({ name: '', description: '', totalAmount: '', currencyCode: '', startDate: '', endDate: '' });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded">{client.code}</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${risk.color}`}>
                {risk.label} Risk
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {client.category} • Created {new Date(client.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Link href={`/clients/${clientId}/edit`}>
          <Button variant="outline" className="rounded-xl"><Pencil className="h-4 w-4 mr-2" />{tc('edit')}</Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><Building2 className="h-4 w-4" />{t('tab_overview')}</TabsTrigger>
          <TabsTrigger value="projects" className="gap-2"><FolderKanban className="h-4 w-4" />{t('tab_projects')}</TabsTrigger>
          <TabsTrigger value="sites" className="gap-2"><MapPin className="h-4 w-4" />{t('tab_sites')}</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2"><Users className="h-4 w-4" />{t('tab_contacts')}</TabsTrigger>
          <TabsTrigger value="budgets" className="gap-2"><CreditCard className="h-4 w-4" />{t('tab_budgets')}</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2"><Receipt className="h-4 w-4" />{t('tab_expenses')}</TabsTrigger>
          <TabsTrigger value="financial" className="gap-2"><DollarSign className="h-4 w-4" />{t('tab_financial')}</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><MessageSquare className="h-4 w-4" />{t('tab_notes')}</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="mt-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: t('stat_projects'), value: stats.activeProjects, sub: `${stats.totalProjects} total` },
                { label: t('stat_sites'), value: stats.activeSites, sub: `${stats.totalSites} total` },
                { label: t('stat_invoiced'), value: `${client.currencyCode} ${stats.totalInvoiced.toLocaleString()}`, sub: '' },
                { label: t('stat_outstanding'), value: `${client.currencyCode} ${stats.outstanding.toLocaleString()}`, sub: '' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                    {stat.sub && <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Upcoming Reminders Widget */}
          {reminders && (reminders.upcoming?.length > 0 || reminders.overdue?.length > 0) && (
            <div className="mb-6">
              <Card className="border-orange-200 dark:border-orange-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-500" />
                    Reminders
                    {reminders.overdue?.length > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {reminders.overdue.length} overdue
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Overdue */}
                  {reminders.overdue?.map((r: any) => {
                    const priorityCfg = notePriorityConfig[r.priority] || notePriorityConfig.MEDIUM;
                    const typeCfg = noteTypeConfig[r.type] || noteTypeConfig.GENERAL;
                    return (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-red-700">OVERDUE</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${typeCfg.color}`}>{typeCfg.label}</span>
                              <span className={`text-xs ${priorityCfg.color}`}>{priorityCfg.label}</span>
                            </div>
                            <p className="text-sm font-medium mt-0.5">{r.title || r.content.slice(0, 60)}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(r.reminderDate).toLocaleDateString()} • {r.author?.fullName}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Upcoming */}
                  {reminders.upcoming?.map((r: any) => {
                    const priorityCfg = notePriorityConfig[r.priority] || notePriorityConfig.MEDIUM;
                    const typeCfg = noteTypeConfig[r.type] || noteTypeConfig.GENERAL;
                    const daysUntil = Math.ceil((new Date(r.reminderDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-blue-700">IN {daysUntil}d</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${typeCfg.color}`}>{typeCfg.label}</span>
                              <span className={`text-xs ${priorityCfg.color}`}>{priorityCfg.label}</span>
                            </div>
                            <p className="text-sm font-medium mt-0.5">{r.title || r.content.slice(0, 60)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.reminderDate).toLocaleDateString()} • {r.author?.fullName}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t('section_contact')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_email')}</p><p className="font-medium">{client.email || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_phone')}</p><p className="font-medium">{client.phone || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_website')}</p><p className="font-medium">{client.website || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_industry')}</p><p className="font-medium">{client.industry || '—'}</p></div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t('section_address')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_street')}</p><p className="font-medium">{client.street || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_city')}</p><p className="font-medium">{client.city || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_state_country')}</p><p className="font-medium">{[client.state, client.country].filter(Boolean).join(', ') || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_postal_code')}</p><p className="font-medium">{client.postalCode || '—'}</p></div>
              </CardContent>
            </Card>

            {/* Financial */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t('section_financial')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_currency')}</p><p className="font-medium">{client.currencyCode}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_credit_limit')}</p><p className="font-medium">{client.creditLimit ? Number(client.creditLimit).toLocaleString() : '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_payment_term')}</p><p className="font-medium">{client.paymentTerm === 'CUSTOM' ? `${client.customPaymentDays} days` : client.paymentTerm?.replace(/_/g, ' ')}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_opening_balance')}</p><p className="font-medium">{Number(client.openingBalance).toLocaleString()}</p></div>
              </CardContent>
            </Card>

            {/* Tax / Legal */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t('section_legal')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_vat_number')}</p><p className="font-medium font-mono">{client.vatNumber || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_registration_number')}</p><p className="font-medium">{client.registrationNumber || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_legal_name')}</p><p className="font-medium">{client.legalName || '—'}</p></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== PROJECTS TAB ===== */}
        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardContent className="p-6">
              {dashboard?.projects?.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('no_projects')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard?.projects?.map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.code} • {project._count?.sites || 0} sites</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>{project.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SITES TAB ===== */}
        <TabsContent value="sites" className="mt-6">
          <Card>
            <CardContent className="p-6">
              {dashboard?.activeSites?.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('no_sites')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard?.activeSites?.map((site: any) => (
                    <div key={site.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/sites/${site.id}`)}>
                      <div>
                        <p className="font-medium">{site.name}</p>
                        <p className="text-sm text-muted-foreground">{site.code} • {site.project?.name}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CONTACTS TAB ===== */}
        <TabsContent value="contacts" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t('tab_contacts')}</h3>
                <Button size="sm" onClick={() => setShowContactForm(true)}><Plus className="h-4 w-4 mr-1" />Add Contact</Button>
              </div>
              {showContactForm && (
                <div className="mb-4 p-4 rounded-xl border border-border bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">New Contact</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowContactForm(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Full name *" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                    <Input placeholder="Role (e.g. Project Manager)" value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Email" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                    <Input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={contactForm.isPrimary} onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })} className="rounded" />
                    Primary contact
                  </label>
                  <Button onClick={() => {}} disabled={!contactForm.name}>{tc('save')}</Button>
                </div>
              )}
              {client.contacts?.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('no_contacts')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.contacts?.map((contact: any) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                          {contact.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{contact.name}</p>
                            {contact.isPrimary && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Primary</span>}
                          </div>
                          {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground">
                          {contact.email && <p>{contact.email}</p>}
                          {contact.phone && <p>{contact.phone}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BUDGETS TAB ===== */}
        <TabsContent value="budgets" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t('section_budgets')}</h3>
                <Button size="sm" onClick={() => setShowBudgetForm(true)}><Plus className="h-4 w-4 mr-1" />{t('add_budget')}</Button>
              </div>
              {showBudgetForm && (
                <div className="mb-4 p-4 rounded-xl border border-border bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{t('new_budget')}</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowBudgetForm(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <Input placeholder={t('budget_name')} value={budgetForm.name} onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder={t('budget_amount')} value={budgetForm.totalAmount} onChange={(e) => setBudgetForm({ ...budgetForm, totalAmount: e.target.value })} />
                    <select className="h-10 w-full bg-muted rounded-xl px-3 text-sm border border-input" value={budgetForm.currencyCode} onChange={(e) => setBudgetForm({ ...budgetForm, currencyCode: e.target.value })}>
                      <option value="">Currency</option>
                      <option value="USD">USD – US Dollar</option>
                      <option value="EUR">EUR – Euro</option>
                      <option value="GBP">GBP – British Pound</option>
                      <option value="AED">AED – UAE Dirham</option>
                      <option value="SAR">SAR – Saudi Riyal</option>
                      <option value="QAR">QAR – Qatari Riyal</option>
                      <option value="KWD">KWD – Kuwaiti Dinar</option>
                      <option value="BHD">BHD – Bahraini Dinar</option>
                      <option value="OMR">OMR – Omani Rial</option>
                      <option value="INR">INR – Indian Rupee</option>
                      <option value="PKR">PKR – Pakistani Rupee</option>
                      <option value="CAD">CAD – Canadian Dollar</option>
                      <option value="AUD">AUD – Australian Dollar</option>
                      <option value="CHF">CHF – Swiss Franc</option>
                      <option value="CNY">CNY – Chinese Yuan</option>
                      <option value="JPY">JPY – Japanese Yen</option>
                      <option value="TRY">TRY – Turkish Lira</option>
                      <option value="EGP">EGP – Egyptian Pound</option>
                      <option value="ZAR">ZAR – South African Rand</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <Input type="date" value={budgetForm.startDate} onChange={(e) => setBudgetForm({ ...budgetForm, startDate: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End Date</Label>
                      <Input type="date" value={budgetForm.endDate} onChange={(e) => setBudgetForm({ ...budgetForm, endDate: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={handleCreateBudget} disabled={!budgetForm.name || !budgetForm.totalAmount || createBudgetMutation.isPending}>
                    {createBudgetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{tc('save')}
                  </Button>
                </div>
              )}
              {budgets?.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('no_budgets')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets?.map((budget: any) => {
                    const pct = budget.totalAmount > 0 ? (Number(budget.spentAmount) / Number(budget.totalAmount)) * 100 : 0;
                    return (
                      <div key={budget.id} className="p-3 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{budget.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${budget.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{budget.status}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                          <span>{Number(budget.spentAmount).toLocaleString()} / {Number(budget.totalAmount).toLocaleString()}</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== EXPENSES TAB ===== */}
        <TabsContent value="expenses" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t('section_expenses')}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      const blob = await downloadExpensesExcel(clientId);
                      const url = window.URL.createObjectURL(new Blob([blob]));
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `expenses-${clientId}.xlsx`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch { toast.error('Export failed'); }
                  }}><Download className="h-4 w-4 mr-1" />Export Excel</Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      const blob = await downloadExpensesPdf(clientId);
                      const url = window.URL.createObjectURL(new Blob([blob]));
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `expenses-${clientId}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch { toast.error('Export failed'); }
                  }}><FileText className="h-4 w-4 mr-1" />Export PDF</Button>
                  <Button size="sm" onClick={() => setShowExpenseForm(true)}><Plus className="h-4 w-4 mr-1" />{t('add_expense')}</Button>
                </div>
              </div>
              {showExpenseForm && (
                <div className="mb-4 p-4 rounded-xl border border-border bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{t('new_expense')}</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowExpenseForm(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select className="h-10 bg-muted rounded-xl px-3 text-sm border border-input" value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
                      <option value="INVOICE">Invoice</option>
                      <option value="PAYMENT_RECEIVED">Payment Received</option>
                      <option value="CREDIT_NOTE">Credit Note</option>
                      <option value="DIRECT_EXPENSE">Direct Expense</option>
                    </select>
                    <Input placeholder={t('expense_reference')} value={expenseForm.referenceNumber} onChange={(e) => setExpenseForm({ ...expenseForm, referenceNumber: e.target.value })} />
                  </div>
                  <Input placeholder={t('expense_description')} value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                  <div className="grid grid-cols-3 gap-3">
                    <Input type="number" placeholder={t('expense_amount')} value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                    <Input type="number" placeholder={t('expense_tax')} value={expenseForm.taxAmount} onChange={(e) => setExpenseForm({ ...expenseForm, taxAmount: e.target.value })} />
                    <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                  </div>
                  <Button onClick={handleCreateExpense} disabled={!expenseForm.description || !expenseForm.amount || createExpenseMutation.isPending}>
                    {createExpenseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{tc('save')}
                  </Button>
                </div>
              )}
              {expenses?.data?.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('no_expenses')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses?.data?.map((expense: any) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${expenseTypeConfig[expense.type]?.color || ''}`}>
                          {expenseTypeConfig[expense.type]?.label || expense.type}
                        </span>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">{expense.referenceNumber || '—'} • {new Date(expense.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{Number(expense.totalAmount).toLocaleString()}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${expenseStatusConfig[expense.status] || ''}`}>{expense.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FINANCIAL TAB ===== */}
        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardContent className="p-6 text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">{t('section_financial')}</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {t('financial_placeholder')}
              </p>
              {stats && (
                <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t('stat_invoiced')}</p>
                    <p className="text-lg font-mono">{stats.totalInvoiced.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t('stat_paid')}</p>
                    <p className="text-lg font-mono text-green-600">{stats.totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t('stat_outstanding')}</p>
                    <p className="text-lg font-mono text-red-600">{stats.outstanding.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== NOTES TAB ===== */}
        <TabsContent value="notes" className="mt-6">
          <div className="space-y-4">
            {/* Note Form */}
            <Card>
              <CardContent className="p-5">
                <div className="space-y-4">
                  {/* Row 1: Type + Title */}
                  <div className="flex gap-3">
                    <select
                      className="h-10 w-36 bg-muted rounded-xl px-3 text-sm border border-input shrink-0"
                      value={noteForm.type}
                      onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value, noteDate: '' })}
                    >
                      <option value="GENERAL">General</option>
                      <option value="CALL">Call</option>
                      <option value="MEETING">Meeting</option>
                      <option value="EMAIL">Email</option>
                      <option value="TASK">Task</option>
                      <option value="FOLLOW_UP">Follow-up</option>
                    </select>
                    <Input
                      placeholder="What's this about? *"
                      value={noteForm.title}
                      onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSaveNote()}
                    />
                  </div>

                  {/* Row 2: Content (optional) */}
                  <textarea
                    className="w-full h-16 bg-muted rounded-xl px-3 py-2 text-sm border border-input resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
                    placeholder="Add details (optional)..."
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  />

                  {/* Row 3: Date (only for action types) + Priority + Status */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {['CALL', 'MEETING', 'TASK', 'FOLLOW_UP'].includes(noteForm.type) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          className="w-40 h-9"
                          value={noteForm.noteDate}
                          onChange={(e) => setNoteForm({ ...noteForm, noteDate: e.target.value })}
                        />
                      </div>
                    )}

                    <select
                      className="h-9 bg-muted rounded-lg px-2 text-xs border border-input"
                      value={noteForm.priority}
                      onChange={(e) => setNoteForm({ ...noteForm, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>

                    <select
                      className="h-9 bg-muted rounded-lg px-2 text-xs border border-input"
                      value={noteForm.status}
                      onChange={(e) => setNoteForm({ ...noteForm, status: e.target.value })}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PLANNED">Planned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>

                    <div className="flex-1" />

                    {/* Reminder */}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        checked={noteForm.isReminder}
                        onChange={(e) => setNoteForm({ ...noteForm, isReminder: e.target.checked, reminderDate: '' })}
                        className="rounded border-input"
                      />
                      <Bell className="h-3.5 w-3.5" />
                      Reminder
                    </label>
                    {noteForm.isReminder && (
                      <Input
                        type="date"
                        className="w-36 h-9"
                        value={noteForm.reminderDate}
                        onChange={(e) => setNoteForm({ ...noteForm, reminderDate: e.target.value })}
                      />
                    )}

                    {editingNoteId && (
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => { setEditingNoteId(null); setNoteForm(emptyNoteForm); }}>
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-8 px-4"
                      disabled={!noteForm.title.trim() || addNoteMutation.isPending || updateNoteMutation.isPending}
                      onClick={handleSaveNote}
                    >
                      {(addNoteMutation.isPending || updateNoteMutation.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      {editingNoteId ? 'Update' : 'Add Note'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes List */}
            <Card>
              <CardContent className="p-4">
                {/* Type filter */}
                <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${noteTypeFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setNoteTypeFilter('ALL')}
                  >
                    All
                  </button>
                  {Object.entries(noteTypeConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${noteTypeFilter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setNoteTypeFilter(key)}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('no_notes')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredNotes.map((note: any) => {
                      const typeCfg = noteTypeConfig[note.type] || noteTypeConfig.GENERAL;
                      const statusCfg = noteStatusConfig[note.status] || noteStatusConfig.DRAFT;
                      const priorityCfg = notePriorityConfig[note.priority] || notePriorityConfig.MEDIUM;
                      const PriorityIcon = priorityCfg.icon;
                      const isOverdue = note.isReminder && note.reminderDate && new Date(note.reminderDate) < new Date() && !['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(note.status);

                      return (
                        <div
                          key={note.id}
                          className={`group p-3.5 rounded-xl border transition-colors ${
                            isOverdue
                              ? 'border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/30'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Title + badges */}
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h4 className="text-sm font-semibold truncate">{note.title || note.content?.slice(0, 50)}</h4>
                                <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-medium ${typeCfg.color}`}>
                                  {typeCfg.label}
                                </span>
                                {note.status !== 'DRAFT' && (
                                  <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${statusCfg.color}`}>
                                    {statusCfg.label}
                                  </span>
                                )}
                                {note.priority !== 'MEDIUM' && (
                                  <span className={`inline-flex items-center gap-0.5 text-[11px] ${priorityCfg.color}`}>
                                    <PriorityIcon className="h-3 w-3" />
                                    {priorityCfg.label}
                                  </span>
                                )}
                                {note.isReminder && (
                                  <span className={`inline-flex items-center gap-1 text-[11px] ${isOverdue ? 'text-red-600 font-medium' : 'text-blue-600'}`}>
                                    <Bell className="h-3 w-3" />
                                    {isOverdue ? 'Overdue' : new Date(note.reminderDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {/* Content */}
                              {note.content && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
                              )}

                              {/* Meta */}
                              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                <span className="font-medium">{note.author?.fullName}</span>
                                <span>·</span>
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                {note.noteDate && new Date(note.noteDate).getFullYear() > 2000 && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(note.noteDate).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditNote(note)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
