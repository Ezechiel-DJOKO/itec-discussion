'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Notification as AppNotification } from '@/types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadNotifsCount: number;
  unreadChats: Record<string, number>; // 'global' | 'responsables' | projectId
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
  const { user } = useAuth();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadChats, setUnreadChats] = useState<Record<string, number>>({
    global: 0,
    responsables: 0,
  });

  // Projets ouverts en chat (pour ne pas notifier si le tiroir est ouvert)
  const openProjectChatRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notif.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  const triggerSystemPush = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body.slice(0, 120),
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          tag: 'itec-discuss',
        });
      } catch {}
    }
    playNotificationSound();
  }, [playNotificationSound]);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, refreshNotifications]);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    const previewOf = (msg: string) => {
      if (!msg) return 'Nouveau message';
      if (msg.startsWith('[AUDIO]')) return '🎤 Message vocal';
      if (msg.startsWith('[IMAGE]')) return '📷 Image';
      if (msg.startsWith('[FILE]')) return '📎 Document';
      if (msg.startsWith('[TRANSFERT]')) return '🔄 Message transféré';
      return msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
    };

    // --- Channels globaux ---
    const handleChannelMessage = (channel: 'global' | 'responsables') => (msg: any) => {
      if (msg.userId === user.id) return;
      const isOnChatPage = pathnameRef.current?.startsWith('/dashboard/chat');
      if (isOnChatPage) return;

      setUnreadChats((prev) => ({ ...prev, [channel]: (prev[channel] || 0) + 1 }));

      const channelLabel = channel === 'global' ? 'Général' : 'QG Responsables';
      const author = msg.user?.nom || 'Quelqu\'un';
      triggerSystemPush(`${channelLabel} — ITEC Discuss`, `${author}: ${previewOf(msg.message)}`);

      const notifEntry = {
        id: `chat-${msg.id}-${Date.now()}`,
        message: `${author} dans #${channelLabel}: ${previewOf(msg.message)}`,
        lu: false,
        creeLe: new Date().toISOString(),
      } as AppNotification;
      setNotifications((prev) => [notifEntry, ...prev].slice(0, 50));
    };

    const onGlobal = handleChannelMessage('global');
    const onResponsables = handleChannelMessage('responsables');

    // --- Messages projet (événement générique) ---
    const onProjectMessage = (payload: any) => {
      // payload attendu: { projectId, message: ChatMessage, projectName? }
      const msg = payload?.message || payload;
      const projectId = payload?.projectId || msg?.projectId;
      if (!projectId || msg.userId === user.id) return;

      // Si le tiroir chat de CE projet est ouvert → pas de notif
      if (openProjectChatRef.current === projectId) return;

      setUnreadChats((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || 0) + 1,
      }));

      const author = msg.user?.nom || 'Quelqu\'un';
      const projectName = payload?.projectName || 'Projet';
      triggerSystemPush(
        `📁 ${projectName}`,
        `${author}: ${previewOf(msg.message)}`
      );

      const notifEntry = {
        id: `proj-${msg.id}-${Date.now()}`,
        message: `${author} dans ${projectName}: ${previewOf(msg.message)}`,
        lu: false,
        creeLe: new Date().toISOString(),
      } as AppNotification;
      setNotifications((prev) => [notifEntry, ...prev].slice(0, 50));
    };

    // Écoute aussi le pattern project_XXX_message (si le backend émet par room)
    const onAnyProjectSocket = (event: string, ...args: any[]) => {
      const match = event.match(/^project_(.+)_message$/);
      if (!match) return;
      const projectId = match[1];
      if (event.includes('_update') || event.includes('_typing')) return;
      onProjectMessage({ projectId, message: args[0] });
    };

    const onSystemNotif = (notif: any) => {
  // Ignore si la notif est clairement pour un autre user
  if (notif.targetUserId && notif.targetUserId !== user.id) return;
  if (notif.userId && notif.userId !== user.id && notif.targetUserId) return;

  setNotifications((prev) => {
    if (prev.some((n) => n.id === notif.id)) return prev;
    return [notif, ...prev];
  });
  triggerSystemPush('ITEC Discuss', notif.message || 'Nouvelle notification');
};

    socket.on('channel_global_message', onGlobal);
    socket.on('channel_responsables_message', onResponsables);
    socket.on('project_message', onProjectMessage); // événement global optionnel
    socket.on('new_notification', onSystemNotif);

    // Catch-all pour project_{id}_message
    socket.onAny(onAnyProjectSocket);

    return () => {
      socket.off('channel_global_message', onGlobal);
      socket.off('channel_responsables_message', onResponsables);
      socket.off('project_message', onProjectMessage);
      socket.off('new_notification', onSystemNotif);
      socket.offAny(onAnyProjectSocket);
    };
  }, [user, triggerSystemPush]);

  const marquerCommeLue = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    try { await api.patch(`/notifications/${id}/read`); } catch {}
  };

  const marquerToutCommeLue = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    try { await api.patch('/notifications/read-all'); } catch {}
  };

  const resetChatUnread = useCallback((channelId: string) => {
    setUnreadChats((prev) => ({ ...prev, [channelId]: 0 }));
  }, []);

  const getProjectUnread = useCallback(
    (projectId: string) => unreadChats[projectId] || 0,
    [unreadChats]
  );

  // Expose setter pour ProjectChat (ouvert / fermé)
  useEffect(() => {
    (window as any).__setOpenProjectChat = (id: string | null) => {
      openProjectChatRef.current = id;
      if (id) resetChatUnread(id);
    };
    return () => { delete (window as any).__setOpenProjectChat; };
  }, [resetChatUnread]);

  const unreadNotifsCount = notifications.filter((n) => !n.lu).length;
  const totalUnreadChats = Object.values(unreadChats).reduce((a, b) => a + b, 0);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadNotifsCount,
        unreadChats,
        totalUnreadChats,
        marquerCommeLue,
        marquerToutCommeLue,
        resetChatUnread,
        refreshNotifications,
        playNotificationSound,
        getProjectUnread,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);