// src/features/diagrama-editor/index.ts
/**
 * Barrel del feature diagrama-editor — cierra el Bloque H (F31–F52).
 *
 * Publica la superficie del editor (página + lienzo + sidebar + IA +
 * historial) para consumidores externos (AppRouter, tests, otras
 * features). Los archivos internos se importan DIRECTAMENTE entre sí
 * (rutas relativas): así este barrel no crea imports circulares.
 */

export { DiagramEditorPage } from './DiagramEditorPage';
export { DiagramCanvas } from './canvas/DiagramCanvas';
export { DiagramSidebar } from './panels/DiagramSidebar';
export { AIPanel } from './ai-assistant/AIPanel';
export { useDiagramHistory } from './hooks/useDiagramHistory';