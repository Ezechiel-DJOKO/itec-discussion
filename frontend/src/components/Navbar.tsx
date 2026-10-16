'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, Settings, MessageSquare, LogOut, User, ShieldCheck, CheckCheck } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadNotifsCount,
    totalUnreadChats,
    marquerCommeLue,
    marquerToutCommeLue,
  } = useNotifications();

  const [openNotifs, setOpenNotifs] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  // Fermer les menus au clic extérieur (sécurité UX)
  useEffect(() => {
    if (!openNotifs && !openProfile) return;
    const close = () => { setOpenNotifs(false); setOpenProfile(false); };
    // petit délai pour ne pas fermer immédiatement sur le même clic
    const t = setTimeout(() => window.addEventListener('click', close), 0);
    return () => { clearTimeout(t); window.removeEventListener('click', close); };
  }, [openNotifs, openProfile]);

  return (
    <nav className="bg-[#0A2540]/95 backdrop-blur-md border-b border-[#1E4D8C] px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-50">
      
      {/* LOGO ITEC */}
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
        <img src="/logo.jpg" alt="ITEC Logo" className="h-9 w-auto rounded-lg shadow-md object-contain" />
        <span className="text-lg font-bold text-white tracking-wide hidden sm:block">
          ITEC Discuss
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* BOUTON CHAT GLOBAL + PASTILLE ROUGE */}
        <Link 
          href="/dashboard/chat" 
          className="relative flex items-center gap-2 text-xs sm:text-sm font-medium bg-[#1E4D8C]/50 hover:bg-[#1E4D8C] text-white px-3 py-2 rounded-xl transition border border-[#1E4D8C]"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquare size={16} />
          <span className="hidden sm:block">Discussions</span>

          {/* Badge messages non lus */}
          {totalUnreadChats > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-[#0A2540] animate-pulse shadow-lg">
              {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
            </span>
          )}
        </Link>

        {/* BOUTON SUPER ADMIN */}
        {user?.isSuperAdmin && (
          <Link 
            href="/admin" 
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold bg-[#4FC3F7]/15 hover:bg-[#4FC3F7]/25 text-[#4FC3F7] px-3 py-2 rounded-xl transition border border-[#4FC3F7]/30"
            onClick={(e) => e.stopPropagation()}
          >
            <Settings size={16} />
            <span className="hidden sm:block">Admin</span>
          </Link>
        )}

        {/* CLOCHE NOTIFS */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setOpenNotifs(!openNotifs); setOpenProfile(false); }}
            className="relative p-2 text-white/80 hover:text-white hover:bg-[#1E4D8C]/50 rounded-full transition"
          >
            <Bell size={20} />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full border-2 border-[#0A2540] animate-pulse">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* DROPDOWN NOTIFICATIONS */}
          {openNotifs && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-[#0A2540] border border-[#1E4D8C] overflow-hidden shadow-2xl rounded-2xl z-50">
              <div className="flex justify-between items-center p-3 sm:p-4 border-b border-[#1E4D8C] bg-[#0F2D4A]">
                <span className="font-semibold text-white text-sm">Notifications</span>
                {unreadNotifsCount > 0 && (
                  <button
                    onClick={marquerToutCommeLue}
                    className="text-xs text-[#4FC3F7] hover:text-white flex items-center gap-1 transition"
                  >
                    <CheckCheck size={14} /> Tout lire
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[#1E4D8C]/50 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-white/50">
                    Aucune notification
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.lu && marquerCommeLue(n.id)}
                      className={`p-3 text-xs cursor-pointer transition ${
                        n.lu ? 'opacity-50 hover:opacity-80' : 'bg-[#1E4D8C]/25 hover:bg-[#1E4D8C]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-white/90 leading-relaxed ${!n.lu ? 'font-semibold' : ''}`}>
                          {n.message}
                        </p>
                        {!n.lu && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#4FC3F7] mt-1 font-medium">
                        {new Date(n.creeLe).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFIL DROPDOWN MENU */}
        <div className="relative border-l border-[#1E4D8C] pl-3 sm:pl-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setOpenProfile(!openProfile); setOpenNotifs(false); }}
            className="flex items-center gap-2 text-white hover:bg-[#1E4D8C]/50 p-1.5 rounded-xl transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4FC3F7] to-[#1E4D8C] flex items-center justify-center font-black text-white text-xs shadow-md">
              {user?.nom?.charAt(0).toUpperCase()}
            </div>
          </button>

          {openProfile && (
            <div className="absolute right-0 mt-3 w-64 bg-[#0A2540] border border-[#1E4D8C] overflow-hidden shadow-2xl rounded-2xl p-4 z-50 space-y-4">
              <div className="border-b border-[#1E4D8C] pb-3">
                <div className="font-bold text-white text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{user?.nom}</span>
                  {user?.isSuperAdmin && (
                    <span title="Super Admin">
                      <ShieldCheck size={16} className="text-yellow-400 shrink-0" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#4FC3F7] truncate mt-0.5">
                  {user?.email}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2 py-1 rounded w-fit">
                  {user?.isSuperAdmin ? '👑 Super Admin' : '👤 Collaborateur'}
                </div>
              </div>

              <div className="space-y-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setOpenProfile(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-[#1E4D8C]/50 p-2 rounded-lg transition"
                >
                  <User size={16} className="text-[#4FC3F7]" /> Mon Profil
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition text-left"
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