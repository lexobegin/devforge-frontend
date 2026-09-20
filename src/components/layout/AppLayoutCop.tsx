// src/router/AppRouter.tsx
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store';

// --- Placeholders (se reemplazan por features reales) ---
function PlaceholderProyectos() {
  return <div className="p-6 text-surface-300">Lista de proyectos (próximamente)</div>;
}
function PlaceholderProyectoDetalle() {
  return <div className="p-6 text-surface-300">Detalle de proyecto (próximamente)</div>;
}
function PlaceholderEditor() {
  return <div className="p-6 text-surface-300">Editor de diagramas (próximamente)</div>;
}
function PlaceholderLogin() {
  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-surface-300">Login (próximamente)</p>
    </div>
  );
}
function PlaceholderRegister() {
  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-surface-300">Registro (próximamente)</p>
    </div>
  );
}
function PlaceholderNotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-surface-100">404</h1>
      <p className="text-surface-400">Página no encontrada</p>
      <a href="/" className="text-brand-400 hover:text-brand-300">Volver al inicio</a>
    </div>
  );
}

export default function AppRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      {/* Públicas */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/proyectos" replace /> : <PlaceholderLogin />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/proyectos" replace /> : <PlaceholderRegister />}
      />

      {/* Raíz */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/proyectos' : '/login'} replace />} />

      {/* Protegidas: envueltas en AppLayout (que ya hace el guard) */}
      <Route element={<AppLayout />}>
        <Route path="/proyectos" element={<PlaceholderProyectos />} />
        <Route path="/proyectos/:proyectoId" element={<PlaceholderProyectoDetalle />} />
        <Route path="/diagramas/:diagramaId" element={<PlaceholderEditor />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<PlaceholderNotFound />} />
    </Routes>
  );
}