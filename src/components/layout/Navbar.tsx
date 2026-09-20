// src/components/layout/Navbar.tsx
/**
 * Barra de navegación superior.
 *
 * - Logo DevForge AI.
 * - Botón hamburguesa para colapsar el sidebar.
 * - Notificaciones (placeholder — se conecta en Fase 12).
 * - Menú de usuario (perfil, logout).
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import Avatar from '@/components/Avatar';
import { useAuthStore, useUIStore } from '@/store';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

import { NotificacionesDropdown } from '@/features/notificaciones/NotificacionesDropdown';

export function Navbar() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { online, pendientes } = useOnlineStatus();

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    if (!menuAbierto) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuAbierto]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-surface-800 bg-surface-900/80 px-4 backdrop-blur-sm">
      {/* --- Izquierda: menú + logo --- */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-md p-2 text-surface-300 hover:bg-surface-800 hover:text-surface-100"
          aria-label="Alternar menú lateral"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link to="/proyectos" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
            DF
          </div>
          <span className="hidden text-sm font-semibold text-surface-100 sm:inline">
            DevForge AI
          </span>
        </Link>
      </div>

      {/* --- // En la parte derecha (antes del botón de notificaciones):--- */}
{!online && (
  <span className="flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
    Offline
  </span>
)}
{online && pendientes > 0 && (
  <span
    className="flex items-center gap-1 rounded-md bg-brand-600/10 px-2 py-1 text-xs font-medium text-brand-300"
    title="Cambios pendientes de sincronizar"
  >
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
    {pendientes} pendiente{pendientes > 1 ? 's' : ''}
  </span>
)}

      {/* --- Derecha: notificaciones + usuario --- */}
      <div className="flex items-center gap-2">
        {/* Notificaciones (placeholder — Fase 12) */}
        {/* <NotificacionesDropdown /> */}

        {/* Menú de usuario */}
        {usuario && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              className="flex items-center gap-2 rounded-md p-1 hover:bg-surface-800"
              aria-haspopup="menu"
              aria-expanded={menuAbierto}
            >
              <Avatar id={usuario.id} nombre={usuario.nombre_completo} size="sm" />
              <span className="hidden max-w-[140px] truncate text-sm text-surface-200 sm:inline">
                {usuario.nombre_completo}
              </span>
            </button>

            {menuAbierto && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 animate-slide-in overflow-hidden rounded-md border border-surface-800 bg-surface-900 shadow-xl"
              >
                <div className="border-b border-surface-800 px-4 py-3">
                  <p className="truncate text-sm font-medium text-surface-100">
                    {usuario.nombre_completo}
                  </p>
                  <p className="truncate text-xs text-surface-400">
                    {usuario.email}
                  </p>
                  <span className="mt-1 inline-block rounded bg-brand-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
                    {usuario.rol}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-surface-200 hover:bg-surface-800"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;