'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

const onboardingSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  fatherName: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const [error, setError] = useState<string | null>(null);
  const { setAuth, user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: {
      fullName: user?.fullName || '',
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const response = await api.post('/users/onboarding', data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth({
        ...user!,
        fullName: data.data.fullName,
        onboardingComplete: true,
      });
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to complete onboarding');
    },
  });

  const onSubmit = (data: OnboardingFormData) => {
    setError(null);
    onboardingMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('subtitle')}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-semibold text-foreground">
                  {t('fullName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  className="h-11 bg-muted rounded-xl"
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                  {t('phone')}
                </Label>
                <Input
                  id="phone"
                  className="h-11 bg-muted rounded-xl"
                  {...register('phone')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" className="text-sm font-semibold text-foreground">
                  {t('dateOfBirth')}
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  className="h-11 bg-muted rounded-xl"
                  {...register('dateOfBirth')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-sm font-semibold text-foreground">
                  {t('gender')}
                </Label>
                <Input
                  id="gender"
                  className="h-11 bg-muted rounded-xl"
                  placeholder="Male / Female / Other"
                  {...register('gender')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fatherName" className="text-sm font-semibold text-foreground">
                  {t('fatherName')}
                </Label>
                <Input
                  id="fatherName"
                  className="h-11 bg-muted rounded-xl"
                  {...register('fatherName')}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                disabled={onboardingMutation.isPending}
              >
                {onboardingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('submit')}
                  </>
                ) : (
                  t('submit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
