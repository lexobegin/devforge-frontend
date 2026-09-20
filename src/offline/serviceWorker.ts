// src/offline/serviceWorker.ts
/**
 * Registro del Service Worker (PWA).
 *
 * `vite-plugin-pwa` genera el SW en build. Aquí solo lo registramos
 * (y lo desregistramos en desarrollo para evitar caches stale).
 */

import { registerSW } from 'virtual:pwa-register';

import { env } from '@/config/env';

export function registerServiceWorker(): void {
  // No registrar en desarrollo
  if (!env.features.pwa || env.appEnv === 'development') {
    return;
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Hay una versión nueva; avisamos (el toast se muestra en otra capa)
      if (
        window.confirm(
          'Hay una nueva versión de DevForge AI disponible. ¿Recargar?'
        )
      ) {
        void updateSW(true);
      }
    },
    onOfflineReady() {
      console.info('[PWA] La app está lista para funcionar sin conexión.');
    },
    onRegisteredSW(_swUrl, registration) {
      // Verificar actualizaciones cada 60 minutos
      if (registration) {
        setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000
        );
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Error registrando Service Worker:', error);
    },
  });
}

/** Fuerza la desregistración de todos los SW (útil para depurar). */
export async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
}