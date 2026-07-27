import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const SUPPORTED_LOCALES = ['en', 'sq', 'it', 'es', 'fr', 'de', 'pt', 'ar', 'tr', 'ru', 'zh', 'hi'];

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/');
  const first = segments[1];
  if (first && SUPPORTED_LOCALES.includes(first)) return first;
  return 'en';
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const locale = getLocaleFromPath(window.location.pathname);
    config.headers['x-locale'] = locale;
  }
  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

let lastRefreshTime = 0;

function doRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => {
        lastRefreshTime = Date.now();
        const newExpiry = res.data?.data?.tokenExpiresAt;
        if (newExpiry) {
          authLifecycle.updateExpiry(newExpiry);
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/validate-slug',
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) return Promise.reject(error);

    const url = originalRequest.url || '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => url.endsWith(ep));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const ok = await doRefresh();

        if (!ok) {
          processQueue(error as AxiosError);
          authLifecycle.stop();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return new Promise(() => {});
        }

        processQueue(null);
        const response = await api(originalRequest);
        return response;
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        authLifecycle.stop();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return new Promise(() => {});
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

const ACCESS_TOKEN_MS = 15 * 60 * 1000;
const REFRESH_MARGIN_MS = 60 * 1000;

class AuthLifecycle {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private started = false;
  private tokenExpiresAtMs: number | null = null;

  start(tokenExpiresAt?: number | null) {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.tokenExpiresAtMs = tokenExpiresAt ?? null;
    lastRefreshTime = Date.now();
    this.scheduleRefresh();

    this.visibilityHandler = () => {
      if (!this.started) return;
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshTime;
        if (elapsed >= ACCESS_TOKEN_MS - REFRESH_MARGIN_MS) {
          this.handleVisibilityRefresh();
        } else {
          this.scheduleRefresh();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  stop() {
    this.started = false;
    this.tokenExpiresAtMs = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    isRefreshing = false;
    refreshPromise = null;
    failedQueue = [];
  }

  updateExpiry(tokenExpiresAtMs: number) {
    this.tokenExpiresAtMs = tokenExpiresAtMs;
    // Reschedule with the new expiry so the timer stays accurate
    if (this.started) {
      this.scheduleRefresh();
    }
  }

  private async handleVisibilityRefresh() {
    if (!this.started) return;
    const ok = await doRefresh();
    if (!this.started) return;
    if (ok) {
      this.scheduleRefresh();
    } else {
      this.stop();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }

  private scheduleRefresh(tokenExpiresAtMs?: number | null) {
    if (!this.started) return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    // Use actual token expiry if available, otherwise fallback to fixed delay
    let delay: number;
    const effectiveExpiry = tokenExpiresAtMs ?? this.tokenExpiresAtMs;
    if (effectiveExpiry) {
      delay = Math.max(effectiveExpiry - Date.now() - REFRESH_MARGIN_MS, 5000);
    } else {
      delay = Math.max(ACCESS_TOKEN_MS - REFRESH_MARGIN_MS, 5000);
    }

    this.refreshTimer = setTimeout(async () => {
      if (!this.started) return;
      const ok = await doRefresh();
      if (!this.started) return;
      if (ok) {
        this.scheduleRefresh();
      } else {
        this.stop();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }, delay);
  }
}

export const authLifecycle = new AuthLifecycle();

export default api;
