'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Notification as SystemNotification, User } from '@/types';

const LAST_READ_KEY = 'itec_last_read';
const UNREAD_KEY = 'itec_unread_chats';

// 👉 HELPER POUR LA CLÉ VAPID (cast correct pour TypeScript)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function previewOf(msg: string): string {
  if (!msg) return 'Nouveau message';
  if (msg.startsWith('[AUDIO]')) return '🎤 Message vocal';
  if (msg.startsWith('[IMAGE]')) return '📷 Image';
  if (msg.startsWith('[FILE]')) return '📎 ' + (msg.split('|')[1] || 'Document');
  if (msg.startsWith('[TRANSFERT]')) return '🔄 Message transféré';
  return msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
}

export function useGlobalNotifications(user: User | null) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadChats, setUnreadChats] = useState<Record<string, number>>({});
  const [hasPushPermission, setHasPushPermission] = useState(false);
  const syncedRef = useRef(false);

  const userId = user?.id || user?.sub || '';

  useEffect(() => {
    setUnreadChats(loadJson<Record<string, number>>(UNREAD_KEY, {}));
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPushPermission(Notification.permission === 'granted');
    }
  }, []);

  const updateUnreadChats = useCallback(
    (updater: (prev: Record<string, number>) => Record<string, number>) => {
      setUnreadChats((prev) => {
        const next = updater(prev);
        saveJson(UNREAD_KEY, next);
        return next;
      });
    },
    []
  );

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  // 🔔 S'ABONNER AUX NOTIFICATIONS PUSH EN ARRIÈRE-PLAN
  const registerWebPushSubscription = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('⚠️ NEXT_PUBLIC_VAPID_PUBLIC_KEY est introuvable dans le .env.local');
        return;
      }

      // Cast explicite pour contourner le conflit de types TypeScript / DOM
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey) as BufferSource;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      await api.post('/notifications/push-subscription', subscription);
      console.log('✅ Abonnement Web Push enregistré avec succès auprès du backend.');
    } catch (err) {
      console.error('Erreur lors de la souscription Web Push:', err);
    }
  };

  const triggerPushNotification = useCallback(async (title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const options = {
      body,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      tag: 'itec-chat',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: window.location.href },
    } as any;

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      }
    } catch (err) {
      console.warn('Erreur Service Worker notification:', err);
    }

    try {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      console.warn('Erreur Desktop notification:', e);
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      setHasPushPermission(true);
      await registerWebPushSubscription();
      return;
    }

    const permission = await Notification.requestPermission();
    setHasPushPermission(permission === 'granted');

    if (permission === 'granted') {
      await registerWebPushSubscription();
    }
  };

  const incrementChatUnread = useCallback(
    (channelId: string) => {
      if (!channelId) return;
      updateUnreadChats((prev) => ({
        ...prev,
        [channelId]: (prev[channelId] || 0) + 1,
      }));
    },
    [updateUnreadChats]
  );

  const resetChatUnread = useCallback(
    (channelId: string) => {
      if (!channelId) return;
      updateUnreadChats((prev) => {
        if (!prev[channelId]) return prev;
        const next = { ...prev };
        delete next[channelId];
        return next;
      });
      const lastRead = loadJson<Record<string, string>>(LAST_READ_KEY, {});
      lastRead[channelId] = new Date().toISOString();
      saveJson(LAST_READ_KEY, lastRead);
    },
    [updateUnreadChats]
  );

  const getProjectUnread = useCallback(
    (projectId: string) => (projectId ? unreadChats[projectId] || 0 : 0),
    [unreadChats]
  );

  // ══════════════════════════════════════════════
  // A) SYNC AU LOGIN
  // ══════════════════════════════════════════════
  useEffect(() => {
    if (!userId) {
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) return;
    syncedRef.current = true;

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      registerWebPushSubscription().catch(() => {});
    }

    const sync = async () => {
      const lastRead = loadJson<Record<string, string>>(LAST_READ_KEY, {});
      const counts: Record<string, number> = {};

      const countSince = (messages: any[], key: string) => {
        const since = lastRead[key] ? new Date(lastRead[key]).getTime() : 0;
        return (messages || []).filter((m) => {
          if (!m?.creeLe) return false;
          if (String(m.userId) === String(userId)) return false;
          return new Date(m.creeLe).getTime() > since;
        }).length;
      };

      try {
        const globalRes = await api.get('/channels/global/messages');
        const g = countSince(globalRes.data, 'global');
        if (g > 0) counts['global'] = g;
      } catch {}

      try {
        const canQG =
          !!user?.isSuperAdmin ||
          (Array.isArray(user?.permissions) &&
            user.permissions.includes('can_access_qg'));
        if (canQG) {
          const qgRes = await api.get('/channels/responsables/messages');
          const q = countSince(qgRes.data, 'responsables');
          if (q > 0) counts['responsables'] = q;
        }
      } catch {}

      try {
        const projectsRes = await api.get('/projects');
        const projects = (projectsRes.data || []).filter(
          (p: any) => p.statut !== 'archive'
        );

        await Promise.all(
          projects.slice(0, 30).map(async (p: any) => {
            try {
              const res = await api.get(`/projects/${p.id}/messages`);
              const c = countSince(res.data, p.id);
              if (c > 0) counts[p.id] = c;
            } catch {}
          })
        );
      } catch {}

      setUnreadChats((prev) => {
        const merged = { ...prev };
        Object.entries(counts).forEach(([k, v]) => {
          merged[k] = Math.max(merged[k] || 0, v);
        });
        saveJson(UNREAD_KEY, merged);
        return merged;
      });
    };

    sync();
  }, [userId, user]);

  // ══════════════════════════════════════════════
  // B) LIVE SOCKET
  // ══════════════════════════════════════════════
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket(String(userId));

    const handleIncoming = (data: any) => {
      if (!data) return;

      const senderId = data.senderId || data.userId || data.user?.id;
      const targetId =
        data.projectId || data.project?.id || data.channelId || data.channel;

      if (!targetId) return;
      if (senderId && String(senderId) === String(userId)) return;

      if (String(targetId) === 'responsables') {
        const role = (user?.role || '').toUpperCase();
        const canQG =
          !!user?.isSuperAdmin ||
          role === 'ADMIN' ||
          role === 'SUPER_ADMIN' ||
          (Array.isArray(user?.permissions) &&
            user.permissions.includes('can_access_qg'));
        if (!canQG) return;
      }

      const openId =
        typeof window !== 'undefined'
          ? (window as any).__setOpenProjectChatId
          : null;

      if (openId && String(openId) === String(targetId)) {
        const lastRead = loadJson<Record<string, string>>(LAST_READ_KEY, {});
        lastRead[String(targetId)] = new Date().toISOString();
        saveJson(LAST_READ_KEY, lastRead);
        return;
      }

      incrementChatUnread(String(targetId));
      playNotificationSound();

      const who = data.user?.nom || 'ITEC Discuss';
      const body = previewOf(data.message || '');
      triggerPushNotification(`💬 ${who}`, body);
    };

    socket.on('receive_message', handleIncoming);
    socket.on('global_new_message', handleIncoming);

    socket.onAny((event, data) => {
      if (
        typeof event === 'string' &&
        (event.endsWith('_message') || event === 'receive_message') &&
        !event.includes('_update') &&
        !event.includes('typing')
      ) {
        if (event.startsWith('project_') || event.startsWith('channel_')) {
          handleIncoming({
            ...data,
            projectId: event.startsWith('project_')
              ? event.replace('project_', '').replace('_message', '')
              : undefined,
            channelId: event.startsWith('channel_')
              ? event.replace('channel_', '').replace('_message', '')
              : undefined,
          });
        }
      }
    });

    return () => {
      socket.off('receive_message', handleIncoming);
      socket.off('global_new_message', handleIncoming);
      socket.offAny();
    };
  }, [
    userId,
    user,
    incrementChatUnread,
    playNotificationSound,
    triggerPushNotification,
  ]);

  // ── Notifications système REST ──
  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get('/notifications');
      if (Array.isArray(res.data)) setNotifications(res.data);
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId, refreshNotifications]);

  const marquerCommeLue = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      );
    } catch {}
  };

  const marquerToutCommeLue = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    } catch {}
  };

  const unreadNotifsCount = notifications.filter((n) => !n.lu).length;
  const totalUnreadChats = Object.values(unreadChats).reduce(
    (s, c) => s + (c || 0),
    0
  );

  return {
    notifications,
    unreadNotifsCount,
    unreadChats,
    totalUnreadChats,
    hasPushPermission,
    marquerCommeLue,
    marquerToutCommeLue,
    resetChatUnread,
    incrementChatUnread,
    refreshNotifications,
    playNotificationSound,
    getProjectUnread,
    requestPushPermission,
  };
}