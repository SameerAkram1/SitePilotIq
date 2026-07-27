'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api, { authLifecycle } from '@/lib/api';

const publicPaths = ['/login', '/register', '/accept-invitation', '/verify-email', '/forgot-password', '/reset-password'];

let authCheckInFlight: Promise<boolean> | null = null;

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      authLifecycle.start(user?.tokenExpiresAt);
      setHydrated(true);
      return;
    }

    // authCheckInFlight is global — deduplicates across Strict Mode re-mounts
    if (!authCheckInFlight) {
      const controller = new AbortController();

      authCheckInFlight = api
        .get('/auth/me', { signal: controller.signal as any })
        .then((response) => {
          setAuth(response.data.data);
          authLifecycle.start(response.data.data.tokenExpiresAt);
          return true;
        })
        .catch(() => {
          clearAuth();
          return false;
        })
        .finally(() => {
          authCheckInFlight = null;
          setHydrated(true);
        });
    } else {
      authCheckInFlight.finally(() => {
        setHydrated(true);
      });
    }

    return () => {
      // If the component unmounts before the auth check completes,
      // the finally() will still set hydrated, but the state setter
      // will be a no-op because the promise is shared globally.
    };
  }, [isAuthenticated, setAuth, clearAuth, user?.tokenExpiresAt]);

  useEffect(() => {
    if (hydrated && !isAuthenticated && !publicPaths.some((p) => pathname.startsWith(p))) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (hydrated && isAuthenticated && user && !publicPaths.some((p) => pathname.startsWith(p))) {
      if (user.onboardingComplete === false && !pathname.startsWith('/onboarding')) {
        router.push('/onboarding');
      } else if (user.onboardingComplete === true && pathname.startsWith('/onboarding')) {
        router.push('/dashboard');
      }
    }
  }, [hydrated, isAuthenticated, user, pathname, router]);

  const logout = useCallback(async () => {
    authLifecycle.stop();
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors
    }
    clearAuth();
    authCheckInFlight = null;
    router.push('/login');
  }, [clearAuth, router]);

  return { isAuthenticated, isLoading: !hydrated || !isAuthenticated, user, logout };
}
