'use client';

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';

// On récupère le type de retour exact de notre hook
type NotificationContextType = ReturnType<typeof useGlobalNotifications>;

const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // TOUTE la logique est maintenant encapsulée ici de manière propre
  const notificationState = useGlobalNotifications(user);

  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);