'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useSettings, useUpdateSettings, useUploadLogo } from '@/hooks/api/use-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/file-upload';
import { Loader2 } from 'lucide-react';

const generalSchema = z.object({
  companyName: z.string().min(2).max(200),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  country: z.string().optional(),
  defaultLanguage: z.enum(['en', 'sq', 'it']).optional(),
  timezone: z.string().optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
});

type GeneralFormData = z.infer<typeof generalSchema>;

export function GeneralTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const uploadLogo = useUploadLogo();
  const ts = useTranslations('settings');
  const tc = useTranslations('common');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema) as any,
  });

  useEffect(() => {
    if (settings) {
      reset({
        companyName: settings.companyName,
        website: settings.website || '',
        phone: settings.phone || '',
        email: settings.email || '',
        country: settings.country,
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: GeneralFormData) => {
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4 h-96 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ts('general_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{ts('logo_label')}</Label>
            <FileUpload
              onUpload={(file) => uploadLogo.mutate(file)}
              currentUrl={settings?.logoUrl}
              loading={uploadLogo.isPending}
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">{ts('company_name_label')} *</Label>
                <Input id="companyName" {...register('companyName')} />
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">{ts('website_label')}</Label>
                <Input id="website" {...register('website')} placeholder="https://" />
                {errors.website && (
                  <p className="text-sm text-red-500">{errors.website.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">{ts('phone_label')}</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{ts('email_label')}</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="country">{ts('country_label')}</Label>
                <Input id="country" {...register('country')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">{ts('language_label')}</Label>
                <select
                  id="defaultLanguage"
                  {...register('defaultLanguage')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="en">English</option>
                  <option value="sq">Albanian</option>
                  <option value="it">Italian</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{ts('timezone_label')}</Label>
                <Input id="timezone" {...register('timezone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">{ts('date_format_label')}</Label>
              <select
                id="dateFormat"
                {...register('dateFormat')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
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
        </div>
      </CardContent>
    </Card>
  );
}
