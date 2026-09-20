// src/api/aiVisionApi.ts
/**
 * Endpoints del módulo de IA de visión (reconocimiento de bocetos).
 * Corresponde a `app/api/v1/ai_vision_router.py` del backend.
 *
 * El módulo procesa la imagen con OpenCV + OCR y devuelve una estructura
 * de diagrama reconstruida lista para insertar en el editor.
 */

import { httpClient } from './httpClient';

// ======================================================================
// Tipos locales
// ======================================================================
export interface VisionReconocimientoResponse {
  exito: boolean;
  confianza: number | null;
  diagrama_reconstruido: {
    clases: Array<Record<string, unknown>>;
    relaciones: Array<Record<string, unknown>>;
  };
  advertencias: string[];
  imagen_procesada_url: string | null;
}

// ======================================================================
// API
// ======================================================================
export const aiVisionApi = {
  /**
   * Reconoce un boceto y lo asocia a un diagrama (valida permisos).
   * El resultado NO se aplica automáticamente al diagrama: el cliente
   * debe confirmar y aplicar los elementos reconstruidos.
   */
  reconocerParaDiagrama(
    diagramaId: number,
    imagen: File,
    idioma = 'es'
  ): Promise<VisionReconocimientoResponse> {
    const formData = new FormData();
    formData.append('imagen', imagen);
    formData.append('idioma', idioma);

    return httpClient
      .post<VisionReconocimientoResponse>(
        `/ai-vision/diagramas/${diagramaId}/reconocer`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then((r) => r.data);
  },

  /**
   * Reconoce un boceto sin asociarlo a ningún diagrama.
   * Útil para previsualizar antes de decidir dónde insertarlo.
   */
  reconocerSinPersistir(
    imagen: File,
    idioma = 'es'
  ): Promise<VisionReconocimientoResponse> {
    const formData = new FormData();
    formData.append('imagen', imagen);
    formData.append('idioma', idioma);

    return httpClient
      .post<VisionReconocimientoResponse>(
        `/ai-vision/reconocer`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then((r) => r.data);
  },
};