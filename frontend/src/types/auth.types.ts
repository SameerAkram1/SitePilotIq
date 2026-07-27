export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isFirstLogin?: boolean;
  onboardingComplete?: boolean;
  tenantId?: string;
}

export interface LoginPayload {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    user: AuthUser;
  };
  message: string;
}

export interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
