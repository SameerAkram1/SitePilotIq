'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useSettings, useUpdateSettings } from '@/hooks/api/use-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const financialSchema = z.object({
  defaultCurrency: z.string().optional(),
  defaultVatRate: z.number().min(0).max(100).optional(),
  iban: z.string().max(34).optional(),
  bankName: z.string().max(200).optional(),
  swiftBic: z.string().max(11).optional(),
});

type FinancialFormData = z.infer<typeof financialSchema>;

export function FinancialTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const ts = useTranslations('settings');
  const tc = useTranslations('common');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FinancialFormData>({
    resolver: zodResolver(financialSchema) as any,
  });

  useEffect(() => {
    if (settings) {
      reset({
        defaultCurrency: settings.defaultCurrency,
        defaultVatRate: settings.defaultVatRate,
        iban: settings.iban || '',
        bankName: settings.bankName || '',
        swiftBic: settings.swiftBic || '',
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: FinancialFormData) => {
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4 h-96 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ts('financial_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">{ts('default_currency_label')}</Label>
              <Input id="defaultCurrency" {...register('defaultCurrency')} placeholder="ALL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultVatRate">{ts('default_vat_rate_label')}</Label>
              <Input
                id="defaultVatRate"
                type="number"
                step="0.1"
                {...register('defaultVatRate', { valueAsNumber: true })}
              />
              {errors.defaultVatRate && (
                <p className="text-sm text-red-500">{errors.defaultVatRate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">{ts('iban_label')}</Label>
            <Input id="iban" {...register('iban')} placeholder="AL..." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">{ts('bank_name_label')}</Label>
              <Input id="bankName" {...register('bankName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="swiftBic">{ts('swift_bic_label')}</Label>
              <Input id="swiftBic" {...register('swiftBic')} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tc('saving')}
                </>
              ) : (
                tc('save_changes')
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
