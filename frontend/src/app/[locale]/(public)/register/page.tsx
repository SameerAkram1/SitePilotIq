'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Check,
  Eye,
  EyeOff,
  Globe,
  Building2,
  User,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
  Users,
  BarChart3,
  MailCheck,
  RotateCcw,
  Sparkles,
  FolderKanban,
  ClipboardCheck,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria',
  'Bangladesh','Belgium','Brazil','Cambodia','Canada','Chile','China',
  'Colombia','Czech Republic','Denmark','Egypt','Finland','France',
  'Germany','Ghana','Greece','Hungary','India','Indonesia','Ireland',
  'Israel','Italy','Jamaica','Japan','Jordan','Kenya','Lebanon',
  'Malaysia','Mexico','Morocco','Nepal','Netherlands','New Zealand',
  'Nigeria','Norway','Pakistan','Peru','Philippines','Poland','Portugal',
  'Qatar','Romania','Saudi Arabia','Singapore','South Africa','South Korea',
  'Spain','Sri Lanka','Sweden','Switzerland','Taiwan','Thailand','Tunisia',
  'Turkey','UAE','Uganda','Ukraine','United Kingdom','United States',
  'Uruguay','Uzbekistan','Vietnam','Zambia','Zimbabwe',
];

const FEATURES = [
  { icon: FolderKanban, title: 'Project Management', description: 'Track projects, milestones, and deadlines', color: 'text-blue-600', bg: 'bg-blue-100' },
  { icon: BarChart3, title: 'Smart Analytics', description: 'Data-driven insights to optimize operations', color: 'text-violet-600', bg: 'bg-violet-100' },
  { icon: Users, title: 'Team Collaboration', description: 'Seamless communication across your team', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { icon: ClipboardCheck, title: 'Site Inspections', description: 'Digital checklists and photo reports', color: 'text-amber-600', bg: 'bg-amber-100' },
  { icon: CreditCard, title: 'Billing & Invoicing', description: 'Automated billing and payment tracking', color: 'text-rose-600', bg: 'bg-rose-100' },
  { icon: Shield, title: 'Enterprise Security', description: 'Bank-grade encryption and compliance', color: 'text-sky-600', bg: 'bg-sky-100' },
];

const TRUSTED_BY = [
  { name: 'BuildCorp', role: 'General Contractor' },
  { name: 'SkyLine Dev', role: 'Real Estate Developer' },
  { name: 'InfraPro', role: 'Infrastructure Solutions' },
];

function getPasswordStrength(password: string) {
  const checks = [
    { met: password.length >= 8 },
    { met: /[A-Z]/.test(password) },
    { met: /[a-z]/.test(password) },
    { met: /[0-9]/.test(password) },
    { met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = checks.filter((c) => c.met).length;
  let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  let color = 'bg-red-400';
  let textColor = 'text-red-500';

  if (metCount >= 4) { level = 'strong'; color = 'bg-emerald-500'; textColor = 'text-emerald-600'; }
  else if (metCount === 3) { level = 'good'; color = 'bg-blue-500'; textColor = 'text-blue-600'; }
  else if (metCount === 2) { level = 'fair'; color = 'bg-amber-400'; textColor = 'text-amber-600'; }

  return { checks, metCount, level, color, textColor };
}

function getErrorMessage(err: any, defaultMessage: string): string {
  const data = err.response?.data;
  if (!data) return defaultMessage;

  const msg = data.message;

  if (Array.isArray(msg)) {
    return msg[0];
  }

  if (typeof msg === 'string') {
    return msg;
  }

  return defaultMessage;
}

export default function RegisterPage() {
  const t = useTranslations('auth.register');
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const step1Schema = z.object({
    companyName: z.string().min(2, t('validation.company_name_min')),
    country: z.string().min(1, t('validation.country_required')),
  });

  const step2Schema = z.object({
    fullName: z.string().min(2, t('validation.full_name_min')),
    email: z.string().email(t('validation.email_valid')),
    password: z.string().min(8, t('validation.password_min')),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: t('validation.agree_required'),
    }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.confirm_password_match'),
    path: ['confirmPassword'],
  });

  const formSchema = step1Schema.merge(step2Schema);

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    mode: 'onTouched',
    defaultValues: {
      companyName: '',
      country: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: undefined,
      agreeToTerms: false,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = form;

  const watchedPassword = watch('password') ?? '';
  const watchedCountry = watch('country');
  const watchedAgree = watch('agreeToTerms');
  const strength = getPasswordStrength(watchedPassword);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleNext = useCallback(async () => {
    setError(null);
    const valid = await trigger(['companyName', 'country']);
    if (!valid) return;

    const companyName = watch('companyName');
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      setError(t('valid_company_name_error'));
      return;
    }

    try {
      const response = await api.post('/auth/check-slug', { slug });
      if (!response.data.data.available) {
        setError(t('company_name_taken'));
        return;
      }
      setStep(2);
    } catch (err: any) {
      setError(getErrorMessage(err, t('registration_failed')));
    }
  }, [trigger, watch, t]);

  const handleBack = useCallback(() => {
    setStep(1);
    setError(null);
  }, []);

  const onSubmit = useCallback(
    async (data: FormData) => {
      setError(null);
      setIsSubmitting(true);
      try {
        const response = await api.post('/auth/register', {
          companyName: data.companyName,
          country: data.country,
          fullName: data.fullName,
          email: data.email,
          password: data.password,
        });

        if (response.data.success) {
          setRegisteredEmail(data.email);
          setIsSuccess(true);
        } else {
          setError(response.data.message || t('registration_failed'));
        }
      } catch (err: any) {
        setError(getErrorMessage(err, t('registration_failed')));
      } finally {
        setIsSubmitting(false);
      }
    },
    [t],
  );

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { email: registeredEmail });
      setResendCooldown(60);
    } catch {
      // silently ignore
    } finally {
      setIsResending(false);
    }
  }, [resendCooldown, registeredEmail]);

  const hintKeys = ['password_hints.length', 'password_hints.uppercase', 'password_hints.lowercase', 'password_hints.number', 'password_hints.special'];

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <MailCheck className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                  {t('success_title')}
                </h2>
                <p className="text-muted-foreground text-sm mt-2">
                  {t('success_desc')}
                </p>
                <p className="text-blue-600 font-semibold text-sm mt-1">
                  {registeredEmail}
                </p>
              </div>
              <p className="text-muted-foreground text-xs max-w-xs">
                {t('success_hint')}
              </p>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="rounded-xl"
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {resendCooldown > 0 ? t('resend_in', { seconds: resendCooldown }) : t('resend_verification')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('didnt_receive')}{' '}
                <button onClick={handleResend} disabled={resendCooldown > 0 || isResending} className="text-blue-600 hover:text-blue-700 underline disabled:opacity-50">
                  {t('try_again')}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-48 -right-24 w-[500px] h-[500px] bg-white/5 rounded-full" />
        <div className="absolute top-1/2 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 py-12 w-full">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white font-[family-name:var(--font-heading)] tracking-tight">
                SitePilotIQ
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white font-[family-name:var(--font-heading)] tracking-tight leading-[1.15] max-w-lg">
              {t('build_smarter')}{' '}
              <span className="text-blue-200">{t('manage_faster')}</span>
            </h1>
            <p className="text-blue-100/80 text-lg mt-4 max-w-md leading-relaxed">
              {t('hero_desc')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10 hover:bg-white/15 transition-colors"
              >
                <div className={`h-10 w-10 rounded-xl ${feature.bg} flex items-center justify-center shrink-0`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{feature.title}</h3>
                  <p className="text-blue-200/70 text-xs mt-0.5 leading-snug">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-6">
            <div className="flex items-center gap-8 text-blue-100/70 text-xs">
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-blue-300" />
                <span>{t('free_14_day_trial')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-blue-300" />
                <span>{t('no_credit_card')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-blue-300" />
                <span>{t('cancel_anytime')}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {TRUSTED_BY.map((company) => (
                <div key={company.name} className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{company.name}</p>
                    <p className="text-blue-200/60 text-[10px]">{company.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-[48%] flex items-center justify-center px-4 py-8 sm:px-8 bg-gradient-to-br from-muted/50 to-background relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/3 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/3 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-[420px] space-y-6 relative">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)] tracking-tight">
              SitePilotIQ
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Construction Management Platform</p>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t(step === 1 ? 'step_1_of_2' : 'step_2_of_2')}
              </span>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                {step === 1 ? t('step_company') : t('step_account')}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                {step === 1 ? t('company_info_title') : t('account_title')}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {step === 1 ? t('company_info_desc') : t('account_desc')}
              </p>
            </div>

            {/* Global error display */}
            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Step 1: Company Info */}
              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-sm font-semibold text-foreground">{t('company_name_label')}</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        placeholder={t('company_name_placeholder')}
                        className={`pl-10 h-11 bg-muted rounded-xl ${errors.companyName ? 'border-red-400 focus:border-red-500' : 'border-border focus:bg-background focus:border-blue-400'}`}
                        {...register('companyName')}
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-sm font-semibold text-foreground">{t('country_label')}</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Select
                        value={watchedCountry}
                        onValueChange={(value) => setValue('country', value, { shouldValidate: true })}
                      >
                        <SelectTrigger className={`pl-10 h-11 bg-muted rounded-xl ${errors.country ? 'border-red-400 focus:border-red-500' : 'border-border focus:bg-background focus:border-blue-400'}`}>
                          <SelectValue placeholder={t('country_placeholder')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 rounded-xl">
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.country && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.country.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200/50 transition-all"
                    onClick={handleNext}
                  >
                    {t('continue')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Step 2: Account Info */}
              {step === 2 && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors -mb-1"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('back_to_company')}
                  </button>

                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm font-semibold text-foreground">{t('full_name_label')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder={t('full_name_placeholder')}
                        className={`pl-10 h-11 bg-muted rounded-xl ${errors.fullName ? 'border-red-400 focus:border-red-500' : 'border-border focus:bg-background focus:border-blue-400'}`}
                        {...register('fullName')}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold text-foreground">{t('work_email_label')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('work_email_placeholder')}
                        className={`pl-10 h-11 bg-muted rounded-xl ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-border focus:bg-background focus:border-blue-400'}`}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-semibold text-foreground">{t('password_label')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('password_placeholder')}
                        className={`pl-10 pr-10 h-11 bg-muted rounded-xl ${errors.password ? 'border-red-400 focus:border-red-500' : 'border-border focus:bg-background focus:border-blue-400'}`}
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password.message}
                      </p>
                    )}

                    {watchedPassword.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                              style={{ width: `${(strength.metCount / 5) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wide ${strength.textColor}`}>
                            {t(`strength_labels.${strength.level}`)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {strength.checks.map((check, idx) => (
                            <div key={hintKeys[idx]} className="flex items-center gap-1.5 text-xs">
                              <div className={`h-4 w-4 rounded-full flex items-center justify-center ${check.met ? 'bg-emerald-100' : 'bg-muted'}`}>
                                <Check className={`h-2.5 w-2.5 ${check.met ? 'text-emerald-600' : 'text-gray-300'}`} />
                              </div>
                              <span className={check.met ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                {t(hintKeys[idx])}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">{t('confirm_password_label')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('confirm_password_placeholder')}
                        className={`pl-10 pr-10 h-11 bg-muted rounded-xl ${errors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-border focus:bg-background focus:border-blue-400'}`}
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="agreeToTerms"
                        checked={watchedAgree === true}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onChange={(e) =>
                          setValue('agreeToTerms', e.target.checked, {
                            shouldValidate: true,
                          })
                        }
                      />
                      <Label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                        {t('agree_to_terms')}{' '}
                        <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-700 underline font-medium">{t('terms_of_service')}</a>
                        {' '}{t('and')}{' '}
                        <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700 underline font-medium">{t('privacy_policy')}</a>
                      </Label>
                    </div>
                    {errors.agreeToTerms && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.agreeToTerms.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200/50 transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('creating_account')}
                      </>
                    ) : (
                      <>
                        {t('create_free_account')}
                        <Sparkles className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </>
              )}
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {t('already_have_account')}{' '}
            <a href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              {t('sign_in')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
