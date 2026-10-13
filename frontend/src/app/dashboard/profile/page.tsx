'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, User, ShieldCheck, Activity, KeyRound, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Formulaire Nom
  const [nom, setNom] = useState('');
  const [loadingNom, setLoadingNom] = useState(false);
  const [msgNom, setMsgNom] = useState({ type: '', text: '' });

  // Formulaire Mot de passe
  const [pwdForm, setPwdForm] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [msgPwd, setMsgPwd] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) setNom(user.nom);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      api.get('/users/me/stats')
        .then((res) => setStats(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [authLoading]);

  // 🔴 Changer le nom
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgNom({ type: '', text: '' });
    setLoadingNom(true);
    try {
      await api.put('/users/me', { nom });
      setMsgNom({ type: 'success', text: 'Profil mis à jour ! Veuillez vous reconnecter pour voir les changements.' });
      setTimeout(() => logout(), 3000); // Déconnexion pour rafraîchir le JWT/Context
    } catch (err: any) {
      setMsgNom({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    } finally {
      setLoadingNom(false);
    }
  };

  // 🔴 Changer le mot de passe
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgPwd({ type: '', text: '' });

    if (pwdForm.nouveau !== pwdForm.confirmation) {
      return setMsgPwd({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
    }
    if (pwdForm.nouveau.length < 6) {
      return setMsgPwd({ type: 'error', text: '6 caractères minimum requis' });
    }

    setLoadingPwd(true);
    try {
      await api.put('/users/me/password', {
        ancienMotDePasse: pwdForm.ancien,
        nouveauMotDePasse: pwdForm.nouveau,
      });
      setMsgPwd({ type: 'success', text: 'Mot de passe modifié avec succès !' });
      setPwdForm({ ancien: '', nouveau: '', confirmation: '' });
    } catch (err: any) {
      setMsgPwd({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    } finally {
      setLoadingPwd(false);
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-[#0A2540]"><div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A2540]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-itec-sky hover:text-white transition font-medium w-fit">
          <ArrowLeft size={18} /> Retour au Dashboard
        </Link>

        {/* ── EN-TÊTE PROFIL ── */}
        <div className="glass-card p-6 sm:p-8 relative overflow-hidden border border-white/20 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-itec-sky/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-itec-sky to-blue-600 flex items-center justify-center font-black text-white text-4xl shadow-xl border-4 border-[#0A2540]">
              {user?.nom?.charAt(0).toUpperCase()}
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
                {user?.nom}
                {user?.isSuperAdmin && (
  <span title="Super Admin">
    <ShieldCheck className="text-yellow-400" size={24} />
  </span>
)}
              </h1>
              <p className="text-itec-sky font-medium mt-1">{user?.email}</p>
              
              <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 uppercase tracking-wider">
                {user?.isSuperAdmin ? '👑 Super Administrateur' : '👤 Collaborateur'}
              </div>
            </div>

            {/* MINI STATS */}
            {stats && (
              <div className="flex gap-4 sm:gap-6 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="text-center">
                  <div className={`text-2xl font-black ${stats.rendement >= 80 ? 'text-green-400' : stats.rendement >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {stats.rendement}%
                  </div>
                  <div className="text-[10px] text-white/40 uppercase font-bold mt-1">Rendement</div>
                </div>
                <div className="w-px bg-white/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{stats.completedTasks}</div>
                  <div className="text-[10px] text-white/40 uppercase font-bold mt-1">Tâches Finies</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* ── MODIFIER INFORMATIONS ── */}
          <div className="glass-card p-6 border border-white/20 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <User className="text-itec-sky" size={20} /> Informations personnelles
            </h2>

            {msgNom.text && (
              <div className={`p-3 rounded-xl text-sm font-medium mb-4 border ${msgNom.type === 'error' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
                {msgNom.text}
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-1.5">Nom complet</label>
                <input 
                  type="text" 
                  value={nom} 
                  onChange={(e) => setNom(e.target.value)} 
                  required 
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-1.5">Email professionnel</label>
                <input 
                  type="email" 
                  value={user?.email} 
                  disabled 
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 text-white/40 border border-transparent cursor-not-allowed"
                  title="L'email ne peut pas être modifié"
                />
              </div>

              <button 
                type="submit" 
                disabled={loadingNom || nom === user?.nom}
                className="w-full bg-itec-sky hover:bg-white text-[#0A2540] font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} /> {loadingNom ? 'Enregistrement...' : 'Mettre à jour'}
              </button>
            </form>
          </div>

          {/* ── CHANGER LE MOT DE PASSE ── */}
          <div className="glass-card p-6 border border-white/20 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <KeyRound className="text-itec-sky" size={20} /> Sécurité
            </h2>

            {msgPwd.text && (
              <div className={`p-3 rounded-xl text-sm font-medium mb-4 border ${msgPwd.type === 'error' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
                {msgPwd.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-1.5">Ancien mot de passe</label>
                <input 
                  type="password" 
                  value={pwdForm.ancien} 
                  onChange={(e) => setPwdForm({ ...pwdForm, ancien: e.target.value })} 
                  required 
                  placeholder="••••••••"
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-1.5">Nouveau mot de passe</label>
                <input 
                  type="password" 
                  value={pwdForm.nouveau} 
                  onChange={(e) => setPwdForm({ ...pwdForm, nouveau: e.target.value })} 
                  required 
                  placeholder="••••••••"
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase mb-1.5">Confirmer le nouveau</label>
                <input 
                  type="password" 
                  value={pwdForm.confirmation} 
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmation: e.target.value })} 
                  required 
                  placeholder="••••••••"
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>

              <button 
                type="submit" 
                disabled={loadingPwd || !pwdForm.ancien || !pwdForm.nouveau}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loadingPwd ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}