// src/features/proyectos/ProyectoDetailPage.tsx
/**
 * Pantalla de detalle de un proyecto.
 *
 * Muestra:
 * - Header con nombre, estado, acciones (archivar, eliminar).
 * - Lista de diagramas del proyecto (con CTA para crear uno nuevo).
 * - Botón para abrir el modal de miembros.
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/Button";
import { PageLoader } from "@/components/Loader";
import { useAuthStore, useProyectoStore, toast } from "@/store";
import { diagramasApi } from "@/api";
import type { Diagrama } from "@/types";
import MiembrosProyectoModal from "./components/MiembrosProyectoModal";
import CrearDiagramaModal from "./components/CrearDiagramaModal";

export function ProyectoDetailPage() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const id = proyectoId ? parseInt(proyectoId, 10) : null;

  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);

  const proyectoActivo = useProyectoStore((s) => s.proyectoActivo);
  const isLoadingActivo = useProyectoStore((s) => s.isLoadingActivo);
  const cargarProyectoActivo = useProyectoStore((s) => s.cargarProyectoActivo);
  const eliminarProyecto = useProyectoStore((s) => s.eliminar);
  const archivarProyecto = useProyectoStore((s) => s.archivar);
  const reactivarProyecto = useProyectoStore((s) => s.reactivar);

  const [miembrosModalAbierto, setMiembrosModalAbierto] = useState(false);
  const [crearDiagramaAbierto, setCrearDiagramaAbierto] = useState(false);
  const [diagramas, setDiagramas] = useState<Diagrama[]>([]);
  const [cargandoDiagramas, setCargandoDiagramas] = useState(true);

  // Cargar proyecto + diagramas cuando cambia el id de la URL.
  // El store de proyecto ya está protegido contra recargas del mismo id
  // (ver `idCargado` en proyectoStore), así que aquí solo disparamos
  // la carga cuando `id` cambia de verdad.
  useEffect(() => {
    if (!id) return;
    void cargarProyectoActivo(id);
    void cargarDiagramas(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargarDiagramas(proyectoId: number) {
    setCargandoDiagramas(true);
    try {
      const items = await diagramasApi.listarPorProyecto(proyectoId);
      setDiagramas(items);
    } catch {
      setDiagramas([]);
    } finally {
      setCargandoDiagramas(false);
    }
  }

  // Permisos del usuario actual en este proyecto
  const miMiembro = proyectoActivo?.miembros.find(
    (m) => m.id_usuario === usuario?.id,
  );
  const esPropietario = miMiembro?.rol_en_proyecto === "PROPIETARIO";
  const puedeEditar = ["PROPIETARIO", "EDITOR"].includes(
    miMiembro?.rol_en_proyecto ?? "",
  );
  const esActivo = proyectoActivo?.estado === "ACTIVO";

  // ------------------------------------------------------------------
  // Acciones
  // ------------------------------------------------------------------
  async function handleEliminar() {
    if (!proyectoActivo) return;
    if (
      !window.confirm(
        `¿Eliminar el proyecto "${proyectoActivo.nombre}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    try {
      await eliminarProyecto(proyectoActivo.id);
      toast.success("Proyecto eliminado");
      navigate("/proyectos", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo eliminar el proyecto",
      );
    }
  }

  async function handleArchivar() {
    if (!proyectoActivo) return;
    try {
      if (esActivo) {
        await archivarProyecto(proyectoActivo.id);
        toast.success("Proyecto archivado");
      } else {
        await reactivarProyecto(proyectoActivo.id);
        toast.success("Proyecto reactivado");
      }
      await cargarProyectoActivo(proyectoActivo.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo cambiar el estado",
      );
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (isLoadingActivo || !proyectoActivo) {
    return <PageLoader mensaje="Cargando proyecto…" />;
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* -------- Header -------- */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/proyectos")}
          className="mb-3 flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver a proyectos
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-surface-100">
                {proyectoActivo.nombre}
              </h1>
              <span
                className={[
                  "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  esActivo
                    ? "bg-success/20 text-success"
                    : "bg-surface-700 text-surface-300",
                ].join(" ")}
              >
                {proyectoActivo.estado}
              </span>
            </div>

            {proyectoActivo.descripcion && (
              <p className="mt-2 max-w-2xl text-sm text-surface-400">
                {proyectoActivo.descripcion}
              </p>
            )}

            <div className="mt-3 flex items-center gap-4 text-xs text-surface-500">
              <span>
                {proyectoActivo.miembros.length}{" "}
                {proyectoActivo.miembros.length === 1 ? "miembro" : "miembros"}
              </span>
              <span>
                {diagramas.length}{" "}
                {diagramas.length === 1 ? "diagrama" : "diagramas"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMiembrosModalAbierto(true)}
            >
              Miembros
            </Button>

            {esPropietario && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleArchivar()}
              >
                {esActivo ? "Archivar" : "Reactivar"}
              </Button>
            )}

            {esPropietario && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleEliminar()}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* -------- Diagramas -------- */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-100">
            Diagramas UML
          </h2>
          {puedeEditar && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
              onClick={() => setCrearDiagramaAbierto(true)}
            >
              Nuevo diagrama
            </Button>
          )}
        </div>

        {cargandoDiagramas ? (
          <PageLoader mensaje="Cargando diagramas…" />
        ) : diagramas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-700 p-10 text-center">
            <p className="text-surface-400">
              Este proyecto todavía no tiene diagramas.
            </p>
            {puedeEditar && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setCrearDiagramaAbierto(true)}
              >
                Crear el primero
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {diagramas.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => navigate(`/diagramas/${d.id}`)}
                className="flex flex-col gap-2 rounded-lg border border-surface-800 bg-surface-900/40 p-4 text-left transition-all hover:border-brand-600/40 hover:bg-surface-900/70"
              >
                <h3 className="truncate text-sm font-semibold text-surface-100">
                  {d.nombre}
                </h3>
                <p className="text-xs text-surface-500">
                  v{d.numero_version} · UML {d.version_uml}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* -------- Modales (montados solo cuando están abiertos) -------- */}
      {miembrosModalAbierto && (
        <MiembrosProyectoModal
          open={miembrosModalAbierto}
          onClose={() => setMiembrosModalAbierto(false)}
          proyectoId={proyectoActivo.id}
        />
      )}

      {crearDiagramaAbierto && (
        <CrearDiagramaModal
          open={crearDiagramaAbierto}
          onClose={() => setCrearDiagramaAbierto(false)}
          proyectoId={proyectoActivo.id}
          onCreado={() => {
            if (id) void cargarDiagramas(id);
          }}
        />
      )}
    </div>
  );
}

export default ProyectoDetailPage;