// src/router/AppRouter.tsx
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ProyectosListPage } from '@/features/proyectos/ProyectosListPage';
import { ProyectoDetailPage } from '@/features/proyectos/ProyectoDetailPage';
import { DiagramEditorPage } from '@/features/diagrama-editor/DiagramEditorPage';
import { useAuthStore } from '@/store';

import { GeneracionStatusPage } from '@/features/generacion-codigo/GeneracionStatusPage';
import { NotificacionesPage } from '@/features/notificaciones/NotificacionesPage';

function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface-950">
      <h1 className="text-5xl font-bold text-surface-100">404</h1>
      <p className="text-surface-400">Página no encontrada</p>
      <a href="/" className="text-brand-400 transition-colors hover:text-brand-300">
        Volver al inicio
      </a>
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
        element={
          isAuthenticated ? (
            <Navigate to="/proyectos" replace />
          ) : (
            <AuthLayout title="Iniciar sesión" subtitle="Accedé a tu cuenta de DevForge AI">
              <LoginPage />
            </AuthLayout>
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/proyectos" replace />
          ) : (
            <AuthLayout title="Crear cuenta" subtitle="Empezá a diseñar y generar software con IA">
              <RegisterPage />
            </AuthLayout>
          )
        }
      />

      {/* Raíz */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/proyectos' : '/login'} replace />}
      />

      {/* Protegidas */}
      <Route element={<AppLayout />}>
        <Route path="/proyectos" element={<ProyectosListPage />} />
        <Route path="/proyectos/:proyectoId" element={<ProyectoDetailPage />} />
        <Route path="/diagramas/:diagramaId" element={<DiagramEditorPage />} />
        <Route path="/generacion/:trabajoId" element={<GeneracionStatusPage />} />
        <Route path="/notificaciones" element={<NotificacionesPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}