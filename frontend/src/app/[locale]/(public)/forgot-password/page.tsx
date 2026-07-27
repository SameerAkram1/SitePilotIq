'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { forgotPassword } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Building2, ArrowLeft, Zap, Lock, CheckCircle, Shield, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot_password');
  const [email, setEmail] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email, tenantSlug || undefined);
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-muted/50 to-background">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8 sm:p-10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)] mb-2">{t('success_title')}</h2>
          <p className="text-muted-foreground text-sm mb-6">{t('success_desc')}</p>
          <p className="text-sm text-muted-foreground mb-6">
            If an account exists for <strong className="text-foreground">{email}</strong>, you'll receive a password reset link shortly.
          </p>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('back_to_sign_in')}
          </Link>
        </div>
      </div>
    );
  }

  const FEATURES = [
    { icon: Shield, title: 'Enterprise Security', color: 'text-sky-600', bg: 'bg-sky-100' },
    { icon: ClipboardCheck, title: 'Site Inspections', color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

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
              Forgot your password?
            </h1>
            <p className="text-blue-100/80 text-lg mt-4 max-w-md leading-relaxed">
              No worries — enter your details and we'll send you a reset link.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 mt-10">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
                <div className={`h-10 w-10 rounded-xl ${feature.bg} flex items-center justify-center shrink-0`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{feature.title}</h3>
                  <p className="text-blue-200/70 text-xs mt-0.5 leading-snug">{feature.title === 'Enterprise Security' ? 'Bank-grade encryption' : 'Digital checklists and reports'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
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
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)] tracking-tight">SitePilotIQ</h1>
            <p className="text-muted-foreground text-sm mt-1">{t('description')}</p>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)] tracking-tight">{t('title')}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t('description')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tenantSlug" className="text-sm font-semibold text-foreground">Company</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tenantSlug"
                    type="text"
                    placeholder="your-company"
                    className="pl-10 h-11 bg-muted border-border focus:bg-background focus:border-blue-400 rounded-xl"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">{t('email_label')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('email_placeholder')}
                    className="pl-10 h-11 bg-muted border-border focus:bg-background focus:border-blue-400 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200/50 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('sending')}</>
                ) : (
                  t('send_reset_link')
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                {t('back_to_sign_in')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}