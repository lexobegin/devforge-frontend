// src/App.tsx
/**
 * Componente raíz de la aplicación.
 *
 * - Carga la sesión del usuario al arrancar (si hay token guardado).
 * - Monta el router principal.
 * - Muestra un loader mientras se resuelve el boot inicial.
 */

import { useEffect } from 'react';

import AppRouter from './router/AppRouter';
import { useAuthStore } from './store/authStore';

export default function App() {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  // quitar
  console.log('[App] RENDER isBootstrapping=', isBootstrapping, 'bootstrap=', bootstrap);

  // Boot: intenta restaurar sesión desde el token guardado
  useEffect(() => {
    // quitar
    console.log('[App] bootstrap() llamado');
    void bootstrap();
  }, [bootstrap]);

  if (isBootstrapping) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-700 border-t-brand-500" />
          <p className="text-sm text-surface-400">Cargando DevForge AI…</p>
        </div>
      </div>
    );
  }

  return <AppRouter />;
}