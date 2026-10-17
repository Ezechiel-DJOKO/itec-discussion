'use client';

import React, { createContext, useContext, useState } from 'react';
import { Notification } from '@/types';

interface NotificationContextType {
  notifications: Notification[];
  unreadNotifsCount: number;
  unreadChats: Record<string, number>;
  totalUnreadChats: number;
  marquerCommeLue: (id: string) => Promise<void>;
  marquerToutCommeLue: () => Promise<void>;
  resetChatUnread: (channelId: string) => void;
  refreshNotifications: () => Promise<void>;
  playNotificationSound: () => void;
  getProjectUnread: (projectId: string) => number;
}

const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications] = useState<Notification[]>([]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadNotifsCount: 0,
        unreadChats: {},
        totalUnreadChats: 0,
        marquerCommeLue: async () => {},
        marquerToutCommeLue: async () => {},
        resetChatUnread: () => {},
        refreshNotifications: async () => {},
        playNotificationSound: () => {},
        getProjectUnread: () => 0,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);