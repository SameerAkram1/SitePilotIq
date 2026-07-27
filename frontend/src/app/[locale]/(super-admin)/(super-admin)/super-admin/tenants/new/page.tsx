'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const createTenantSchema = z.object({
  tenantName: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]{3,50}$/, 'Lowercase alphanumeric with hyphens, 3-50 chars'),
  adminEmail: z.string().email(),
  adminFullName: z.string().min(2).max(100),
  country: z.string().optional(),
  defaultCurrency: z.string().optional(),
  defaultLanguage: z.enum(['en', 'sq', 'it']).optional(),
  timezone: z.string().optional(),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;

export default function NewTenantPage() {
  const router = useRouter();
  const t = useTranslations('super_admin');
  const tCommon = useTranslations('common');
  const [createdTenant, setCreatedTenant] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema) as any,
    defaultValues: {
      country: 'AL',
      defaultCurrency: 'ALL',
      defaultLanguage: 'en',
      timezone: 'Europe/Tirane',
    },
  });

  const tenantName = watch('tenantName');

  const createTenant = useMutation({
    mutationFn: async (data: CreateTenantFormData) => {
      const response = await api.post('/tenants', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      setCreatedTenant(data);
      toast.success('Tenant created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || tCommon('something_went_wrong'));
    },
  });

  const onSubmit = (data: CreateTenantFormData) => {
    createTenant.mutate(data);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
    setValue('slug', slug);
  };

  const copyPassword = () => {
    if (createdTenant?.tempPassword) {
      navigator.clipboard.writeText(createdTenant.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdTenant) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tenant Created" />
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-green-600">Success!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{createdTenant.tenant.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admin Email</p>
              <p className="font-medium">{createdTenant.adminUser.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tCommon('password')}</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  {createdTenant.tempPassword}
                </code>
                <Button variant="ghost" size="icon" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Save this password - it will not be shown again
              </p>
            </div>
            <Button onClick={() => router.push('/super-admin/tenants')}>
              {tCommon('back')} to {t('tenants')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={tCommon('create_new')} subtitle="Set up a new company account" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Company Name *</Label>
                <Input
                  id="tenantName"
                  {...register('tenantName')}
                  onChange={(e) => {
                    register('tenantName').onChange(e);
                    handleSlugChange(e);
                  }}
                />
                {errors.tenantName && (
                  <p className="text-sm text-red-500">{errors.tenantName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" {...register('slug')} />
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input id="adminEmail" type="email" {...register('adminEmail')} />
                {errors.adminEmail && (
                  <p className="text-sm text-red-500">{errors.adminEmail.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminFullName">Admin Full Name *</Label>
                <Input id="adminFullName" {...register('adminFullName')} />
                {errors.adminFullName && (
                  <p className="text-sm text-red-500">{errors.adminFullName.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Currency</Label>
                <Input id="defaultCurrency" {...register('defaultCurrency')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">Language</Label>
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
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={createTenant.isPending}>
                {createTenant.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tCommon('loading')}
                  </>
                ) : (
                  `${tCommon('create_new')} & Send Welcome Email`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
