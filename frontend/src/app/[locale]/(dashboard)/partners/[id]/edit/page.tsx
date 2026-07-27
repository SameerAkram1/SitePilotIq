'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePartner, useUpdatePartner } from '@/hooks/api/use-partners';
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
import api from '@/lib/api';

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
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
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

export default function EditPartnerPage() {
  const t = useTranslations('partners.edit');
  const t_new = useTranslations('partners.new');
  const t_status = useTranslations('partners.status');
  const t_risk = useTranslations('partners.risk');
  const t_types = useTranslations('partners.types');
  const t_common = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const partnerId = params.id as string;
  const [error, setError] = useState<string | null>(null);

  const { data: partner, isLoading: loadingPartner } = usePartner(partnerId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema) as any,
  });

  useEffect(() => {
    if (partner) {
      reset({
        name: partner.name || '',
        legalName: partner.legalName || '',
        category: partner.category || 'COMPANY',
        industry: partner.industry || '',
        isClient: partner.isClient || false,
        isSupplier: partner.isSupplier || false,
        isSubcontractor: partner.isSubcontractor || false,
        vatNumber: partner.vatNumber || '',
        registrationNumber: partner.registrationNumber || '',
        contactPerson: partner.contactPerson || '',
        phone: partner.phone || '',
        email: partner.email || '',
        website: partner.website || '',
        street: partner.street || '',
        city: partner.city || '',
        state: partner.state || '',
        postalCode: partner.postalCode || '',
        country: partner.country || 'US',
        paymentTerm: partner.paymentTerm || 'DAYS_30',
        customPaymentDays: partner.customPaymentDays || undefined,
        defaultDiscountPct: partner.defaultDiscountPct || 0,
        taxCategory: partner.taxCategory || '',
        bankName: partner.bankName || '',
        bankAccountIban: partner.bankAccountIban || '',
        swiftBic: partner.swiftBic || '',
        riskLevel: partner.riskLevel || 'LOW',
        notes: '',
      });
    }
  }, [partner, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: PartnerFormData) => {
      const res = await api.patch(`/partners/${partnerId}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      router.push(`/partners/${partnerId}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('failed_update'));
    },
  });

  const onSubmit = (data: PartnerFormData) => {
    setError(null);
    if (!data.isClient && !data.isSupplier && !data.isSubcontractor) {
      setError(t_new('minimum_type_error'));
      return;
    }
    updateMutation.mutate(data);
  };

  if (loadingPartner) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t_common('back')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{partner?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" /> {error}
          </div>
        )}

        <Tabs defaultValue="identification" className="space-y-6">
          <TabsList>
            <TabsTrigger value="identification">{t_new('tab_identification')}</TabsTrigger>
            <TabsTrigger value="contact">{t_new('tab_contact')}</TabsTrigger>
            <TabsTrigger value="financial">{t_new('tab_financial')}</TabsTrigger>
          </TabsList>

          <TabsContent value="identification" className="space-y-6">
            <SectionCard title={t_new('section_basic_info')}>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{t_new('name_label')} <span className="text-red-500">*</span></Label>
                <Input {...register('name')} className="h-11 bg-muted rounded-xl" />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{t_new('legal_name_label')}</Label>
                <Input {...register('legalName')} className="h-11 bg-muted rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t_new('category_label')}</Label>
                  <Select value={watch('category')} onValueChange={(v) => setValue('category', v)}>
                    <SelectTrigger className="h-11 bg-muted rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">{t_new('categories.individual')}</SelectItem>
                      <SelectItem value="COMPANY">{t_new('categories.company')}</SelectItem>
                      <SelectItem value="GOVERNMENT">{t_new('categories.government')}</SelectItem>
                      <SelectItem value="INTERNATIONAL">{t_new('categories.international')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t_new('industry_label')}</Label>
                  <Input {...register('industry')} className="h-11 bg-muted rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t_new('partner_type_label')} <span className="text-red-500">*</span></Label>
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
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <SectionCard title={t_new('section_contact')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t_new('contact_person')}</Label>
                  <Input {...register('contactPerson')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('phone')}</Label>
                  <Input {...register('phone')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('email')}</Label>
                  <Input {...register('email')} type="email" className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('website')}</Label>
                  <Input {...register('website')} className="h-11 bg-muted rounded-xl" />
                </div>
              </div>
            </SectionCard>
            <SectionCard title={t_new('section_address')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>{t_new('street')}</Label>
                  <Input {...register('street')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('city')}</Label>
                  <Input {...register('city')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('state_province')}</Label>
                  <Input {...register('state')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('postal_code')}</Label>
                  <Input {...register('postalCode')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('country')}</Label>
                  <Input {...register('country')} className="h-11 bg-muted rounded-xl" />
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <SectionCard title={t_new('section_financial_details')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t_new('payment_term')}</Label>
                  <Select value={watch('paymentTerm')} onValueChange={(v) => setValue('paymentTerm', v)}>
                    <SelectTrigger className="h-11 bg-muted rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">{t_new('payment_terms.cash')}</SelectItem>
                      <SelectItem value="DAYS_7">{t_new('payment_terms.days_7')}</SelectItem>
                      <SelectItem value="DAYS_15">{t_new('payment_terms.days_15')}</SelectItem>
                      <SelectItem value="DAYS_30">{t_new('payment_terms.days_30')}</SelectItem>
                      <SelectItem value="CUSTOM">{t_new('payment_terms.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('default_discount')}</Label>
                  <Input {...register('defaultDiscountPct')} type="number" className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('risk_level')}</Label>
                  <Select value={watch('riskLevel')} onValueChange={(v) => setValue('riskLevel', v)}>
                    <SelectTrigger className="h-11 bg-muted rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{t_risk('low')}</SelectItem>
                      <SelectItem value="MEDIUM">{t_risk('medium')}</SelectItem>
                      <SelectItem value="HIGH">{t_risk('high')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SectionCard>
            <SectionCard title={t_new('section_bank')}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t_new('bank_name')}</Label>
                  <Input {...register('bankName')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('iban')}</Label>
                  <Input {...register('bankAccountIban')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('swift_bic')}</Label>
                  <Input {...register('swiftBic')} className="h-11 bg-muted rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t_new('tax_category')}</Label>
                  <Input {...register('taxCategory')} className="h-11 bg-muted rounded-xl" />
                </div>
              </div>
            </SectionCard>
            <SectionCard title={t_new('section_notes')}>
              <Textarea {...register('notes')} rows={3} className="bg-muted rounded-xl" placeholder={t_new('notes_placeholder')} />
            </SectionCard>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl">{t('cancel')}</Button>
          <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('saving')}</> : t('save_changes')}
          </Button>
        </div>
      </form>
    </div>
  );
}
