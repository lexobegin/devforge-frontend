// src/features/diagrama-editor/panels/ParticipantsPanel.tsx
/**
 * Panel de colaboradores conectados al diagrama.
 *
 * Se actualiza automáticamente desde el `colaboracionStore`
 * (alimentado por eventos WebSocket en la Fase 10).
 */

import Avatar from '@/components/Avatar';
import { useColaboracionStore, useAuthStore } from '@/store';

export function ParticipantsPanel() {
  const conectados = useColaboracionStore((s) => s.conectados);
  const isConnected = useColaboracionStore((s) => s.isConnected);
  const usuario = useAuthStore((s) => s.usuario);

  return (
    <div className="border-b border-surface-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          Colaboradores ({conectados.length + (usuario ? 1 : 0)})
        </h4>

        <span
          className={[
            'flex items-center gap-1 text-[10px] font-medium',
            isConnected ? 'text-success' : 'text-surface-500',
          ].join(' ')}
          title={isConnected ? 'Conectado' : 'Desconectado'}
        >
          <span
            className={[
              'h-1.5 w-1.5 rounded-full',
              isConnected ? 'bg-success' : 'bg-surface-600',
            ].join(' ')}
          />
          {isConnected ? 'En vivo' : 'Offline'}
        </span>
      </div>

      {/* Yo */}
      {usuario && (
        <div className="mb-1 flex items-center gap-2 rounded px-1 py-1">
          <Avatar id={usuario.id} nombre={usuario.nombre_completo} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm text-surface-200">
            {usuario.nombre_completo}{' '}
            <span className="text-surface-500">(vos)</span>
          </span>
        </div>
      )}

      {/* Otros */}
      {conectados.length === 0 ? (
        <p className="mt-1 text-xs text-surface-500">
          No hay otros colaboradores conectados.
        </p>
      ) : (
        <ul className="space-y-1">
          {conectados.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded px-1 py-1"
            >
              <Avatar
                id={c.id}
                nombre={c.nombre}
                size="sm"
                color={c.color}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-surface-200">
                {c.nombre}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ParticipantsPanel;