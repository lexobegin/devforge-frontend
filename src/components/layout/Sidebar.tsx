// src/components/layout/Sidebar.tsx
/**
 * Barra lateral de navegación principal.
 *
 * Navegación por enlaces con React Router.
 * Se colapsa/expande desde el uiStore (controlado por el Navbar).
 *
 * Los items marcados con `soloAdmin: true` solo se muestran a usuarios
 * con rol ADMIN de la plataforma.
 */

import { NavLink } from 'react-router-dom';

import { useAuthStore, useUIStore } from '@/store';

// ======================================================================
// Items de navegación
// ======================================================================
interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  /** Solo visible para ADMIN de la plataforma. */
  soloAdmin?: boolean;
}

const iconClass = 'h-5 w-5 flex-shrink-0';

const NAV_ITEMS: NavItem[] = [
  {
    to: '/proyectos',
    label: 'Proyectos',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    to: '/notificaciones',
    label: 'Notificaciones',
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    to: '/auditoria',
    label: 'Auditoría',
    soloAdmin: true,
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    soloAdmin: true,
    icon: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

// ======================================================================
// Componente
// ======================================================================
export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const esAdmin = useAuthStore((s) => s.usuario?.rol === 'ADMIN');

  if (!sidebarOpen) return null;

  // Filtrar items según rol
  const items = NAV_ITEMS.filter((item) => !item.soloAdmin || esAdmin);

  return (
    <aside className="flex w-60 flex-col border-r border-surface-800 bg-surface-900/60">
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600/20 text-brand-200'
                      : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
                  ].join(' ')
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-surface-800 p-3">
        <p className="text-[10px] uppercase tracking-wider text-surface-500">
          DevForge AI · v0.1.0
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;