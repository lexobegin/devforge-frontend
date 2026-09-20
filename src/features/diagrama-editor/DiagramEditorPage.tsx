// src/features/diagrama-editor/DiagramEditorPage.tsx
/**
 * Página principal del editor de diagramas.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐
 *   │  Header (nombre del diagrama + acciones)     │
 *   ├────────────────────────────────┬─────────────┤
 *   │                                │  Diagram    │
 *   │    Canvas (React Flow)         │  Sidebar    │
 *   │                                │  / AIPanel  │
 *   └────────────────────────────────┴─────────────┘
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/Button';
import { PageLoader } from '@/components/Loader';
import {
  useDiagramaStore,
  useProyectoStore,
  useAuthStore,
  toast,
} from '@/store';
import DiagramCanvas from './canvas/DiagramCanvas';
import DiagramSidebar from './panels/DiagramSidebar';
import AIPanel from './ai-assistant/AIPanel';
import { useDiagramSocket } from './hooks/useDiagramSocket';
import { ExportModal } from '@/features/intercambio/ExportModal';
import { ImportModal } from '@/features/intercambio/ImportModal';

import { VersionHistoryPanel } from '@/features/trazabilidad/VersionHistoryPanel';
import { CommentsPanel } from '@/features/trazabilidad/CommentsPanel';

import { GenerarBackendModal } from '@/features/generacion-codigo/GenerarBackendModal';

type PanelDerecho = 'propiedades' | 'versiones' | 'comentarios';

export function DiagramEditorPage() {
  const { diagramaId } = useParams<{ diagramaId: string }>();
  const id = diagramaId ? parseInt(diagramaId, 10) : null;

  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);

  const cargarDiagrama = useDiagramaStore((s) => s.cargarDiagrama);
  const limpiar = useDiagramaStore((s) => s.limpiar);
  const diagrama = useDiagramaStore((s) => s.diagrama);
  const isLoading = useDiagramaStore((s) => s.isLoading);
  const error = useDiagramaStore((s) => s.error);

  const cargarProyectoActivo = useProyectoStore((s) => s.cargarProyectoActivo);
  const proyectoActivo = useProyectoStore((s) => s.proyectoActivo);

  const [panelDerecho, setPanelDerecho] = useState<PanelDerecho>('propiedades');
  const [aiPanelAbierto, setAiPanelAbierto] = useState(false);
  const [exportModalAbierto, setExportModalAbierto] = useState(false);
  const [importModalAbierto, setImportModalAbierto] = useState(false);

  const [generarModalAbierto, setGenerarModalAbierto] = useState(false);

  useEffect(() => {
    if (!id) return;
    void cargarDiagrama(id);
    return () => limpiar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (diagrama?.id_proyecto) {
      void cargarProyectoActivo(diagrama.id_proyecto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagrama?.id_proyecto]);

  const miMiembro = proyectoActivo?.miembros.find(
    (m) => m.id_usuario === usuario?.id
  );
  const esSoloLectura = miMiembro?.rol_en_proyecto === 'LECTOR';

  useDiagramSocket({
    diagramaId: id,
    enabled: !!id && !esSoloLectura,
  });

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-medium text-danger">
          No se pudo cargar el diagrama
        </p>
        <p className="max-w-md text-center text-sm text-surface-400">{error}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  if (isLoading || !diagrama) {
    return <PageLoader mensaje="Cargando diagrama…" />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* -------- Header -------- */}
      <header className="flex items-center justify-between gap-4 border-b border-surface-800 bg-surface-900/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/proyectos/${diagrama.id_proyecto}`)}
            className="rounded-md p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            aria-label="Volver al proyecto"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-surface-100">
              {diagrama.nombre}
            </h1>
            <p className="text-xs text-surface-500">
              UML {diagrama.version_uml} · v{diagrama.numero_version}
              {esSoloLectura && ' · Solo lectura'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPanelDerecho('versiones')}
            title="Ver historial de versiones"
          >
            Versiones
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportModalAbierto(true)}
            disabled={esSoloLectura}
          >
            Exportar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportModalAbierto(true)}
            disabled={esSoloLectura}
          >
            Importar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGenerarModalAbierto(true)}
            disabled={esSoloLectura}
          >
            Generar backend
          </Button>
          <Button
            variant={aiPanelAbierto ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setAiPanelAbierto((v) => !v)}
          >
            IA
          </Button>
        </div>
      </header>

      {/* -------- Body -------- */}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 bg-surface-950">
          <DiagramCanvas />
        </div>

        {aiPanelAbierto ? (
          <AIPanel
            proyectoId={diagrama.id_proyecto}
            diagramaId={diagrama.id}
            disabled={esSoloLectura}
            onClose={() => setAiPanelAbierto(false)}
          />
        ) : (
          <RightPanel
            panel={panelDerecho}
            setPanel={setPanelDerecho}
            diagramaId={diagrama.id}
            disabled={esSoloLectura}
          />
        )}
      </div>

      {/* -------- Modales -------- */}
      <ExportModal
        open={exportModalAbierto}
        onClose={() => setExportModalAbierto(false)}
        diagramaId={diagrama.id}
      />
      <ImportModal
        open={importModalAbierto}
        onClose={() => setImportModalAbierto(false)}
        diagramaId={diagrama.id}
      />
      <GenerarBackendModal
        open={generarModalAbierto}
        onClose={() => setGenerarModalAbierto(false)}
        diagramaId={diagrama.id}
      />
    </div>
  );
}

// ======================================================================
// Panel derecho con tabs: propiedades / versiones / comentarios
// ======================================================================
function RightPanel({
  panel,
  setPanel,
  diagramaId,
  disabled,
}: {
  panel: PanelDerecho;
  setPanel: (p: PanelDerecho) => void;
  diagramaId: number;
  disabled: boolean;
}) {
  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-l border-surface-800 bg-surface-900/40">
      {/* Tabs */}
      <div className="flex border-b border-surface-800">
        <TabBtn active={panel === 'propiedades'} onClick={() => setPanel('propiedades')}>
          Propiedades
        </TabBtn>
        <TabBtn active={panel === 'versiones'} onClick={() => setPanel('versiones')}>
          Versiones
        </TabBtn>
        <TabBtn active={panel === 'comentarios'} onClick={() => setPanel('comentarios')}>
          Comentarios
        </TabBtn>
      </div>

      <div className="min-h-0 flex-1">
        {panel === 'propiedades' && <DiagramSidebar />}
        {panel === 'versiones' && (
          <VersionHistoryPanel diagramaId={diagramaId} disabled={disabled} />
        )}
        {panel === 'comentarios' && (
          <CommentsPanel diagramaId={diagramaId} disabled={disabled} />
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 px-2 py-2 text-[11px] font-medium transition-colors',
        active
          ? 'border-b-2 border-brand-500 text-brand-300'
          : 'border-b-2 border-transparent text-surface-400 hover:text-surface-200',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default DiagramEditorPage;