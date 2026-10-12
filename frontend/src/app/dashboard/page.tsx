'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';
import { Project } from '@/types';
import Navbar from '@/components/Navbar';
import { FolderPlus, Activity, CheckCircle, Clock, AlertTriangle, ShieldAlert, UserCircle } from 'lucide-react';

export default function DashboardPage() {
  const { loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewArchived, setViewArchived] = useState(false); // 👈 NOUVEAU

  useEffect(() => {
    if (!authLoading) {
      Promise.all([
        api.get('/projects'),
        api.get('/users/me/stats')
      ])
        .then(([projRes, statsRes]) => {
          setProjects(projRes.data);
          setStats(statsRes.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [authLoading]);

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      en_cours: 'bg-itec-sky/20 text-itec-sky border border-itec-sky/30',
      termine: 'bg-green-500/20 text-green-400 border border-green-500/30',
      archive: 'bg-white/10 text-white/60 border border-white/20',
    };
    const labels: Record<string, string> = {
      en_cours: 'En cours',
      termine: 'Terminé',
      archive: 'Archivé',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${styles[statut]}`}>
        {labels[statut]}
      </span>
    );
  };

  const monRole = (project: Project) => {
    const m = project.membres?.find((m: any) => m.userId === stats?.userId); // Simplified for UI
    return project.createur.id === stats?.userId ? '👑 Chef' : '👤 Membre';
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-10 h-10 border-4 border-itec-sky border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-10">
        
        {/* BANNIÈRE DE RENDEMENT */}
        {stats && (
          <div className="glass-card p-8 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden">
            {/* Décoration d'arrière plan */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-itec-sky/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="z-10 text-center md:text-left">
              <h2 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <Activity className="text-itec-sky" />
                Votre Rendement Global
              </h2>
              <p className="text-white/60 mt-2 font-medium">Calculé sur la base de vos performances actuelles.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 z-10 w-full md:w-auto bg-black/20 p-6 rounded-2xl border border-white/10">
              <div className="text-center">
                <div className={`text-5xl font-black tracking-tighter drop-shadow-lg ${stats.rendement >= 80 ? 'text-green-400' : stats.rendement >= 50 ? 'text-yellow-400' : 'text-itec-red'}`}>
                  {stats.rendement}%
                </div>
              </div>

              <div className="hidden sm:block h-16 w-px bg-white/20"></div>
              <div className="block sm:hidden w-full h-px bg-white/20"></div>

              <div className="flex gap-6 sm:gap-8 text-center">
                <div className="flex flex-col items-center">
                  <CheckCircle className="text-green-400 mb-2" size={24} />
                  <div className="font-bold text-xl text-white">{stats.completedTasks} / {stats.totalTasks}</div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mt-1">Tâches Finies</div>
                </div>
                <div className="flex flex-col items-center">
                  <Clock className="text-yellow-400 mb-2" size={24} />
                  <div className="font-bold text-xl text-yellow-400">{stats.lateTasks}</div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mt-1">En Retard</div>
                </div>
                <div className="flex flex-col items-center">
                  <ShieldAlert className="text-itec-red mb-2" size={24} />
                  <div className="font-bold text-xl text-itec-red">{stats.penalties?.length || 0}</div>
                  <div className="text-white/50 text-xs uppercase tracking-wider mt-1">Pénalités</div>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* SECTION PROJETS */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Espaces de travail</h1>
              <p className="text-white/60 mt-1 font-medium">{projects.length} projet(s) au total</p>
            </div>
            <Link 
              href="/dashboard/projects/new" 
              className="flex items-center gap-2 bg-gradient-to-r from-itec-sky to-blue-500 hover:from-blue-400 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform transform hover:-translate-y-0.5"
            >
              <FolderPlus size={20} />
              Nouveau projet
            </Link>
          </div>

          {/* 🔴 NOUVEAUX ONGLETS ACTIFS / ARCHIVÉS */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setViewArchived(false)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition ${
                !viewArchived ? 'bg-itec-sky text-[#0A2540] shadow-[0_0_15px_rgba(79,195,247,0.3)]' : 'glass-card text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              🚀 Projets Actifs
            </button>
            <button
              onClick={() => setViewArchived(true)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition ${
                viewArchived ? 'bg-white/20 text-white border border-white/30' : 'glass-card text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              🗄️ Projets Archivés
            </button>
          </div>

          {/* LISTE FILTRÉE */}
          {projects.filter(p => viewArchived ? p.statut === 'archive' : p.statut !== 'archive').length === 0 ? (
             <div className="glass-card p-16 text-center">
              <FolderPlus size={64} className="mx-auto text-white/20 mb-6" />
              <h2 className="text-2xl font-bold text-white mb-3">
                Aucun projet {viewArchived ? 'archivé' : 'actif'}
              </h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter(p => viewArchived ? p.statut === 'archive' : p.statut !== 'archive')
                .map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="glass-card p-6 hover:bg-white/10 transition-all group hover:border-itec-sky/50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-itec-sky transition-colors line-clamp-1">
                      {project.nom}
                    </h3>
                    {getStatutBadge(project.statut)}
                  </div>

                  <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                    {project.description || 'Aucune description fournie.'}
                  </p>

                  <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center text-sm mb-4">
                    <span className="font-medium text-white/80">{monRole(project)}</span>
                    <span className="flex items-center gap-1.5 text-white/60">
                      <UserCircle size={16} />
                      {project.membres?.length || 0} membre(s)
                    </span>
                  </div>

                  <div className="pt-4 border-t border-white/10 text-xs text-white/40 flex items-center justify-center gap-2 font-medium">
                    <Clock size={14} />
                    {new Date(project.dateDebut).toLocaleDateString('fr-FR')} 
                    <span className="text-white/20">→</span> 
                    {new Date(project.dateFin).toLocaleDateString('fr-FR')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}