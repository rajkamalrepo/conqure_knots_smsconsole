import axios from "axios";

//const baseURL = import.meta.env.VITE_API_BASE_URL || "https://localhost:21721/" || "https://conqureknots-ceb0anf2brbcetba.southindia-01.azurewebsites.net/";
const baseURL = "https://conqureknots-ceb0anf2brbcetba.southindia-01.azurewebsites.net/"
const TOKEN_KEY = "ckn.auth.token";
const REFRESH_KEY = "ckn.auth.refreshToken";
const TENANT_KEY = "ckn.auth.tenantId";
const EMAIL_KEY = "ckn.auth.email";

export function getStoredAuth() {
  return {
    token: localStorage.getItem(TOKEN_KEY) || "",
    refreshToken: localStorage.getItem(REFRESH_KEY) || "",
    tenantId: localStorage.getItem(TENANT_KEY) || "Test",
    email: localStorage.getItem(EMAIL_KEY) || ""
  };
}

export function storeAuth({ token, refreshToken, tenantId, email }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(TENANT_KEY, tenantId);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

/** Base client for /api/v1/auth and /api/v1/tenants — no token/tenant headers,
 * since neither exists yet when these calls are made. */
export const authClient = axios.create({ baseURL, headers: { "Content-Type": "application/json" } });

/**
 * Shared client for every authenticated call. Reads the current token/tenantId
 * straight from storage on every request (not from React state), so it works
 * the same whether called from a component or elsewhere. On a 401, it tries
 * exactly one silent refresh via /api/v1/auth/refresh before giving up and
 * forcing a re-login — this mirrors what a real SPA does with short-lived
 * access tokens (architecture doc §11).
 */
export const apiClient = axios.create({ baseURL, headers: { "Content-Type": "application/json" } });

apiClient.interceptors.request.use((config) => {
  const { token, tenantId } = getStoredAuth();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers["X-Tenant-Id"] = tenantId;
  }
  return config;
});

let refreshInFlight = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    const { refreshToken } = getStoredAuth();
    if (!refreshToken) {
      clearAuth();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    original._retried = true;
    refreshInFlight ??= authClient
      .post("/api/v1/auth/refresh", { refreshToken })
      .then((res) => res.data)
      .finally(() => {
        refreshInFlight = null;
      });

    try {
      const { token, refreshToken: newRefreshToken } = await refreshInFlight;
      const { tenantId, email } = getStoredAuth();
      storeAuth({ token, refreshToken: newRefreshToken, tenantId, email });
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch {
      clearAuth();
      window.location.href = "/login";
      return Promise.reject(error);
    }
  }
);

export function newIdempotencyKey() {
  return crypto.randomUUID();
}
