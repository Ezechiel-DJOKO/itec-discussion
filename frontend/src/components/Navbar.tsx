'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Notification } from '@/types';
import { Bell, Settings, MessageSquare, LogOut, User, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [openNotifs, setOpenNotifs] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifs(res.data);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const nonLues = notifs.filter((n) => !n.lu).length;

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifs(notifs.map((n) => ({ ...n, lu: true })));
    } catch {}
  };

  return (
    <nav className="glass-card rounded-none border-t-0 border-x-0 border-b border-white/10 px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-50">
      
      {/* LOGO ITEC */}
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
        <img src="/logo-itec.jpg" alt="ITEC Logo" className="h-9 w-auto rounded-lg shadow-md object-contain" />
        <span className="text-lg font-bold text-white tracking-wide hidden sm:block">
          ITEC Discuss
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* BOUTON CHAT GLOBAL */}
        <Link 
          href="/dashboard/chat" 
          className="flex items-center gap-2 text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl transition"
        >
          <MessageSquare size={16} />
          <span className="hidden sm:block">Discussions</span>
        </Link>

        {/* BOUTON SUPER ADMIN */}
        {user?.isSuperAdmin && (
          <Link 
            href="/admin" 
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold bg-itec-sky/20 hover:bg-itec-sky/30 text-itec-sky px-3 py-2 rounded-xl transition border border-itec-sky/30"
          >
            <Settings size={16} />
            <span className="hidden sm:block">Admin</span>
          </Link>
        )}

        {/* CLOCHE NOTIFS */}
        <div className="relative">
          <button
            onClick={() => { setOpenNotifs(!openNotifs); setOpenProfile(false); }}
            className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <Bell size={20} />
            {nonLues > 0 && (
              <span className="absolute top-0 right-0 bg-itec-red text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-itec-dark">
                {nonLues}
              </span>
            )}
          </button>

          {openNotifs && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 glass-card border border-white/20 overflow-hidden shadow-2xl bg-[#0A2540]/95 z-50">
              <div className="flex justify-between items-center p-3 sm:p-4 border-b border-white/10 bg-black/20">
                <span className="font-semibold text-white text-sm">Notifications</span>
                {nonLues > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-itec-sky hover:underline">
                    Tout lire
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
                {notifs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/50">Aucune notification</div>
                ) : (
                  notifs.map((n) => (
                    <div key={n.id} className={`p-3 text-xs ${n.lu ? 'opacity-50' : 'bg-white/5'}`}>
                      <p className="text-white/90 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-itec-sky mt-1 font-medium">
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
        <div className="relative border-l border-white/20 pl-3 sm:pl-4">
          <button
            onClick={() => { setOpenProfile(!openProfile); setOpenNotifs(false); }}
            className="flex items-center gap-2 text-white hover:bg-white/10 p-1.5 rounded-xl transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-itec-sky to-blue-600 flex items-center justify-center font-black text-white text-xs shadow-md">
              {user?.nom?.charAt(0).toUpperCase()}
            </div>
          </button>

          {openProfile && (
            <div className="absolute right-0 mt-3 w-64 glass-card border border-white/20 overflow-hidden shadow-2xl bg-[#0A2540]/95 p-4 z-50 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <div className="font-bold text-white text-sm flex items-center justify-between">
                  {user?.nom}
{user?.isSuperAdmin && (
  <span title="Super Admin">
    <ShieldCheck size={16} className="text-yellow-400" />
  </span>
)}                </div>
                <div className="text-xs text-itec-sky truncate mt-0.5">{user?.email}</div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2 py-1 rounded w-fit">
                  {user?.isSuperAdmin ? '👑 Super Admin' : '👤 Collaborateur'}
                </div>
              </div>

              <div className="space-y-1">
                <Link
                  href="/dashboard"
                  onClick={() => setOpenProfile(false)}
                  className="flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
                >
                  <CheckCircle2 size={16} className="text-itec-sky" /> Mon Tableau de bord
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition text-left"
                >
                  <LogOut size={16} /> Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}