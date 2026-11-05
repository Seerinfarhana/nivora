import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken } from "../lib/api";

export type Role = "customer" | "admin";
export interface User { id: number; name: string; email: string; role: Role; language?: string; }

interface RegisterData { name: string; email: string; password: string; phone: string; language: string; }

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
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

  const finish = (r: { token: string; user: User }) => { setToken(r.token); setUser(r.user); return r.user; };

  const login = async (email: string, password: string) =>
    finish(await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));

  const register = async (d: RegisterData) =>
    finish(await api("/api/auth/register", { method: "POST", body: JSON.stringify(d) }));

  const logout = () => { setToken(null); setUser(null); };

  if (!ready) return null;
  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
