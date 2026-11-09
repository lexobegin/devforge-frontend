// src/features/diagrama-editor/canvas/autoLayout.ts
/**
 * Layout automático del diagrama (F55) — elkjs sobre el store.
 *
 * Ordena las clases con el algoritmo en CAPAS de ELK (layered), de
 * arriba hacia abajo (como Enterprise Architect dibuja jerarquías) y
 * enrutado ORTHOGONAL de aristas — el mismo estilo de codos que usa
 * RelationshipEdge desde esta tanda. Es 100% client-side: no toca el
 * backend (las posiciones se persisten después con el CRUD normal).
 *
 * Tamaños estimados de ClassNode (misma tanda): el nodo real es
 * min-w-[200px] max-w-[280px] y su altura depende de atributos y
 * operaciones (filas de leading-5 = 20px). ELK necesita un alto para
 * repartir los nodos: se estima con la MISMA fórmula del CSS para que
 * el resultado del layout no pise nodos.
 *
 * CONTRATO CICLO 2: los ids son uuid str (Id = string) y las posiciones
 * se cuantizan a 2 decimales igual que PosicionLienzo del backend.
 */

import ELK from 'elkjs/lib/elk.bundled.js';

import type { ClaseUML, Id, RelacionUML } from '@/types';

// ======================================================================
// Estimación de tamaño de nodo (debe calzar con ClassNode.tsx)
// ======================================================================
/** Ancho de trabajo: entre el min-w (200) y el max-w (280) del nodo. */
const ANCHO_NODO = 220;

/** Alto de la cabecera (estereotipo + nombre + py-2 + border-b). */
const ALTO_CABECERA = 52;
/** Alto extra del estereotipo («…» en text-[10px]). */
const ALTO_ESTEREOTIPO = 14;
/** Alto de cada fila (leading-5 = 20px). */
const ALTO_FILA = 20;
/** Padding vertical de una sección (py-1.5 = 12px) + su border-b. */
const PAD_SECCION = 13;

export function estimarAltoClase(clase: ClaseUML): number {
  const cabecera = ALTO_CABECERA + (clase.estereotipo ? ALTO_ESTEREOTIPO : 0);
  const atributos = clase.atributos.length
    ? PAD_SECCION + clase.atributos.length * ALTO_FILA
    : 0;
  const operaciones = clase.operaciones.length
    ? PAD_SECCION + clase.operaciones.length * ALTO_FILA
    : 0;
  // +4 = border-2 de arriba y abajo del nodo.
  return Math.max(80, cabecera + atributos + operaciones + 4);
}

// ======================================================================
// Layout
// ======================================================================
export interface PosicionAuto {
  x: number;
  y: number;
}

/**
 * Calcula las nuevas posiciones de todas las clases. Devuelve un Map
 * id → {x, y} (esquina superior izquierda, misma convención de React
 * Flow). NO toca el store: aplicarlo y persistirlo es del llamador.
 */
export async function calcularLayout(
  clases: ClaseUML[],
  relaciones: RelacionUML[]
): Promise<Map<Id, PosicionAuto>> {
  const elk = new ELK();

  const idsDeClases = new Set(clases.map((c) => c.id));

  const grafo = {
    id: 'raiz',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '70',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: clases.map((c) => ({
      id: c.id,
      width: ANCHO_NODO,
      height: estimarAltoClase(c),
    })),
    // Solo relaciones con ambos extremos presentes (defensivo: una
    // relación huérfana haría fallar el layout entero).
    edges: relaciones
      .filter(
        (r) =>
          idsDeClases.has(r.id_clase_origen) &&
          idsDeClases.has(r.id_clase_destino)
      )
      .map((r) => ({
        id: r.id,
        sources: [r.id_clase_origen],
        targets: [r.id_clase_destino],
      })),
  };

  const resultado = await elk.layout(grafo);

  const posiciones = new Map<Id, PosicionAuto>();
  for (const hijo of resultado.children ?? []) {
    if (hijo.x === undefined || hijo.y === undefined) continue;
    posiciones.set(hijo.id, {
      // Cuantización a 2 decimales == PosicionLienzo del backend.
      x: Math.round(hijo.x * 100) / 100,
      y: Math.round(hijo.y * 100) / 100,
    });
  }
  return posiciones;
}
