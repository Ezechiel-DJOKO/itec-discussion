'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Notification } from '@/types';
// Nouvelles icônes pros
import { Bell, Settings, MessageSquare, LogOut, UserCircle } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

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
    <nav className="glass-card rounded-none border-t-0 border-x-0 border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      
      {/* LOGO ITEC */}
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
        <img src="/logo-itec.jpg" alt="ITEC Logo" className="h-10 w-auto rounded-lg shadow-md" />
        <span className="text-xl font-bold text-white tracking-wide hidden sm:block">
          ITEC Discuss
        </span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-6">
        
        {/* BOUTON CHAT GLOBAL */}
        <Link 
          href="/dashboard/chat" 
          className="flex items-center gap-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition"
        >
          <MessageSquare size={18} />
          <span className="hidden sm:block">Discussions</span>
        </Link>

        {/* BOUTON SUPER ADMIN */}
        {user?.isSuperAdmin && (
          <Link 
            href="/admin" 
            className="flex items-center gap-2 text-sm font-semibold bg-itec-sky/20 hover:bg-itec-sky/30 text-itec-sky px-4 py-2 rounded-xl transition border border-itec-sky/30"
          >
            <Settings size={18} />
            <span className="hidden sm:block">Admin</span>
          </Link>
        )}

        {/* CLOCHE NOTIFS */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <Bell size={22} />
            {nonLues > 0 && (
              <span className="absolute top-0 right-0 bg-itec-red text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-itec-dark">
                {nonLues}
              </span>
            )}
          </button>

          {/* DROPDOWN NOTIFS */}
          {open && (
            <div className="absolute right-0 mt-3 w-80 glass-card border border-white/20 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                <span className="font-semibold text-white">Notifications</span>
                {nonLues > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-itec-sky hover:underline">
                    Tout marquer comme lu
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-white/50">Aucune notification</div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {notifs.map((n) => (
                      <div key={n.id} className={`p-4 text-sm ${n.lu ? 'opacity-50' : 'bg-white/5'}`}>
                        <p className="text-white/90 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-itec-sky mt-2 font-medium">
                          {new Date(n.creeLe).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFIL & DECONNEXION */}
        <div className="flex items-center gap-4 border-l border-white/20 pl-4 sm:pl-6">
          <div className="flex items-center gap-2">
            <UserCircle size={24} className="text-white/70" />
            <span className="text-white font-medium text-sm hidden sm:block">{user?.nom}</span>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center justify-center p-2 text-white/70 hover:text-itec-red hover:bg-white/10 rounded-xl transition"
            title="Déconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}