'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type VerifyState = 'loading' | 'success' | 'expired' | 'invalid';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.verify_email');
  const [state, setState] = useState<VerifyState>('loading');
  const [isResending, setIsResending] = useState(false);

  const verifyEmail = useCallback(async (token: string) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      if (response.data.success) {
        setState('success');
        setTimeout(() => router.push('/login?verified=true'), 3000);
      } else {
        setState('invalid');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || '';
      if (
        err.response?.status === 410 ||
        message.toLowerCase().includes('expired')
      ) {
        setState('expired');
      } else {
        setState('invalid');
      }
    }
  }, [router]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setState('invalid');
    }
  }, [searchParams, verifyEmail]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const token = searchParams.get('token');
      await api.post('/auth/resend-verification', { token });
      setState('success');
    } catch {
      setState('expired');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">SP</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('verifying')}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium">{t('success_title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('redirecting')}
              </p>
              <Link href="/login" className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {t('sign_in_now')}
              </Link>
            </div>
          )}

          {state === 'expired' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium">{t('expired_title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('expired_desc')}
              </p>
              <Button
                onClick={handleResend}
                disabled={isResending}
                className="mt-2"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('sending')}
                  </>
                ) : (
                  t('resend_verification')
                )}
              </Button>
            </div>
          )}

          {state === 'invalid' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium">{t('invalid_title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('invalid_desc')}
              </p>
              <Link href="/login" className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {t('go_to_login')}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verify_email');
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t('verifying')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
