'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  getProject,
  updateProject,
  getProjectCategories,
  getUsersForSelection,
  createProjectCategory,
} from '@/hooks/api';
import { getClientsForSelection } from '@/hooks/api/use-clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  status: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const t = useTranslations('projects.new');
  const td = useTranslations('projects.detail');
  const ts = useTranslations('projects.status');
  const tc = useTranslations('common');
  const projectId = params.id as string;
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
  });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        startDate: project.startDate?.split('T')[0] || '',
        deadline: project.deadline?.split('T')[0] || '',
        categoryId: project.categoryId || '',
        clientId: project.clientId || '',
        summary: project.summary || '',
        projectManagerId: project.projectManagerId || '',
        status: project.status || 'DRAFT',
      });
    }
  }, [project, reset]);

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

  const updateMutation = useMutation({
    mutationFn: (data: ProjectFormData) => updateProject(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      router.push(`/projects/${projectId}`);
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
      status: data.status || undefined,
    };
    updateMutation.mutate(cleaned);
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

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">{td('not_found')}</h2>
        <Button variant="link" onClick={() => router.push('/projects')}>
          {td('back_to_projects')}
        </Button>
      </div>
    );
  }

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
            {td('edit')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project.name}
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
              <Label className="text-sm font-semibold text-foreground">
                {tc('status')}
              </Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v)}
              >
                <SelectTrigger className="h-11 bg-muted rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{ts('draft')}</SelectItem>
                  <SelectItem value="ACTIVE">{ts('active')}</SelectItem>
                  <SelectItem value="ON_HOLD">{ts('on_hold')}</SelectItem>
                  <SelectItem value="COMPLETED">{ts('completed')}</SelectItem>
                  <SelectItem value="CANCELLED">{ts('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  tc('save')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
