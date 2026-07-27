'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useClient, useUpdateClient } from '@/hooks/api/use-clients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Building2, MapPin, CreditCard } from 'lucide-react';

export default function EditClientPage() {
  const t = useTranslations('clients.edit');
  const tc = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const { data: client, isLoading } = useClient(clientId);
  const updateMutation = useUpdateClient();

  const [form, setForm] = useState({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    website: '',
    category: 'COMPANY',
    industry: '',
    vatNumber: '',
    registrationNumber: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    currencyCode: 'USD',
    creditLimit: '',
    paymentTerm: 'DAYS_30',
    customPaymentDays: '',
    openingBalance: '0',
    riskLevel: 'LOW',
    status: 'ACTIVE',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        legalName: client.legalName || '',
        email: client.email || '',
        phone: client.phone || '',
        website: client.website || '',
        category: client.category || 'COMPANY',
        industry: client.industry || '',
        vatNumber: client.vatNumber || '',
        registrationNumber: client.registrationNumber || '',
        street: client.street || '',
        city: client.city || '',
        state: client.state || '',
        postalCode: client.postalCode || '',
        country: client.country || '',
        currencyCode: client.currencyCode || 'USD',
        creditLimit: client.creditLimit ? String(client.creditLimit) : '',
        paymentTerm: client.paymentTerm || 'DAYS_30',
        customPaymentDays: client.customPaymentDays ? String(client.customPaymentDays) : '',
        openingBalance: client.openingBalance ? String(client.openingBalance) : '0',
        riskLevel: client.riskLevel || 'LOW',
        status: client.status || 'ACTIVE',
        notes: client.notes || '',
      });
    }
  }, [client]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = t('validation.name_required');
    if (form.paymentTerm === 'CUSTOM' && !form.customPaymentDays) {
      newErrors.customPaymentDays = t('validation.custom_days_required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    updateMutation.mutate(
      {
        id: clientId,
        data: {
          ...form,
          creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
          openingBalance: form.openingBalance ? Number(form.openingBalance) : 0,
          customPaymentDays: form.customPaymentDays ? Number(form.customPaymentDays) : undefined,
        },
      },
      {
        onSuccess: () => {
          router.push(`/clients/${clientId}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{client?.name}</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-2"><Building2 className="h-4 w-4" />{t('tab_general')}</TabsTrigger>
          <TabsTrigger value="address" className="gap-2"><MapPin className="h-4 w-4" />{t('tab_address')}</TabsTrigger>
          <TabsTrigger value="financial" className="gap-2"><CreditCard className="h-4 w-4" />{t('tab_financial')}</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('section_basic')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_name')} *</Label>
                  <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label>{t('field_legal_name')}</Label>
                  <Input value={form.legalName} onChange={(e) => updateField('legalName', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_email')}</Label>
                  <Input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                </div>
                <div>
                  <Label>{t('field_phone')}</Label>
                  <Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_website')}</Label>
                  <Input value={form.website} onChange={(e) => updateField('website', e.target.value)} />
                </div>
                <div>
                  <Label>{t('field_category')}</Label>
                  <select className="h-10 w-full bg-muted rounded-xl px-3 text-sm border border-input" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                    <option value="COMPANY">Company</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="GOVERNMENT">Government</option>
                    <option value="INTERNATIONAL">International</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_industry')}</Label>
                  <Input value={form.industry} onChange={(e) => updateField('industry', e.target.value)} />
                </div>
                <div>
                  <Label>{t('field_status')}</Label>
                  <select className="h-10 w-full bg-muted rounded-xl px-3 text-sm border border-input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="BLACKLISTED">Blacklisted</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address */}
        <TabsContent value="address" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('section_address')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('field_street')}</Label>
                <Input value={form.street} onChange={(e) => updateField('street', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_city')}</Label>
                  <Input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                </div>
                <div>
                  <Label>{t('field_state')}</Label>
                  <Input value={form.state} onChange={(e) => updateField('state', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_postal_code')}</Label>
                  <Input value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} />
                </div>
                <div>
                  <Label>{t('field_country')}</Label>
                  <Input value={form.country} onChange={(e) => updateField('country', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial */}
        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('section_financial')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_currency')}</Label>
                  <Input value={form.currencyCode} onChange={(e) => updateField('currencyCode', e.target.value)} />
                </div>
                <div>
                  <Label>{t('field_credit_limit')}</Label>
                  <Input type="number" value={form.creditLimit} onChange={(e) => updateField('creditLimit', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_payment_term')}</Label>
                  <select className="h-10 w-full bg-muted rounded-xl px-3 text-sm border border-input" value={form.paymentTerm} onChange={(e) => updateField('paymentTerm', e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="DAYS_7">Net 7</option>
                    <option value="DAYS_15">Net 15</option>
                    <option value="DAYS_30">Net 30</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                {form.paymentTerm === 'CUSTOM' && (
                  <div>
                    <Label>{t('field_custom_days')}</Label>
                    <Input type="number" value={form.customPaymentDays} onChange={(e) => updateField('customPaymentDays', e.target.value)} />
                    {errors.customPaymentDays && <p className="text-red-500 text-xs mt-1">{errors.customPaymentDays}</p>}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('field_opening_balance')}</Label>
                  <Input type="number" value={form.openingBalance} onChange={(e) => updateField('openingBalance', e.target.value)} />
                </div>
                <div>
                  <Label>{t('field_risk_level')}</Label>
                  <select className="h-10 w-full bg-muted rounded-xl px-3 text-sm border border-input" value={form.riskLevel} onChange={(e) => updateField('riskLevel', e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>{t('field_notes')}</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-input resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => router.back()}>{tc('cancel')}</Button>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {tc('save')}
        </Button>
      </div>
    </div>
  );
}
