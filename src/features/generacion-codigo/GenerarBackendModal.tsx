// src/features/generacion-codigo/GenerarBackendModal.tsx
/**
 * Modal para disparar la generación de backend Spring Boot.
 *
 * - Muestra el stack destino (Spring Boot + JPA + PostgreSQL).
 * - Opciones avanzadas: incluir Postman, nombre del proyecto, package base.
 * - Al disparar, redirige a la página de estado con el id del trabajo.
 */

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { generacionApi } from '@/api';
import { toast } from '@/store';
import type { GenerarBackendRequest } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface GenerarBackendModalProps {
  open: boolean;
  onClose: () => void;
  diagramaId: number;
}

// ======================================================================
// Componente
// ======================================================================
export function GenerarBackendModal({
  open,
  onClose,
  diagramaId,
}: GenerarBackendModalProps) {
  const navigate = useNavigate();

  const [incluirPostman, setIncluirPostman] = useState(true);
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [packageBase, setPackageBase] = useState('');
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false);
  const [generando, setGenerando] = useState(false);

  const handleClose = () => {
    if (generando) return;
    setNombreProyecto('');
    setPackageBase('');
    setIncluirPostman(true);
    setAvanzadoAbierto(false);
    onClose();
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (generando) return;

    setGenerando(true);
    try {
      const payload: GenerarBackendRequest = {
        stack_destino: 'SPRING_BOOT_JPA_POSTGRES',
        incluir_postman: incluirPostman,
        nombre_proyecto: nombreProyecto.trim() || undefined,
        package_base: packageBase.trim() || undefined,
      };

      const trabajo = await generacionApi.generar(diagramaId, payload);
      toast.success('Generación iniciada');
      onClose();
      navigate(`/generacion/${trabajo.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo iniciar la generación'
      );
      setGenerando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generar backend"
      description="Se generará un proyecto Spring Boot completo a partir del diagrama actual."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={generando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-generar-backend"
            variant="primary"
            loading={generando}
          >
            Generar backend
          </Button>
        </>
      }
    >
      <form id="form-generar-backend" onSubmit={handleSubmit} className="space-y-4">
        {/* -------- Stack (info) -------- */}
        <div className="rounded-md border border-surface-800 bg-surface-900/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
            Stack destino
          </p>
          <ul className="space-y-1 text-xs text-surface-300">
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> Java 17 + Spring Boot 3.2
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> Arquitectura Controller / Service / Repository / Entity / DTO
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> JPA / Hibernate + PostgreSQL
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> API REST
            </li>
          </ul>
        </div>

        {/* -------- Postman -------- */}
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={incluirPostman}
            onChange={(e) => setIncluirPostman(e.target.checked)}
            disabled={generando}
            className="mt-0.5 h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-surface-200">
            Incluir colección Postman
            <span className="ml-1 text-xs text-surface-500">
              (un folder con las 5 operaciones CRUD por entidad)
            </span>
          </span>
        </label>

        {/* -------- Opciones avanzadas -------- */}
        <div>
          <button
            type="button"
            onClick={() => setAvanzadoAbierto((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300"
          >
            <svg
              className={[
                'h-3.5 w-3.5 transition-transform',
                avanzadoAbierto ? 'rotate-90' : '',
              ].join(' ')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Opciones avanzadas
          </button>

          {avanzadoAbierto && (
            <div className="mt-3 space-y-3 rounded-md border border-surface-800 bg-surface-900/40 p-3">
              <div>
                <label htmlFor="nombre-proyecto" className="label-base text-xs">
                  Nombre del proyecto (opcional)
                </label>
                <input
                  id="nombre-proyecto"
                  type="text"
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  placeholder="salud-universal-backend"
                  maxLength={100}
                  disabled={generando}
                  className="input-base text-sm"
                />
              </div>

              <div>
                <label htmlFor="package-base" className="label-base text-xs">
                  Package base (opcional)
                </label>
                <input
                  id="package-base"
                  type="text"
                  value={packageBase}
                  onChange={(e) => setPackageBase(e.target.value)}
                  placeholder="com.devforge.generated.salud"
                  maxLength={200}
                  disabled={generando}
                  className="input-base text-sm"
                />
                <p className="mt-1 text-[10px] text-surface-500">
                  Por defecto: <code>com.devforge.generated</code>
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-surface-500">
          El proyecto se generará en segundo plano. Vas a poder seguir el
          progreso en la siguiente pantalla.
        </p>
      </form>
    </Modal>
  );
}

export default GenerarBackendModal;