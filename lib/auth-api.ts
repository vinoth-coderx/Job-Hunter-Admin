import { api, ApiError } from "./api";
import { clearTokens, getAccessToken, setTokens } from "./auth";

export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      subscription: { tier: string; status: string };
    };
    accessToken: string;
    refreshToken: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      profile?: { fullName?: string; avatar?: string };
      isAdmin?: boolean;
      activeRole?: string;
    };
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>(
      "/auth/login",
      { email, password },
      { auth: false },
    ),
  me: () => api.get<MeResponse>("/auth/me"),
  logout: () =>
    api.post<{ success: boolean }>("/auth/logout").catch(() => null),
};

export async function performLogin(email: string, password: string) {
  const r = await authApi.login(email, password);
  if (!r?.data?.accessToken) {
    throw new ApiError("Login response missing token", 500, r);
  }
  setTokens(r.data.accessToken, r.data.refreshToken);
  return r.data.user;
}

export async function performLogout() {
  await authApi.logout();
  clearTokens();
}

export function hasToken(): boolean {
  return Boolean(getAccessToken());
}
