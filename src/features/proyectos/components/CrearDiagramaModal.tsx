// src/features/proyectos/components/CrearDiagramaModal.tsx
/**
 * Modal para crear un diagrama dentro de un proyecto.
 *
 * Pide el nombre (y opcionalmente la versión UML) y crea el diagrama.
 * Al terminar, redirige al editor para empezar a modelar.
 */

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { diagramasApi } from '@/api';
import { toast } from '@/store';

// ======================================================================
// Tipos
// ======================================================================
interface CrearDiagramaModalProps {
  open: boolean;
  onClose: () => void;
  proyectoId: number;
  /** Callback opcional tras crear el diagrama. */
  onCreado?: (diagramaId: number) => void;
}

// ======================================================================
// Componente
// ======================================================================
export function CrearDiagramaModal({
  open,
  onClose,
  proyectoId,
  onCreado,
}: CrearDiagramaModalProps) {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [versionUml, setVersionUml] = useState('2.5.1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setNombre('');
    setVersionUml('2.5.1');
    setError(null);
    setIsLoading(false);
  }

  function handleClose() {
    if (isLoading) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    const n = nombre.trim();
    if (!n) {
      setError('El nombre es obligatorio');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const diagrama = await diagramasApi.crear(proyectoId, {
        nombre: n,
        version_uml: versionUml.trim() || '2.5.1',
      });
      toast.success(`Diagrama "${diagrama.nombre}" creado`);

      reset();
      onCreado?.(diagrama.id);
      onClose();

      // Redirigir al editor del diagrama recién creado
      navigate(`/diagramas/${diagrama.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear el diagrama'
      );
      setIsLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nuevo diagrama"
      description="Creá un diagrama de clases UML dentro del proyecto."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="crear-diagrama-form"
            variant="primary"
            loading={isLoading}
          >
            Crear y abrir editor
          </Button>
        </>
      }
    >
      <form id="crear-diagrama-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="diagrama-nombre" className="label-base">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            id="diagrama-nombre"
            type="text"
            required
            autoFocus
            maxLength={150}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Diagrama de clases — módulo de salud"
            className="input-base"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="diagrama-version-uml" className="label-base">
            Versión UML
          </label>
          <input
            id="diagrama-version-uml"
            type="text"
            maxLength={10}
            value={versionUml}
            onChange={(e) => setVersionUml(e.target.value)}
            className="input-base"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-surface-500">
            Por defecto: <code>2.5.1</code>
          </p>
        </div>
      </form>
    </Modal>
  );
}

export default CrearDiagramaModal;