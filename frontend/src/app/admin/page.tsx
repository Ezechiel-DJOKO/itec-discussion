'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { ShieldAlert, Trash2, Power, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ManagedUser {
  id: string;
  nom: string;
  email: string;
  actif: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  creeLe: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user?.isSuperAdmin) {
        router.push('/dashboard');
        return;
      }
      api.get('/admin/users').then((res) => setUsers(res.data)).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleToggleActif = async (targetUser: ManagedUser) => {
    const action = targetUser.actif ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} cet utilisateur ?`)) return;
    try {
      const res = await api.patch(`/admin/users/${targetUser.id}/toggle-actif`);
      setUsers(users.map((u) => (u.id === targetUser.id ? res.data : u)));
    } catch (err: any) { alert(err.response?.data?.message || 'Erreur'); }
  };

  const handleTogglePermission = async (userId: string, permission: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/permission`, { permission });
      setUsers(users.map((u) => (u.id === userId ? res.data : u)));
    } catch (err: any) { alert(err.response?.data?.message || 'Erreur'); }
  };

  const handleDelete = async (targetUser: ManagedUser) => {
    if (!confirm(`🚨 Supprimer DÉFINITIVEMENT ${targetUser.nom} ? Irréversible !`)) return;
    try {
      await api.delete(`/admin/users/${targetUser.id}`);
      setUsers(users.filter((u) => u.id !== targetUser.id));
    } catch (err: any) { alert(err.response?.data?.message || 'Erreur'); }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-itec-sky hover:text-white transition mb-6 font-medium w-fit">
          <ArrowLeft size={18} /> Retour au Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="text-itec-sky" size={28} />
              Administration ITEC
            </h1>
            <p className="text-white/60 mt-1 font-medium text-sm">Gestion centralisée des collaborateurs et permissions.</p>
          </div>
          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 uppercase tracking-wide">
            👑 Super Admin Mode
          </span>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-black/30 border-b border-white/10 text-white/80 font-bold uppercase tracking-wider text-xs">
                  <th className="p-5">Collaborateur</th>
                  <th className="p-5">Statut</th>
                  <th className="p-5">Permissions</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition">
                    <td className="p-5">
                      <div className="font-bold text-white text-base">
                        {u.nom} {u.isSuperAdmin && <span className="text-[10px] bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded-full ml-2 align-middle">👑 ADMIN</span>}
                      </div>
                      <div className="text-xs text-itec-sky mt-0.5">{u.email}</div>
                    </td>

                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${u.actif ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.actif ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        {u.actif ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>

                    <td className="p-5">
                      {u.isSuperAdmin ? (
                        <span className="text-xs text-white/40 italic flex items-center gap-1"><ShieldCheck size={14}/> Accès Total</span>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleTogglePermission(u.id, 'can_create_project')} className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border transition ${u.permissions?.includes('can_create_project') ? 'bg-itec-sky/20 border-itec-sky/50 text-itec-sky' : 'bg-black/20 border-white/10 text-white/40 hover:text-white/80'}`}>
                            {u.permissions?.includes('can_create_project') ? '✓ Créer Projets' : '+ Créer Projets'}
                          </button>
                          <button onClick={() => handleTogglePermission(u.id, 'can_view_stats')} className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border transition ${u.permissions?.includes('can_view_stats') ? 'bg-itec-sky/20 border-itec-sky/50 text-itec-sky' : 'bg-black/20 border-white/10 text-white/40 hover:text-white/80'}`}>
                            {u.permissions?.includes('can_view_stats') ? '✓ Voir Stats' : '+ Voir Stats'}
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="p-5 text-right space-x-3 whitespace-nowrap">
                      {!u.isSuperAdmin && (
                        <>
                          <button onClick={() => handleToggleActif(u)} className={`text-xs px-3 py-2 rounded-xl font-bold transition flex-inline items-center gap-2 ${u.actif ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'}`}>
                            <Power size={14} className="inline mr-1"/>
                            {u.actif ? 'Suspendre' : 'Réactiver'}
                          </button>
                          <button onClick={() => handleDelete(u)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3 py-2 rounded-xl font-bold transition">
                            <Trash2 size={14} className="inline mr-1"/>
                            Supprimer
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}