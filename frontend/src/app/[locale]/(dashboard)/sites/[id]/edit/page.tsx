'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getSite, updateSite, getProjects, getUsersForSelection, searchAddresses, queryKeys } from '@/hooks/api';
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
  MapPin,
} from 'lucide-react';
import { SiteMap } from '@/components/shared/site-map';

const siteSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  status: z.string().min(1, 'Status is required'),
  locationAddress: z.string().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  locationRadius: z.coerce.number().min(10).max(10000).optional(),
  plannedEndDate: z.string().optional(),
  siteManagerId: z.string().min(1, 'Site manager is required'),
  notes: z.string().max(2000).optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface GeocodingResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function AddressSearch({ initialValue, onSelect }: { initialValue?: string; onSelect: (address: string, lat: number, lng: number) => void }) {
  const t = useTranslations('sites.edit');
  const [query, setQuery] = useState(initialValue || '');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialValue) setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchAddresses(q);
      setResults(Array.isArray(data) ? data : []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t('location_placeholder')}
          className="h-11 bg-muted rounded-xl pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-[2000] mt-1 w-full bg-white dark:bg-slate-900 border rounded-xl shadow-lg max-h-60 overflow-auto">
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-muted text-sm border-b last:border-0"
              onClick={() => {
                onSelect(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
                setQuery(r.display_name);
                setOpen(false);
              }}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EditSiteForm() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const t = useTranslations('sites.edit');
  const tn = useTranslations('sites.new');
  const ts = useTranslations('sites.status');
  const tc = useTranslations('common');
  const siteId = params.id as string;
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema) as any,
  });

  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: queryKeys.sites.detail(siteId),
    queryFn: () => getSite(siteId),
  });

  useEffect(() => {
    if (site) {
      reset({
        projectId: site.projectId || '',
        name: site.name,
        status: site.status || 'DRAFT',
        locationAddress: site.locationAddress || '',
        latitude: site.latitude ?? undefined,
        longitude: site.longitude ?? undefined,
        locationRadius: site.locationRadius ?? 100,
        plannedEndDate: site.plannedEndDate?.split('T')[0] || '',
        siteManagerId: site.siteManagerId || '',
        notes: site.notes || '',
      });
    }
  }, [site, reset]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projectsList'],
    queryFn: () => getProjects({ limit: 1000, status: 'ACTIVE' }),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['usersForSelection'],
    queryFn: getUsersForSelection,
  });

  const updateMutation = useMutation({
    mutationFn: (data: SiteFormData) => updateSite(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.detail(siteId) });
      router.push(`/sites/${siteId}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('failed_update'));
    },
  });

  const onSubmit = (data: SiteFormData) => {
    setError(null);
    const cleaned = {
      ...data,
      plannedEndDate: data.plannedEndDate || undefined,
      locationAddress: data.locationAddress || undefined,
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
      locationRadius: data.locationRadius ?? undefined,
      notes: data.notes || undefined,
    };
    updateMutation.mutate(cleaned);
  };

  const projectList = (projects?.data || []).map((p: any) => ({
    id: p.id,
    label: `${p.code} - ${p.name}`,
  }));

  const siteManagers = (users || []).filter(
    (u: any) => u.role === 'ADMIN' || u.role === 'PROJECT_MANAGER' || u.role === 'SITE_MANAGER',
  );

  const smOptions = siteManagers.map((sm: any) => ({
    id: sm.id,
    label: sm.fullName,
    sublabel: sm.email,
    avatar: sm.fullName?.charAt(0),
  }));

  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');
  const watchedRadius = watch('locationRadius');

  if (siteLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">{t('not_found')}</h2>
        <Button variant="link" onClick={() => router.push('/sites')}>
          {t('back_to_sites')}
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
          aria-label={tc('back')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('back')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {site.name}
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

            <SearchableSelect
              label={t('project_label')}
              options={projectList}
              value={watch('projectId')}
              onChange={(v) => setValue('projectId', v)}
              placeholder={t('project_placeholder')}
              error={errors.projectId?.message}
              loading={projectsLoading}
              required
            />

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                {t('site_name_label')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('site_name_placeholder')}
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

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-sm font-semibold text-foreground">
                {t('status_label')} <span className="text-red-500">*</span>
              </Label>
              <select
                id="status"
                {...register('status')}
                className="h-11 w-full bg-muted rounded-xl px-3 text-sm border border-input"
              >
                <option value="DRAFT">{ts('draft')}</option>
                <option value="ACTIVE">{ts('active')}</option>
                <option value="COMPLETED">{ts('completed')}</option>
                <option value="DISABLED">{ts('disabled')}</option>
              </select>
              {errors.status && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.status.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">
                {t('location_label')} <span className="text-muted-foreground font-normal">— {t('search_or_click_map')}</span>
              </Label>
              <AddressSearch
                initialValue={site.locationAddress || ''}
                onSelect={(address, lat, lng) => {
                  setValue('locationAddress', address);
                  setValue('latitude', lat);
                  setValue('longitude', lng);
                }}
              />
            </div>

            <div className="rounded-xl overflow-hidden border border-border" style={{ height: '350px' }}>
              <SiteMap
                latitude={watchedLat || null}
                longitude={watchedLng || null}
                onLocationChange={(lat, lng) => {
                  setValue('latitude', lat);
                  setValue('longitude', lng);
                }}
                height="350px"
                radius={watchedRadius || 100}
              />
            </div>

            {(watchedLat && watchedLng) && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                {tn('latitude')}: {Number(watchedLat).toFixed(6)}, {tn('longitude')}: {Number(watchedLng).toFixed(6)}
              </div>
            )}

            <input type="hidden" {...register('locationAddress')} />
            <input type="hidden" {...register('latitude')} />
            <input type="hidden" {...register('longitude')} />

            <div className="space-y-1.5">
              <Label htmlFor="locationRadius" className="text-sm font-semibold text-foreground">
                {t('location_radius')} <span className="text-muted-foreground font-normal">({tc('optional')})</span>
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={watchedRadius || 100}
                  onChange={(e) => setValue('locationRadius', parseInt(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <Input
                  id="locationRadius"
                  type="number"
                  min={10}
                  max={10000}
                  className="h-11 bg-muted rounded-xl w-24"
                  {...register('locationRadius')}
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
              <p className="text-xs text-muted-foreground">{tn('geofence_hint')}</p>
            </div>

            <SearchableSelect
              label={t('site_manager_label')}
              options={smOptions}
              value={watch('siteManagerId')}
              onChange={(v) => setValue('siteManagerId', v)}
              placeholder={t('site_manager_placeholder')}
              error={errors.siteManagerId?.message}
              loading={usersLoading}
              required
            />

            <DatePicker
              label={t('planned_end_label')}
              value={watch('plannedEndDate')}
              onChange={(v) => setValue('plannedEndDate', v)}
              optional
            />

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-semibold text-foreground">
                {t('notes_label')} <span className="text-muted-foreground font-normal">({tc('optional')})</span>
              </Label>
              <Textarea
                id="notes"
                placeholder={t('notes_placeholder')}
                rows={4}
                className="bg-muted rounded-xl"
                {...register('notes')}
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
                    {t('saving')}
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

export default function EditSitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}>
      <EditSiteForm />
    </Suspense>
  );
}
