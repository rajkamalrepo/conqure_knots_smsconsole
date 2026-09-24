import { createContext, useContext, useMemo, useState } from "react";
import { authClient, clearAuth, getStoredAuth, storeAuth } from "../api/client.js";

const AuthContext = createContext(null);

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Real auth against /api/v1/auth (architecture doc §11) — register creates a
 * tenant first (POST /api/v1/tenants), then the user under it, then logs in.
 * Login/refresh both come back as { token, refreshToken, ... }; the access
 * token's own claims (sub = email, tenantId) are decoded client-side rather
 * than trusted separately, so the UI's idea of "who am I" always matches
 * exactly what the backend will enforce on the next request.
 */
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyToken = ({ token, refreshToken }) => {
    const claims = decodeJwt(token) || {};
    const next = {
      token,
      refreshToken,
      tenantId: claims.tenantId || "",
      email: claims.sub || ""
    };
    storeAuth(next);
    setAuth(next);
    return next;
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      
      //var test_tenantId
      const res = await authClient.post("/api/v1/auth/login", { email, password });
      return applyToken(res.data);
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.title || "Invalid email or password.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ companyName, email, password }) => {
    
    setLoading(true);
    setError(null);
    try {
      
      // const tenantRes = await authClient.post("/api/v1/auth/register", { tenantId: companyName ,  });
      // const tenantId = tenantRes.data.tenantId;

      await authClient.post("/api/v1/auth/register", { tenantId: companyName, email, password , role : "user" });

      const loginRes = await authClient.post("/api/v1/auth/login", { email, password });
      return applyToken(loginRes.data);
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.title || "Could not create the account.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const { refreshToken } = getStoredAuth();
    if (refreshToken) {
      authClient.post("/api/v1/auth/logout", { refreshToken }).catch(() => {});
    }
    clearAuth();
    setAuth({ token: "", refreshToken: "", tenantId: "", email: "" });
  };

  const value = useMemo(
    () => ({
      ...auth,
      isAuthenticated: Boolean(auth.token),
      loading,
      error,
      login,
      register,
      logout
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
