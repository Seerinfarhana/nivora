import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken } from "../lib/api";
import { deviceModel } from "../lib/device";

export type Role = "customer" | "admin";
export interface Prefs {
  textSize?: number; spokenReplies?: boolean; txnAlerts?: boolean; billReminders?: boolean;
  offers?: boolean; personalised?: boolean; assistantData?: boolean;
}
export interface User {
  id: number; name: string; email: string; role: Role; phone?: string; onboarded: boolean;
  user_type?: string; txn_limit: number; prefs: Prefs;
}

interface RegisterData { name: string; email: string; password: string; pin: string; phone: string; otp_token: string; }

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => !getToken());

  // Restore the session from the saved JWT
  useEffect(() => {
    if (!getToken()) return;
    api<User>("/api/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  // The text size chosen in Preferences applies everywhere, on every visit
  useEffect(() => {
    const size = user?.prefs?.textSize;
    document.documentElement.style.fontSize = size && size !== 16 ? `${size}px` : "";
  }, [user?.prefs?.textSize, user?.id]);

  const refresh = useCallback(async () => { setUser(await api<User>("/api/auth/me")); }, []);

  const finish = (r: { token: string; user: User }) => { setToken(r.token); setUser(r.user); return r.user; };

  const login = async (email: string, password: string) =>
    finish(await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, device_model: await deviceModel() }) }));

  const register = async (d: RegisterData) =>
    finish(await api("/api/auth/register", { method: "POST", body: JSON.stringify({ ...d, device_model: await deviceModel() }) }));

  const logout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* already signed out */ }
    setToken(null); setUser(null);
  };

  if (!ready) return null;
  return <Ctx.Provider value={{ user, login, register, logout, refresh, setUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
