'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import {
  Bell,
  MessageSquare,
  LogOut,
  User as UserIcon,
  Check,
  CheckCheck,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const {
    notifications,
    unreadNotifsCount,
    totalUnreadChats,
    hasPushPermission,
    requestPushPermission,
    marquerCommeLue,
    marquerToutCommeLue,
  } = useNotifications();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Ferme les menus quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔔 CLIC SUR LA CLOCHE : Demande la permission PWA (sur clic utilisateur) + Ouvre le menu
  const handleBellClick = async () => {
    if (!hasPushPermission) {
      await requestPushPermission();
    }
    setShowNotifMenu((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isSuperAdmin = !!user?.isSuperAdmin;
  const isResponsable =
    isSuperAdmin ||
    (Array.isArray(user?.permissions) &&
      user.permissions.includes('can_access_qg'));

  return (
    <header className="sticky top-0 z-50 bg-[#07192f] border-b border-[#1E4D8C] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E4D8C] to-[#4FC3F7] p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0A2540] rounded-[10px] flex items-center justify-center font-black text-[#4FC3F7] text-lg">
              ITEC
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-wide text-white group-hover:text-[#4FC3F7] transition-colors">
              ITEC Discuss
            </span>
            <span className="text-[10px] text-gray-400 -mt-1 font-medium">
              Espace Collaboratif
            </span>
          </div>
        </Link>

        {/* NAVIGATION DESKTOP */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/dashboard"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              pathname === '/dashboard'
                ? 'bg-[#1E4D8C] text-[#4FC3F7] border border-[#4FC3F7]/30'
                : 'text-gray-300 hover:bg-[#1E4D8C]/40 hover:text-white'
            }`}
          >
            Espaces de Travail
          </Link>

          <Link
            href="/dashboard/chat"
            className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              pathname === '/dashboard/chat'
                ? 'bg-[#1E4D8C] text-[#4FC3F7] border border-[#4FC3F7]/30'
                : 'text-gray-300 hover:bg-[#1E4D8C]/40 hover:text-white'
            }`}
          >
            <MessageSquare size={16} />
            <span>Discussion Globale</span>
            {totalUnreadChats > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
              </span>
            )}
          </Link>
        </nav>

        {/* ACTIONS DROITE */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* 🔔 CLOCHE DE NOTIFICATION INTERACTIVE */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleBellClick}
              className={`relative p-2.5 rounded-xl border transition-all duration-200 ${
                showNotifMenu
                  ? 'bg-[#1E4D8C] border-[#4FC3F7] text-[#4FC3F7]'
                  : 'bg-[#0A2540] border-[#1E4D8C] text-gray-300 hover:text-white hover:border-[#4FC3F7]/50'
              }`}
              title={
                hasPushPermission
                  ? 'Notifications actives'
                  : 'Activer les notifications PWA'
              }
            >
              <Bell size={18} />

              {/* Pastille de comptage non lus */}
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-[#07192f] animate-bounce">
                  {unreadNotifsCount}
                </span>
              )}

              {/* Indicateur statut Push (Vert = Activé, Orange = Inactif) */}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#07192f] ${
                  hasPushPermission ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </button>

            {/* MENU DÉROULANT NOTIFICATIONS */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0A2540] border border-[#1E4D8C] rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 bg-[#07192f] border-b border-[#1E4D8C] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-[#4FC3F7]" />
                    <span className="font-bold text-sm text-white">Notifications</span>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={marquerToutCommeLue}
                      className="text-[11px] text-[#4FC3F7] hover:underline font-semibold flex items-center gap-1"
                    >
                      <CheckCheck size={14} /> Tout marquer comme lu
                    </button>
                  )}
                </div>

                {/* BANNIÈRE PROMPT PWA SI NON AUTORISÉ */}
                {!hasPushPermission && (
                  <div
                    onClick={requestPushPermission}
                    className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 cursor-pointer hover:bg-amber-500/20 transition"
                  >
                    <Sparkles size={16} className="shrink-0 text-amber-400" />
                    <span>Cliquez ici pour activer les alertes pop-up sur mobile !</span>
                  </div>
                )}

                <div className="max-h-80 overflow-y-auto divide-y divide-[#1E4D8C]/50 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">
                      Aucune notification pour le moment.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const titre = (n as any).titre;
                      return (
                        <div
                          key={n.id}
                          onClick={() => marquerCommeLue(n.id)}
                          className={`p-3 text-xs transition cursor-pointer flex items-start gap-2.5 ${
                            !n.lu ? 'bg-[#1E4D8C]/30 hover:bg-[#1E4D8C]/50' : 'hover:bg-white/5 opacity-70'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              !n.lu ? 'bg-[#4FC3F7]' : 'bg-transparent'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium break-words">
                              {titre || n.message}
                            </p>
                            {n.message && titre && (
                              <p className="text-gray-300 text-[11px] mt-0.5 truncate">
                                {n.message}
                              </p>
                            )}
                            <span className="text-[9px] text-gray-400 mt-1 block">
                              {new Date(n.creeLe).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {!n.lu && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                marquerCommeLue(n.id);
                              }}
                              className="text-gray-400 hover:text-[#4FC3F7] p-1"
                              title="Marquer comme lu"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MENU UTILISATEUR */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-[#0A2540] border border-[#1E4D8C] hover:border-[#4FC3F7]/50 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1E4D8C] text-[#4FC3F7] font-bold flex items-center justify-center text-sm border border-[#4FC3F7]/30">
                {user?.nom ? user.nom.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                  {user?.nom}
                  {isResponsable && <ShieldCheck size={12} className="text-[#4FC3F7]" />}
                </div>
                <div className="text-[10px] text-gray-400 leading-none mt-0.5">
                  {user?.role || 'Utilisateur'}
                </div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0A2540] border border-[#1E4D8C] rounded-2xl shadow-2xl p-1.5 z-50">
                <div className="px-3 py-2 border-b border-[#1E4D8C] mb-1">
                  <p className="text-xs font-bold text-white">{user?.nom}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition font-semibold"
                >
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BOUTON MENU MOBILE */}
        <div className="flex md:hidden items-center gap-2">
          {/* Cloche rapide mobile */}
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-xl bg-[#0A2540] border border-[#1E4D8C] text-gray-300"
          >
            <Bell size={18} />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl bg-[#0A2540] border border-[#1E4D8C] text-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE DÉROULANT */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07192f] border-b border-[#1E4D8C] px-4 pt-2 pb-4 space-y-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-sm font-semibold ${
              pathname === '/dashboard' ? 'bg-[#1E4D8C] text-[#4FC3F7]' : 'text-gray-300'
            }`}
          >
            Espaces de Travail
          </Link>

          <Link
            href="/dashboard/chat"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold ${
              pathname === '/dashboard/chat' ? 'bg-[#1E4D8C] text-[#4FC3F7]' : 'text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={18} /> Discussion Globale
            </div>
            {totalUnreadChats > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnreadChats}
              </span>
            )}
          </Link>

          <div className="pt-2 border-t border-[#1E4D8C] flex items-center justify-between px-2">
            <div className="text-xs font-bold text-white">{user?.nom}</div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 font-bold flex items-center gap-1"
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
}