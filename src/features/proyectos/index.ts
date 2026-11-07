// src/features/proyectos/index.ts
/**
 * Barrel del feature de proyectos (nace en F35 con ProyectoDetailPage).
 * CrearDiagramaModal queda interno (lo consume ProyectoDetailPage).
 */
export { ProyectosListPage } from './ProyectosListPage';
export { ProyectoDetailPage } from './ProyectoDetailPage';
export { default as ProyectoCard } from './components/ProyectoCard';
export { default as CrearProyectoModal } from './components/CrearProyectoModal';
export { default as MiembrosProyectoModal } from './components/MiembrosProyectoModal';