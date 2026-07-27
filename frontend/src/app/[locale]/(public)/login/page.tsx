'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth';
import { Zap, FolderKanban, BarChart3, Users, ClipboardCheck, Shield, CheckCircle } from 'lucide-react';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const { isAuthenticated } = useAuth();
  const t = useTranslations('auth.login');
  const tf = useTranslations('auth.login_features');
  const tr = useTranslations('auth.register');
  const FEATURES = [
    { icon: FolderKanban, title: tf('project_management'), description: tf('pm_desc'), color: 'text-blue-600', bg: 'bg-blue-100' },
    { icon: BarChart3, title: tf('smart_analytics'), description: tf('analytics_desc'), color: 'text-violet-600', bg: 'bg-violet-100' },
    { icon: Users, title: tf('team_collaboration'), description: tf('collab_desc'), color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { icon: ClipboardCheck, title: tf('site_inspections'), description: tf('inspections_desc'), color: 'text-amber-600', bg: 'bg-amber-100' },
    { icon: Shield, title: tf('enterprise_security'), description: tf('security_desc'), color: 'text-sky-600', bg: 'bg-sky-100' },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

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
              Welcome back to{' '}
              <span className="text-blue-200">your projects.</span>
            </h1>
            <p className="text-blue-100/80 text-lg mt-4 max-w-md leading-relaxed">
              Sign in to manage your construction sites, track progress, and collaborate with your team.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-10">
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

          <div className="mt-8 text-blue-100/50 text-xs">
            {tr('trusted_companies')}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="w-full lg:w-[48%] flex items-center justify-center px-4 py-8 sm:px-8 bg-gradient-to-br from-muted/50 to-background relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/3 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/3 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-[420px] relative">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)] tracking-tight">
              SitePilotIQ
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{tr('subtitle')}</p>
          </div>

          <LoginForm />

          {verified && (
            <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-medium">{t('email_verified_banner')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Zap className="h-8 w-8 animate-spin text-blue-600" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
