"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PasswordStrength } from "@/components/shared/password-strength";
import API from "@/lib/api";

interface InvitationData {
  email: string;
  role: string;
  companyName: string;
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.accept_invitation');
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] =
    useState<InvitationData | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setError(t('no_token_error'));
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await API.get(
          `/users/validate-invitation?token=${token}`
        );
        const result = response.data;

        if (result.success && result.data?.valid && result.data?.data) {
          setInvitationData(result.data.data);
        } else {
          setError(
            result.data?.message || t('invalid_token_error')
          );
        }
      } catch (err: any) {
        setError(
          err.response?.data?.data?.message ||
            err.response?.data?.message ||
            t('validate_failed')
        );
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token, t]);

  useEffect(() => {
    const errors: string[] = [];
    if (password.length > 0) {
      if (password.length < 8) errors.push(t('password_hints.length'));
      if (!/[A-Z]/.test(password)) errors.push(t('password_hints.uppercase'));
      if (!/[a-z]/.test(password)) errors.push(t('password_hints.lowercase'));
      if (!/[0-9]/.test(password)) errors.push(t('password_hints.number'));
      if (!/[^A-Za-z0-9]/.test(password)) errors.push(t('password_hints.special'));
    }
    setPasswordErrors(errors);
  }, [password, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!fullName.trim()) {
      setSubmitError(t('full_name_required'));
      return;
    }

    const passwordSchema = z
      .string()
      .min(8, t('password_hints.length'))
      .regex(/[A-Z]/, t('password_hints.uppercase'))
      .regex(/[a-z]/, t('password_hints.lowercase'))
      .regex(/[0-9]/, t('password_hints.number'))
      .regex(
        /[^A-Za-z0-9]/,
        t('password_hints.special')
      );

    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      setSubmitError(passwordValidation.error.issues[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError(t('passwords_no_match'));
      return;
    }

    setSubmitting(true);

    try {
      const response = await API.post("/users/accept-invitation", {
        token,
        fullName: fullName.trim(),
        password,
        phone: phone.trim() || undefined,
      });

      const result = response.data;

      if (result.success) {
        localStorage.setItem("user", JSON.stringify(result.data.user));
        setSubmitSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setSubmitError(result.message || t('accept_failed'));
      }
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message ||
          t('accept_failed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('validating')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl">{t('invalid_title')}</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">{t('return_home')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">{t('success_title')}</CardTitle>
            <CardDescription className="text-center">
              {t('success_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hintKeys = ['password_hints.length', 'password_hints.uppercase', 'password_hints.lowercase', 'password_hints.number', 'password_hints.special'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>
            {t('description', {
              companyName: invitationData?.companyName ?? '',
              role: invitationData?.role ?? '',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email_label')}</Label>
              <Input
                id="email"
                type="email"
                value={invitationData?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                {t('full_name_label')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t('full_name_placeholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone_label')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('phone_placeholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {t('password_label')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <PasswordStrength password={password} />
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[
                    { met: password.length >= 8 },
                    { met: /[A-Z]/.test(password) },
                    { met: /[a-z]/.test(password) },
                    { met: /[0-9]/.test(password) },
                    { met: /[^A-Za-z0-9]/.test(password) },
                  ].map((req, idx) => (
                    <div key={hintKeys[idx]} className="flex items-center gap-2">
                      <CheckCircle
                        className={`h-3 w-3 ${
                          req.met
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          req.met
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t(hintKeys[idx])}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('confirm_password_label')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('confirm_password_placeholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">{t('passwords_no_match')}</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {t('passwords_match')}
                </p>
              )}
            </div>

            {submitError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('creating_account')}
                </>
              ) : (
                t('accept_create')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  const t = useTranslations('auth.accept_invitation');
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
