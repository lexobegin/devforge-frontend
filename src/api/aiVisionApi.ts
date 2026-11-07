// src/api/aiVisionApi.ts
/**
 * Endpoints del módulo de IA de visión (reconocimiento de bocetos).
 * Corresponde a `app/api/v1/ai_vision_router.py` del backend Ciclo 2.
 *
 * El backend recibe la imagen (multipart/form-data), la procesa con el
 * módulo `app/ai_vision/` (OpenCV + OCR, Tanda 19) y devuelve una
 * estructura de diagrama reconstruida. El cliente debe CONFIRMAR y
 * aplicar los elementos reconstruidos vía los endpoints CRUD del
 * diagrama (diagramasApi): NINGÚN resultado se aplica solo.
 *
 * Validaciones del router:
 * - Extensiones aceptadas: .jpg / .jpeg / .png / .webp
 * - Tamaño máximo: settings.MAX_UPLOAD_SIZE_MB (el request devuelve 400
 *   si se excede o si la imagen viene vacía).
 *
 * La IA de voz/texto va en `iaApi.ts` (Agente Dev).
 */

import { uploadFile } from './httpClient';
import type { DiagramaCompleto, Id } from '@/types';

// ======================================================================
// Tipos locales (VisionReconocimientoResponse de ia_schema.py)
// ======================================================================
export interface VisionReconocimientoResponse {
  exito: boolean;
  /** Confianza global del reconocimiento (0.0-1.0), si se conoce. */
  confianza: number | null;
  /**
   * Estructura reconstruida: clases (con atributos y operaciones),
   * interfaces y relaciones. El schema lo declara como dict[str, Any]
   * con el MISMO FORMATO que DiagramaCompletoResponse; se tipa igual
   * para que el editor lo inserte directo (validar con defensas al
   * renderizar, como cualquier payload externo).
   */
  diagrama_reconstruido: DiagramaCompleto;
  advertencias: string[];
  imagen_procesada_url: string | null;
}

/** Idiomas soportados por el OCR del boceto ('es' por defecto). */
export type IdiomaVision = 'es' | 'en';

// ======================================================================
// API
// ======================================================================
export const aiVisionApi = {
  /**
   * Reconoce un boceto y lo asocia a un diagrama (valida pertenencia al
   * proyecto; ajeno → 404 genérico "Recurso no encontrado").
   * Multipart: campo `imagen` (File) + `idioma` (Form, default 'es').
   */
  reconocerParaDiagrama(
    diagramaId: Id,
    imagen: File,
    idioma: IdiomaVision = 'es'
  ): Promise<VisionReconocimientoResponse> {
    return uploadFile<VisionReconocimientoResponse>(
      `/ai-vision/diagramas/${diagramaId}/reconocer`,
      imagen,
      { idioma },
      'imagen' // el router declara `imagen: UploadFile = File(...)`
    );
  },

  /**
   * Reconoce un boceto sin asociarlo a ningún diagrama.
   * Útil para previsualizar antes de decidir dónde insertarlo.
   */
  reconocerSinPersistir(
    imagen: File,
    idioma: IdiomaVision = 'es'
  ): Promise<VisionReconocimientoResponse> {
    return uploadFile<VisionReconocimientoResponse>(
      '/ai-vision/reconocer',
      imagen,
      { idioma },
      'imagen'
    );
  },
};