// src/main.tsx
/**
 * Punto de entrada de la app.
 *
 * - Monta React sobre #root.
 * - Envuelve la app en BrowserRouter.
 * - Registra el Service Worker (PWA) si está habilitado.
 * - Importa los estilos globales.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { env } from './config/env';
import './index.css';

// ----------------------------------------------------------------------
// Montaje de React
// ----------------------------------------------------------------------
const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// ----------------------------------------------------------------------
// Service Worker (PWA) — solo si está habilitado en env y en prod/dev según config
// ----------------------------------------------------------------------
if (env.features.pwa) {
  // Import dinámico para no cargarlo si está deshabilitado.
  import('./offline/serviceWorker')
    .then(({ registerServiceWorker }) => {
      registerServiceWorker();
    })
    .catch(() => {
      // Silencioso: si el módulo no existe todavía, no rompemos la app.
    });
}