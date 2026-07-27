'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionCard } from '@/components/shared/section-card';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const partnerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  legalName: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  industry: z.string().optional(),
  isClient: z.boolean().optional(),
  isSupplier: z.boolean().optional(),
  isSubcontractor: z.boolean().optional(),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  dunsNumber: z.string().optional(),
  leiCode: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
  creditLimit: z.coerce.number().optional(),
  paymentTerm: z.string().min(1, 'Payment term is required'),
  customPaymentDays: z.coerce.number().optional(),
  defaultDiscountPct: z.coerce.number().min(0).max(100).default(0),
  taxCategory: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountIban: z.string().optional(),
  swiftBic: z.string().optional(),
  riskLevel: z.string().min(1, 'Risk level is required'),
  notes: z.string().max(2000).optional(),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

export default function NewPartnerPage() {
  const t = useTranslations('partners.new');
  const t_status = useTranslations('partners.status');
  const t_risk = useTranslations('partners.risk');
  const t_types = useTranslations('partners.types');
  const t_common = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema) as any,
    defaultValues: {
      isClient: false,
      isSupplier: false,
      isSubcontractor: false,
      category: 'COMPANY',
      paymentTerm: 'DAYS_30',
      riskLevel: 'LOW',
      openingBalance: 0,
      defaultDiscountPct: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PartnerFormData) => {
      const res = await api.post('/partners', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      router.push('/partners');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('failed_create'));
    },
  });

  const onSubmit = async (data: PartnerFormData) => {
    setError(null);

    if (!data.isClient && !data.isSupplier && !data.isSubcontractor) {
      setError(t('minimum_type_error'));
      return;
    }

    createMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t_common('back')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        <Tabs defaultValue="identification" className="space-y-6">
          <TabsList>
            <TabsTrigger value="identification">{t('tab_identification')}</TabsTrigger>
            <TabsTrigger value="contact">{t('tab_contact')}</TabsTrigger>
            <TabsTrigger value="financial">{t('tab_financial')}</TabsTrigger>
          </TabsList>

          <TabsContent value="identification" className="space-y-6">
            <SectionCard title={t('section_basic_info')}>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{t('name_label')} <span className="text-red-500">*</span></Label>
                <Input {...register('name')} placeholder={t('name_placeholder')} className="h-11 bg-muted rounded-xl" />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{t('legal_name_label')} <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input {...register('legalName')} placeholder={t('legal_name_placeholder')} className="h-11 bg-muted rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('category_label')} <span className="text-red-500">*</span></Label>
                  <Select defaultValue="COMPANY" onValueChange={(v) => setValue('category', v)}>
                    <SelectTrigger className="h-11 bg-muted rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">{t('categories.individual')}</SelectItem>
                      <SelectItem value="COMPANY">{t('categories.company')}</SelectItem>
                      <SelectItem value="GOVERNMENT">{t('categories.government')}</SelectItem>
                      <SelectItem value="INTERNATIONAL">{t('categories.international')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('industry_label')} <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input {...register('industry')} placeholder={t('industry_placeholder')} className="h-11 bg-muted rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('partner_type_label')} <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground">{t('partner_type_hint')}</p>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={watch('isClient')} onCheckedChange={(v) => setValue('isClient', v === true)} />
                    <span className="text-sm">{t_types('client')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={watch('isSupplier')} onCheckedChange={(v) => setValue('isSupplier', v === true)} />
                    <span className="text-sm">{t_types('supplier')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={watch('isSubcontractor')} onCheckedChange={(v) => setValue('isSubcontractor', v === true)} />
                    <span className="text-sm">{t_types('subcontractor')}</span>
                  </label>
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t('section_identifiers')}>
              <p className="text-xs text-muted-foreground -mt-2">{t('identifiers_hint')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('vat_number')}</Label>
                  <Input {...register('vatNumber')} placeholder={t('vat_placeholder')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Registration Number</Label>
                  <Input {...register('registrationNumber')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">DUNS Number</Label>
                  <Input {...register('dunsNumber')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">LEI Code</Label>
                  <Input {...register('leiCode')} className="h-11 bg-muted rounded-xl" />
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <SectionCard title={t('section_contact')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('contact_person')}</Label>
                  <Input {...register('contactPerson')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('phone')}</Label>
                  <Input {...register('phone')} placeholder={t('phone_placeholder')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('email')}</Label>
                  <Input {...register('email')} type="email" className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('website')}</Label>
                  <Input {...register('website')} placeholder={t('website_placeholder')} className="h-11 bg-muted rounded-xl" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t('section_address')}>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{t('street')}</Label>
                <Input {...register('street')} className="h-11 bg-muted rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('city')}</Label>
                  <Input {...register('city')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('state_province')}</Label>
                  <Input {...register('state')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('postal_code')}</Label>
                  <Input {...register('postalCode')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('country')}</Label>
                  <Input {...register('country')} defaultValue="US" className="h-11 bg-muted rounded-xl" />
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <SectionCard title={t('section_financial_details')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('opening_balance')}</Label>
                  <Input {...register('openingBalance')} type="number" step="0.01" className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('credit_limit')}</Label>
                  <Input {...register('creditLimit')} type="number" step="0.01" className="h-11 bg-muted rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('payment_term')} <span className="text-red-500">*</span></Label>
                  <Select defaultValue="DAYS_30" onValueChange={(v) => setValue('paymentTerm', v)}>
                    <SelectTrigger className="h-11 bg-muted rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">{t('payment_terms.cash')}</SelectItem>
                      <SelectItem value="DAYS_7">{t('payment_terms.days_7')}</SelectItem>
                      <SelectItem value="DAYS_15">{t('payment_terms.days_15')}</SelectItem>
                      <SelectItem value="DAYS_30">{t('payment_terms.days_30')}</SelectItem>
                      <SelectItem value="CUSTOM">{t('payment_terms.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {watch('paymentTerm') === 'CUSTOM' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">{t('custom_days')} <span className="text-red-500">*</span></Label>
                    <Input {...register('customPaymentDays')} type="number" min="1" max="365" className="h-11 bg-muted rounded-xl" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('default_discount')}</Label>
                  <Input {...register('defaultDiscountPct')} type="number" min="0" max="100" className="h-11 bg-muted rounded-xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{t('tax_category')}</Label>
                <Input {...register('taxCategory')} className="h-11 bg-muted rounded-xl" />
              </div>
            </SectionCard>

            <SectionCard title={t('section_bank')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('bank_name')}</Label>
                  <Input {...register('bankName')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('iban')}</Label>
                  <Input {...register('bankAccountIban')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('swift_bic')}</Label>
                  <Input {...register('swiftBic')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('risk_level')} <span className="text-red-500">*</span></Label>
                  <Select defaultValue="LOW" onValueChange={(v) => setValue('riskLevel', v)}>
                    <SelectTrigger className="h-11 bg-muted rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{t_risk('low')}</SelectItem>
                      <SelectItem value="MEDIUM">{t_risk('medium')}</SelectItem>
                      <SelectItem value="HIGH">{t_risk('high')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{t('risk_auto_hint')}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t('section_notes')}>
              <Textarea {...register('notes')} rows={3} className="bg-muted rounded-xl" placeholder={t('notes_placeholder')} />
            </SectionCard>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl">
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('creating')}</>
            ) : (
              t('create_partner')
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
