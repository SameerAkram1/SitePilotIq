'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  createProject,
  getProjectCategories,
  getUsersForSelection,
  createProjectCategory,
} from '@/hooks/api';
import { getClientsForSelection } from '@/hooks/api/use-clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { DatePicker } from '@/components/shared/date-picker';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  deadline: z.string().optional(),
  categoryId: z.string().optional(),
  clientId: z.string().optional(),
  summary: z.string().max(2000).optional(),
  projectManagerId: z.string().min(1, 'Project manager is required'),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('projects.new');
  const tc = useTranslations('common');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['projectCategories'],
    queryFn: getProjectCategories,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['usersForSelection'],
    queryFn: getUsersForSelection,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'selection'],
    queryFn: () => getClientsForSelection({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/projects/${data.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('failed_create'));
    },
  });

  const categoryMutation = useMutation({
    mutationFn: createProjectCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projectCategories'] });
      setValue('categoryId', data.id);
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    setError(null);
    const cleaned = {
      ...data,
      deadline: data.deadline || undefined,
      categoryId: data.categoryId || undefined,
      clientId: data.clientId || undefined,
      summary: data.summary || undefined,
    };
    createMutation.mutate(cleaned);
  };

  const projectManagers = (users || []).filter(
    (u: any) => u.role === 'ADMIN' || u.role === 'PROJECT_MANAGER',
  );

  const pmOptions = projectManagers.map((pm: any) => ({
    id: pm.id,
    label: pm.fullName,
    sublabel: pm.email,
    avatar: pm.fullName?.charAt(0),
  }));

  const categoryOptions = (categories || []).map((cat: any) => ({
    id: cat.id,
    label: cat.name,
  }));

  const clientOptions = (clientsData || []).map((c: any) => ({
    id: c.id,
    label: `${c.code} - ${c.name}`,
    sublabel: c.vatNumber || '',
  }));

  const watchedCategoryId = watch('categoryId');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('back')}
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
              <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                {t('name_label')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('name_placeholder')}
                className="h-11 bg-muted rounded-xl"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name.message}
                </p>
              )}
            </div>

            <SearchableSelect
              label={t('category_label')}
              options={categoryOptions}
              value={watchedCategoryId}
              onChange={(v) => setValue('categoryId', v)}
              placeholder={t('category_placeholder')}
              optional
              loading={categoriesLoading}
              onCreateNew={(search) => categoryMutation.mutate({ name: search })}
              createNewLabel={t('create_category')}
            />

            <SearchableSelect
              label={t('client_label')}
              options={clientOptions}
              value={watch('clientId')}
              onChange={(v) => setValue('clientId', v)}
              placeholder={t('client_placeholder')}
              optional
            />

            <DatePicker
              label={t('start_date_label')}
              value={watch('startDate')}
              onChange={(v) => setValue('startDate', v || '')}
              error={errors.startDate?.message}
              disablePast
            />

            <DatePicker
              label={t('deadline_label')}
              value={watch('deadline')}
              onChange={(v) => setValue('deadline', v)}
              optional
              noDeadlineOption
              noDeadlineLabel={t('no_deadline')}
            />

            <SearchableSelect
              label={t('pm_label')}
              options={pmOptions}
              value={watch('projectManagerId')}
              onChange={(v) => setValue('projectManagerId', v)}
              placeholder={t('pm_placeholder')}
              error={errors.projectManagerId?.message}
              loading={usersLoading}
              required
            />

            <div className="space-y-1.5">
              <Label htmlFor="summary" className="text-sm font-semibold text-foreground">
                {t('summary_label')} <span className="text-muted-foreground font-normal">({tc('optional')})</span>
              </Label>
              <Textarea
                id="summary"
                placeholder={t('summary_placeholder')}
                rows={4}
                className="bg-muted rounded-xl"
                {...register('summary')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="rounded-xl"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  t('create_project')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
