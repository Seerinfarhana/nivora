import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "customer" | "admin";
export interface User { name: string; email: string; role: Role; }

interface AuthCtx {
  user: User | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
const KEY = "nivora.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
  });

  /** Demo auth. Replace with POST /api/auth/login (JWT) when the FastAPI backend is ready. */
  const login = (email: string, name?: string) => {
    const isAdmin = email.toLowerCase().startsWith("admin");
    const u: User = {
      email,
      role: isAdmin ? "admin" : "customer",
      name: name || (isAdmin ? "Meera Iyer" : "Aarav Menon"),
    };
    localStorage.setItem(KEY, JSON.stringify(u));
    setUser(u);
  };
  const logout = () => { localStorage.removeItem(KEY); setUser(null); };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
