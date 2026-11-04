import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Sparkles, LineChart, Target, Gem, BookOpen, UserCog, ShieldCheck,
  Bell, Search, LogOut, Menu, X, Users,
} from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const customerNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/insights", label: "Insights", icon: LineChart },
  { to: "/goals", label: "Savings goals", icon: Target },
  { to: "/recommendations", label: "Recommendations", icon: Gem },
  { to: "/knowledge", label: "Knowledge centre", icon: BookOpen },
  { to: "/settings", label: "Profile & security", icon: UserCog },
];
const adminNav = [
  { to: "/admin", label: "Admin console", icon: ShieldCheck },
  { to: "/dashboard", label: "Customer view", icon: Users },
];

export default function AppShell({ variant = "customer" }: { variant?: "customer" | "admin" }) {
  const { user, logout } = useAuth();
  const nav = variant === "admin" ? adminNav : customerNav;
  const [open, setOpen] = useState(false);
  const go = useNavigate();
  const initials = (user?.name || "N").split(" ").map(s => s[0]).slice(0, 2).join("");

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-2 pt-1">
        <Logo />
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              isActive ? "bg-brand-500 text-white shadow-sm" : "text-muted hover:bg-brand-50 hover:text-brand-700")}>
            <Icon className="h-[18px] w-[18px]" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-2xl bg-brand-50 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white font-semibold text-brand-700">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted">{variant === "admin" ? "Operations admin" : "Savings customer"}</p>
          </div>
        </div>
        <button onClick={() => { logout(); go("/login"); }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-sm font-semibold text-muted transition hover:text-rose-ink">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform lg:hidden", open ? "translate-x-0" : "-translate-x-full")}>{sidebar}</aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-mist/85 px-4 py-3 backdrop-blur sm:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field pl-9" placeholder="Search transactions, payees, help" aria-label="Search" />
          </div>
          <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-muted hover:text-ink" aria-label="Notifications">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-ink" />
          </button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8"><Outlet /></main>
      </div>
    </div>
  );
}
