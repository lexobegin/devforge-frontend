// src/features/proyectos/components/CrearProyectoModal.tsx
/**
 * Modal para crear un proyecto.
 *
 * Muestra inputs de nombre y descripción. Al crear, agrega el proyecto
 * al store y cierra el modal.
 */

import { FormEvent, useState } from 'react';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useProyectoStore, toast } from '@/store';

interface CrearProyectoModalProps {
  open: boolean;
  onClose: () => void;
  onCreado?: (id: number) => void;
}

export function CrearProyectoModal({
  open,
  onClose,
  onCreado,
}: CrearProyectoModalProps) {
  const crear = useProyectoStore((s) => s.crear);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setNombre('');
    setDescripcion('');
    setError(null);
    setIsLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const proyecto = await crear({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });
      toast.success(`Proyecto "${proyecto.nombre}" creado`);
      reset();
      onCreado?.(proyecto.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear el proyecto'
      );
      setIsLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nuevo proyecto"
      description="Creá un proyecto para empezar a modelar y generar software."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="crear-proyecto-form"
            variant="primary"
            loading={isLoading}
          >
            Crear proyecto
          </Button>
        </>
      }
    >
      <form id="crear-proyecto-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="proyecto-nombre" className="label-base">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            id="proyecto-nombre"
            type="text"
            required
            autoFocus
            maxLength={150}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Sistema de Salud Universal"
            className="input-base"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="proyecto-descripcion" className="label-base">
            Descripción
          </label>
          <textarea
            id="proyecto-descripcion"
            rows={3}
            maxLength={2000}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Breve descripción del proyecto (opcional)"
            className="input-base resize-none"
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  );
}

export default CrearProyectoModal;