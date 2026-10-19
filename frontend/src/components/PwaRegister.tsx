'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Mise à jour automatique du Service Worker PWA
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.error('Erreur enregistrement Service Worker:', err);
        });
    }
  }, []);

  return null;
}