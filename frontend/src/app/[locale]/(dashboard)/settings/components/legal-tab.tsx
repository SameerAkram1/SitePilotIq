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

const legalSchema = z.object({
  vatNumber: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
});

type LegalFormData = z.infer<typeof legalSchema>;

export function LegalTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const ts = useTranslations('settings');
  const tc = useTranslations('common');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LegalFormData>({
    resolver: zodResolver(legalSchema) as any,
  });

  useEffect(() => {
    if (settings) {
      reset({
        vatNumber: settings.vatNumber || '',
        taxId: settings.taxId || '',
        registrationNumber: settings.registrationNumber || '',
        street: settings.street || '',
        city: settings.city || '',
        state: settings.state || '',
        postalCode: settings.postalCode || '',
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: LegalFormData) => {
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4 h-96 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ts('legal_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vatNumber">{ts('vat_number_label')}</Label>
              <Input id="vatNumber" {...register('vatNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">{ts('tax_id_label')}</Label>
              <Input id="taxId" {...register('taxId')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">{ts('reg_number_label')}</Label>
              <Input id="registrationNumber" {...register('registrationNumber')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">{ts('street_label')}</Label>
            <Input id="street" {...register('street')} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">{ts('city_label')}</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{ts('state_label')}</Label>
              <Input id="state" {...register('state')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">{ts('postal_code_label')}</Label>
              <Input id="postalCode" {...register('postalCode')} />
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
