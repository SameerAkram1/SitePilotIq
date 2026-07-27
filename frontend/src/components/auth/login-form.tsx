'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const slugSchema = z.object({
  slug: z.string().min(1, 'Company name is required'),
});
type SlugFormData = z.infer<typeof slugSchema>;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'slug' | 'credentials'>('slug');
  const [companyName, setCompanyName] = useState('');
  const [validatedSlug, setValidatedSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resending, setResending] = useState(false);

  const slugForm = useForm<SlugFormData>({
    resolver: zodResolver(slugSchema),
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleSlugSubmit = useCallback(
    async (data: SlugFormData) => {
      setError(null);
      try {
        const response = await api.post('/auth/validate-slug', {
          slug: data.slug.trim(),
        });
        if (response.data.success) {
          setCompanyName(response.data.data.companyName);
          setValidatedSlug(data.slug.trim());
          setStep('credentials');
        }
      } catch (err: any) {
        const message =
          err.response?.data?.message || 'Company not found. Please check the name and try again.';
        setError(message);
      }
    },
    [],
  );

  const handleLoginSubmit = useCallback(
    async (data: LoginFormData) => {
      setError(null);
      setRequiresVerification(false);
      try {
        const response = await api.post('/auth/login', {
          tenantSlug: validatedSlug,
          email: data.email,
          password: data.password,
        });
        const { user, requiresVerification: needsVerify } = response.data.data;

        if (needsVerify) {
          setRequiresVerification(true);
          setVerifyEmail(user.email);
          return;
        }

        router.push('/dashboard');
      } catch (err: any) {
        const message =
          err.response?.data?.message || 'Invalid email or password. Please try again.';
        setError(message);
      }
    },
    [validatedSlug, router],
  );

  const handleBackToSlug = useCallback(() => {
    setStep('slug');
    setError(null);
    loginForm.reset();
  }, [loginForm]);

  const handleResendVerification = useCallback(async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: verifyEmail });
    } catch {
      // Ignore errors
    }
    setResending(false);
  }, [verifyEmail]);

  // Verification required screen
  if (requiresVerification) {
    return (
      <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
              Email Verification Required
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              Please verify your email address before signing in.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to <strong className="text-foreground">{verifyEmail}</strong>
          </p>
          <Button
            onClick={handleResendVerification}
            disabled={resending}
            variant="outline"
            className="w-full h-11 rounded-xl"
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Step 1: Company slug
  if (step === 'slug') {
    return (
      <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)] tracking-tight">
            Sign In
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your company name to continue
          </p>
        </div>

        <form onSubmit={slugForm.handleSubmit(handleSlugSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-sm font-semibold text-foreground">
              Company Name
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="slug"
                placeholder="your-company"
                className="pl-10 h-11 bg-muted border-border focus:bg-background focus:border-blue-400 rounded-xl"
                {...slugForm.register('slug')}
              />
            </div>
            {slugForm.formState.errors.slug && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {slugForm.formState.errors.slug.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200/50 transition-all"
            disabled={slugForm.formState.isSubmitting}
          >
            {slugForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Start Free Trial
          </Link>
        </div>
      </div>
    );
  }

  // Step 2: Email & password
  return (
    <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-lg">SP</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)] tracking-tight">
          Sign In
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Signing in to <span className="font-semibold text-foreground">{companyName}</span>
        </p>
      </div>

      <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors -mb-1"
          onClick={handleBackToSlug}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to company selection
        </button>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="pl-10 h-11 bg-muted border-border focus:bg-background focus:border-blue-400 rounded-xl"
              {...loginForm.register('email')}
            />
          </div>
          {loginForm.formState.errors.email && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {loginForm.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10 pr-10 h-11 bg-muted border-border focus:bg-background focus:border-blue-400 rounded-xl"
              {...loginForm.register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {loginForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200/50 transition-all"
          disabled={loginForm.formState.isSubmitting}
        >
          {loginForm.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
          Start Free Trial
        </Link>
      </div>
    </div>
  );
}
