
// src/components/layout/AppLayout.tsx
/**
 * Layout de páginas autenticadas.
 *
 * - Navbar arriba (fijo).
 * - Sidebar a la izquierda (colapsable).
 * - Contenido central (Outlet del router).
 * - Toaster global.
 * - Guard: redirige a /login si no hay sesión.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import Toaster from '@/components/Toaster';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store';

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-900">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}

export default AppLayout;