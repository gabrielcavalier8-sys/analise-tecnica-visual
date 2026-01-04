'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registrado com sucesso:', registration);
          })
          .catch((error) => {
            console.log('Falha ao registrar Service Worker:', error);
          });
      });
    }
  }, []);

  return null;
}
