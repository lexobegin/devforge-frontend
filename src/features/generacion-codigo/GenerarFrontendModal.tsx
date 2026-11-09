// src/features/generacion-codigo/GenerarFrontendModal.tsx
/**
 * Modal para disparar la generación de FRONTEND React (CU24).
 *
 * - Muestra el stack destino (React 18 + Vite 5 + TypeScript, un CRUD por
 *   cada clase UML: tipos, cliente API, listado y formulario).
 * - Opción: nombre del proyecto generado.
 * - Al disparar, redirige a la página de estado con el id del trabajo
 *   (misma pantalla que el backend: el ZIP de ambos stacks se descarga
 *   desde ahí).
 *
 * Contrato (app/api/v1/generacion_router.py + generacion_schema.py,
 * Tanda B21 del backend):
 * - ES el MISMO endpoint POST /generacion/diagramas/{id}/generar con
 *   stack_destino="REACT_TS_VITE": el router deriva a
 *   GeneradorFrontendService (Tanda 17 del backend, templates_react).
 * - package_base e incluir_postman NO aplican al stack frontend (el
 *   backend los ignora — request compartido del Ciclo 1).
 * - Pipeline síncrono: el POST responde 200 con el trabajo EXITOSO o
 *   lanza el error de dominio (sin clases → 422 "El diagrama no tiene
 *   clases…"; ajeno → 404 genérico).
 * - `trabajo.id` es ObjectId hex (string) → se usa directo en la ruta.
 * - `diagramaId` es ObjectId hex (string), no number.
 */

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { generacionApi } from '@/api';
import { toast } from '@/store';
import type { Id } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface GenerarFrontendModalProps {
  open: boolean;
  onClose: () => void;
  /** ObjectId hex del diagrama (string, Ciclo 2). */
  diagramaId: Id;
}

// ======================================================================
// Componente
// ======================================================================
export function GenerarFrontendModal({
  open,
  onClose,
  diagramaId,
}: GenerarFrontendModalProps) {
  const navigate = useNavigate();

  const [nombreProyecto, setNombreProyecto] = useState('');
  const [generando, setGenerando] = useState(false);

  const handleClose = () => {
    if (generando) return;
    setNombreProyecto('');
    onClose();
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (generando) return;

    setGenerando(true);
    try {
      const trabajo = await generacionApi.generarFrontend(diagramaId, {
        nombre_proyecto: nombreProyecto.trim() || undefined,
      });
      toast.success('Frontend generado');
      onClose();
      navigate(`/generacion/${trabajo.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo generar el frontend'
      );
      setGenerando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generar frontend"
      description="Se generará un proyecto React + Vite + TypeScript con un CRUD por cada clase del diagrama actual."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={generando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-generar-frontend"
            variant="primary"
            loading={generando}
          >
            Generar frontend
          </Button>
        </>
      }
    >
      <form id="form-generar-frontend" onSubmit={handleSubmit} className="space-y-4">
        {/* -------- Stack (info) -------- */}
        <div className="rounded-md border border-surface-800 bg-surface-900/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
            Stack destino
          </p>
          <ul className="space-y-1 text-xs text-surface-300">
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> React 18 + Vite 5 + TypeScript
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> Un CRUD por cada clase UML: tipos, cliente API, listado y formulario
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> App.tsx que monta todos los CRUDs + cliente API con JWT
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-400">▸</span> Listo para <code>npm install &amp;&amp; npm run dev</code>
            </li>
          </ul>
        </div>

        {/* -------- Nombre del proyecto -------- */}
        <div>
          <label htmlFor="nombre-proyecto-fe" className="label-base text-xs">
            Nombre del proyecto (opcional)
          </label>
          <input
            id="nombre-proyecto-fe"
            type="text"
            value={nombreProyecto}
            onChange={(e) => setNombreProyecto(e.target.value)}
            placeholder="clinica-web"
            maxLength={100}
            disabled={generando}
            className="input-base text-sm"
          />
          <p className="mt-1 text-[10px] text-surface-500">
            Por defecto se usa el nombre del diagrama (tildes y ñ se
            convierten a ASCII para los archivos y el paquete npm).
          </p>
        </div>

        <p className="text-xs text-surface-500">
          La generación corre completa en la llamada (Ciclo 2): al terminar
          se abre la pantalla del trabajo, desde donde descargás el ZIP.
        </p>
      </form>
    </Modal>
  );
}

export default GenerarFrontendModal;
