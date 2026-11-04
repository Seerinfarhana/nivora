import { Navigate, Route, Routes } from "react-router-dom";
import SmoothScroll from "./lib/SmoothScroll";
import { useAuth, Role } from "./context/AuthContext";
import AppShell from "./layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assistant from "./pages/Assistant";
import Insights from "./pages/Insights";
import Goals from "./pages/Goals";
import Recommendations from "./pages/Recommendations";
import Knowledge from "./pages/Knowledge";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import { ReactNode } from "react";

function Guard({ role, children }: { role?: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <SmoothScroll />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace /> : <Login />} />
        <Route element={<Guard><AppShell /></Guard>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route element={<Guard role="admin"><AppShell variant="admin" /></Guard>}>
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  );
}
