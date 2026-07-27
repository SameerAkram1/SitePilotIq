'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePartner, usePartnerLedger } from '@/hooks/api/use-partners';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  Users,
  FileText,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { TypeBadges } from '@/components/shared/type-badges';
import api from '@/lib/api';

export default function PartnerDetailPage() {
  const t = useTranslations('partners.detail');
  const t_status = useTranslations('partners.status');
  const t_risk = useTranslations('partners.risk');
  const t_types = useTranslations('partners.types');
  const t_common = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const partnerId = params.id as string;

  const statusConfig: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: t_status('active'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    INACTIVE: { label: t_status('inactive'), color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
    BLACKLISTED: { label: t_status('blacklisted'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    PROSPECT: { label: t_status('prospect'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    SUSPENDED: { label: t_status('suspended'), color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  };

  const riskConfig: Record<string, { label: string; color: string }> = {
    LOW: { label: t_risk('low'), color: 'bg-green-100 text-green-700' },
    MEDIUM: { label: t_risk('medium'), color: 'bg-yellow-100 text-yellow-700' },
    HIGH: { label: t_risk('high'), color: 'bg-red-100 text-red-700' },
  };
  const [activeTab, setActiveTab] = useState('overview');
  const [noteText, setNoteText] = useState('');

  const { data: partner, isLoading } = usePartner(partnerId);
  const { data: ledgerData } = usePartnerLedger(partnerId);

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/partners/${partnerId}/notes`, { noteText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', 'detail', partnerId] });
      setNoteText('');
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  if (!partner) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">{t('not_found')}</h2>
        <Button variant="link" onClick={() => router.push('/partners')}>{t('back_to_partners')}</Button>
      </div>
    );
  }

  const status = statusConfig[partner.status] || statusConfig.ACTIVE;
  const risk = riskConfig[partner.riskLevel] || riskConfig.LOW;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                {partner.name}
              </h1>
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded">{partner.code}</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${risk.color}`}>
                {t('risk_label', { label: risk.label })}
              </span>
            </div>
            <div className="mt-1">
              <TypeBadges isClient={partner.isClient} isSupplier={partner.isSupplier} isSubcontractor={partner.isSubcontractor} />
            </div>
            <p className="text-muted-foreground text-sm mt-1">{partner.category} • {t('created_label')} {new Date(partner.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/partners/${partnerId}/edit`}>
            <Button variant="outline" className="rounded-xl"><Pencil className="h-4 w-4 mr-2" /> {t('edit')}</Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><Building2 className="h-4 w-4" /> {t('tab_overview')}</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2"><FileText className="h-4 w-4" /> {t('tab_ledger')}</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><MessageSquare className="h-4 w-4" /> {t('tab_notes')}</TabsTrigger>
          <TabsTrigger value="projects" className="gap-2"><Users className="h-4 w-4" /> {t('tab_projects')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('contact_info_title')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_contact_person')}</p><p className="font-medium">{partner.contactPerson || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_phone')}</p><p className="font-medium">{partner.phone || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_email')}</p><p className="font-medium">{partner.email || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_website')}</p><p className="font-medium">{partner.website || '—'}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('address_title')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_street')}</p><p className="font-medium">{partner.street || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_city')}</p><p className="font-medium">{partner.city || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_state_country')}</p><p className="font-medium">{[partner.state, partner.country].filter(Boolean).join(', ') || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_postal_code')}</p><p className="font-medium">{partner.postalCode || '—'}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('financial_title')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_balance')}</p><p className="font-medium">{Number(partner.openingBalance).toLocaleString()}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_credit_limit')}</p><p className="font-medium">{partner.creditLimit ? Number(partner.creditLimit).toLocaleString() : '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_payment_term')}</p><p className="font-medium">{partner.paymentTerm === 'CUSTOM' ? `${partner.customPaymentDays} days` : partner.paymentTerm?.replace(/_/g, ' ')}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_discount')}</p><p className="font-medium">{partner.defaultDiscountPct}%</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('bank_title')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><p className="text-sm text-muted-foreground">{t('field_bank_name')}</p><p className="font-medium">{partner.bankName || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_iban')}</p><p className="font-medium font-mono">{partner.bankAccountIban || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_swift')}</p><p className="font-medium font-mono">{partner.swiftBic || '—'}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('field_tax_category')}</p><p className="font-medium">{partner.taxCategory || '—'}</p></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-6">
          <Card>
            <CardContent className="p-6 text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">{t('ledger_title')}</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {ledgerData?.message || t('ledger_placeholder')}
              </p>
              <div className="mt-6 grid grid-cols-5 gap-4 max-w-2xl mx-auto">
                {[t('ledger_invoiced'), t('ledger_received'), t('ledger_purchased'), t('ledger_paid'), t('ledger_balance')].map((label) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-mono text-muted-foreground">—</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-3 mb-6">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t('notes_placeholder')}
                  rows={2}
                  className="bg-muted rounded-xl"
                />
                <Button
                  className="rounded-xl shrink-0 self-end"
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate()}
                >
                  {t('add_note')}
                </Button>
              </div>
              <div className="space-y-3">
                {partner.partnerNotes?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('no_notes')}</p>
                ) : (
                  partner.partnerNotes?.map((note: any) => (
                    <div key={note.id} className="p-3 rounded-lg border border-border">
                      <p className="text-sm">{note.noteText}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.author?.fullName} • {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardContent className="p-6 text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {partner.isClient ? t('projects_client_hint') : t('projects_non_client_hint')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
