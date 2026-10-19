'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, Settings, MessageSquare, LogOut, User, ShieldCheck, BellRing, BellCheck } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadNotifsCount,
    totalUnreadChats,
    hasPushPermission,
    marquerToutCommeLue,
    requestPushPermission,
  } = useNotifications();

  const [openNotifs, setOpenNotifs] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const safeUser = user as any;
  const userRole = (safeUser?.role || '').toUpperCase();
  const isAdmin = safeUser?.isSuperAdmin || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // 🔔 GESTIONNAIRE D'ACTIVATION DES NOTIFICATIONS PUSH (MOBILE & DESKTOP)
  const handlePushClick = async () => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      alert("Votre navigateur ou appareil ne supporte pas les notifications Push web.");
      return;
    }

    if (Notification.permission === 'denied') {
      alert("Les notifications sont bloquées dans les paramètres de votre navigateur. Veuillez autoriser les notifications pour ce site dans les paramètres de votre téléphone/navigateur.");
      return;
    }

    try {
      // 📱 Sur mobile Android/iOS, on s'assure que le Service Worker est actif
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js').catch(() => {});
      }

      await requestPushPermission();

      if (Notification.permission === 'granted') {
        alert("🔔 Notifications actives ! Vous recevrez des alertes pour chaque nouveau message.");
      }
    } catch (e) {
      console.error("Erreur lors de la demande de permission:", e);
    }
  };

  return (
    <nav className="bg-[#0A2540] border-b border-slate-700/60 px-3 sm:px-6 py-2.5 flex justify-between items-center sticky top-0 z-50 shadow-md">
      
      {/* LOGO ITEC */}
      <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition shrink-0">
        <img src="/logo.jpg" alt="ITEC Logo" className="h-8 sm:h-9 w-auto rounded-lg shadow-md object-contain" />
        <span className="text-base sm:text-lg font-bold text-[#4FC3F7] tracking-wide hidden sm:block">
          ITEC Discuss
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* BOUTON ACTIVATION NOTIFICATIONS PUSH */}
        <button
          onClick={handlePushClick}
          className={`p-2 rounded-xl transition ${
            hasPushPermission 
              ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={hasPushPermission ? 'Notifications Push activées' : 'Activer les notifications sur cet appareil'}
        >
          {hasPushPermission ? <BellCheck size={18} /> : <BellRing size={18} className="text-[#4FC3F7]" />}
        </button>

        {/* 🔴 BOUTON DISCUSSIONS AVEC PASTILLE SUR MOBILE ET DESKTOP */}
        <Link 
          href="/dashboard/chat" 
          className="relative flex items-center gap-2 text-xs sm:text-sm font-medium bg-slate-800/80 hover:bg-slate-700 text-white p-2 sm:px-3 sm:py-2 rounded-xl transition border border-slate-700/50 overflow-visible"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare size={20} className="text-[#4FC3F7]" />
            {totalUnreadChats > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-extrabold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full border border-[#0A2540] animate-bounce shadow-lg z-20">
                {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
              </span>
            )}
          </div>
          <span className="hidden sm:block font-semibold">Discussions</span>
        </Link>

        {/* BOUTON ADMIN */}
        {isAdmin && (
          <Link 
            href="/admin" 
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-[#4FC3F7]/10 hover:bg-[#4FC3F7]/20 text-[#4FC3F7] p-2 sm:px-3 sm:py-2 rounded-xl transition border border-[#4FC3F7]/30"
          >
            <Settings size={16} />
            <span className="hidden sm:block">Admin</span>
          </Link>
        )}

        {/* CLOCHE NOTIFS SYSTÈME */}
        <div className="relative">
          <button
            onClick={() => { setOpenNotifs(!openNotifs); setOpenProfile(false); }}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full border-2 border-[#0A2540]">
                {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* DROPDOWN NOTIFICATIONS */}
          {openNotifs && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-[#0A2540] border border-slate-700 overflow-hidden shadow-2xl rounded-2xl z-50">
              <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-700/80 bg-[#0F2D4A]">
                <span className="font-semibold text-white text-sm">Notifications</span>
                {unreadNotifsCount > 0 && (
                  <button
                    onClick={marquerToutCommeLue}
                    className="text-xs text-[#4FC3F7] hover:underline font-medium"
                  >
                    Tout lire
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 bg-[#081B2E]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucune notification
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition ${n.lu ? 'opacity-60 bg-transparent' : 'bg-slate-800/40'}`}
                    >
                      <p className="text-slate-200 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-[#4FC3F7] mt-1 font-medium">
                        {n.creeLe ? new Date(n.creeLe).toLocaleString('fr-FR') : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFIL MENU */}
        <div className="relative border-l border-slate-700 pl-2 sm:pl-4">
          <button
            onClick={() => { setOpenProfile(!openProfile); setOpenNotifs(false); }}
            className="flex items-center gap-2 text-white hover:bg-slate-800 p-1 rounded-xl transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4FC3F7] to-blue-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-md">
              {(user?.nom || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </button>

          {/* DROPDOWN PROFIL */}
          {openProfile && (
            <div className="absolute right-0 mt-3 w-64 bg-[#0A2540] border border-slate-700 overflow-hidden shadow-2xl rounded-2xl p-4 z-50 space-y-4">
              <div className="border-b border-slate-700/80 pb-3">
                <div className="font-bold text-white text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{user?.nom || 'Utilisateur'}</span>
                  {user?.isSuperAdmin && (
                    <span title="Super Admin">
                      <ShieldCheck size={16} className="text-yellow-400 shrink-0" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#4FC3F7] truncate mt-0.5 font-mono">
                  {user?.email}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800 px-2 py-1 rounded w-fit border border-slate-700">
                  {user?.isSuperAdmin ? '👑 Super Admin' : userRole || '👤 Collaborateur'}
                </div>
              </div>

              <div className="space-y-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setOpenProfile(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition"
                >
                  <User size={16} className="text-[#4FC3F7]" /> Mon Profil
                </Link>
                <button
                  onClick={() => { setOpenProfile(false); logout(); }}
                  className="w-full flex items-center gap-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition text-left"
                >
                  <LogOut size={16} />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}