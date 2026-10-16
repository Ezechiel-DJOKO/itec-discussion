'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';
import { Project } from '@/types';
import Navbar from '@/components/Navbar';
import { 
  FolderPlus, Activity, CheckCircle, Clock, ShieldAlert, 
  UserCircle, Plus, X 
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewArchived, setViewArchived] = useState(false);

  // ÉTATS DE LA MODAL DE CRÉATION DE PROJET
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    nom: '',
    description: '',
    dateDebut: '',
    dateFin: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

    // Vérification de sécurité frontend (matche le backend)
  const u = user as any;
  const isResponsableOrAdmin = 
    u?.isSuperAdmin === true || 
    u?.permissions?.includes('can_create_project') || 
    u?.permissions?.includes('can_access_qg') ||
    u?.role === 'admin' || 
    u?.role === 'responsable' || 
    u?.isResponsable === true;

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await api.post('/projects', projectForm);
      setProjects((prev) => [res.data, ...prev]);
      setShowNewProjectModal(false);
      setProjectForm({ nom: '', description: '', dateDebut: '', dateFin: '' });
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Erreur lors de la création du projet');
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      en_cours: 'bg-[#4FC3F7]/20 text-[#4FC3F7] border border-[#4FC3F7]/30',
      termine: 'bg-green-500/20 text-green-400 border border-green-500/30',
      archive: 'bg-white/10 text-white/60 border border-white/20',
    };
    const labels: Record<string, string> = {
      en_cours: 'En cours',
      termine: 'Terminé',
      archive: 'Archivé',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${styles[statut] || styles.en_cours}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  const monRole = (project: Project) => {
    return project.createur?.id === user?.id ? '👑 Chef' : '👤 Membre';
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A2540]">
      <div className="w-10 h-10 border-4 border-[#4FC3F7] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0A2540]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-10">
        
        {/* BANNIÈRE DE RENDEMENT */}
        {stats && (
          <div className="glass-card p-8 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden bg-[#1E4D8C]/20 border border-[#1E4D8C]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#4FC3F7]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="z-10 text-center md:text-left">
              <h2 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <Activity className="text-[#4FC3F7]" />
                Votre Rendement Global
              </h2>
              <p className="text-white/60 mt-2 font-medium">Calculé sur la base de vos performances actuelles.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 z-10 w-full md:w-auto bg-black/20 p-6 rounded-2xl border border-white/10">
              <div className="text-center">
                <div className={`text-5xl font-black tracking-tighter drop-shadow-lg ${stats.rendement >= 80 ? 'text-green-400' : stats.rendement >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
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
                  <ShieldAlert className="text-red-400 mb-2" size={24} />
                  <div className="font-bold text-xl text-red-400">{stats.penalties?.length || 0}</div>
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

            {/* SEULS LES RESPONSABLES ET ADMINS VOIENT LE BOUTON */}
            {isResponsableOrAdmin && (
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="bg-gradient-to-r from-[#1E4D8C] to-[#4FC3F7] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Plus size={18} /> Nouveau Projet
              </button>
            )}
          </div>

          {/* ONGLET ACTIFS / ARCHIVÉS */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setViewArchived(false)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition ${
                !viewArchived ? 'bg-[#4FC3F7] text-[#0A2540] shadow-[0_0_15px_rgba(79,195,247,0.3)]' : 'bg-[#1E4D8C]/30 text-white/50 hover:text-white hover:bg-[#1E4D8C]/50'
              }`}
            >
              🚀 Projets Actifs
            </button>
            <button
              onClick={() => setViewArchived(true)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition ${
                viewArchived ? 'bg-white/20 text-white border border-white/30' : 'bg-[#1E4D8C]/30 text-white/50 hover:text-white hover:bg-[#1E4D8C]/50'
              }`}
            >
              🗄️ Projets Archivés
            </button>
          </div>

          {/* LISTE FILTRÉE */}
          {projects.filter(p => viewArchived ? p.statut === 'archive' : p.statut !== 'archive').length === 0 ? (
            <div className="bg-[#0A2540] border border-[#1E4D8C] rounded-2xl p-16 text-center">
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
                  className="bg-[#0A2540] border border-[#1E4D8C] rounded-2xl p-6 hover:border-[#4FC3F7]/50 transition-all group shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#4FC3F7] transition-colors line-clamp-1">
                      {project.nom}
                    </h3>
                    {getStatutBadge(project.statut)}
                  </div>

                  <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                    {project.description || 'Aucune description fournie.'}
                  </p>

                  <div className="bg-[#1E4D8C]/20 rounded-xl p-4 flex justify-between items-center text-sm mb-4 border border-[#1E4D8C]/40">
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

      {/* 👑 MODAL DE CRÉATION DE PROJET */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A2540] border border-[#1E4D8C] w-full max-w-lg p-6 sm:p-8 rounded-2xl shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-[#1E4D8C]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderPlus className="text-[#4FC3F7]" size={22} />
                Créer un nouveau projet
              </h2>
              <button 
                onClick={() => setShowNewProjectModal(false)}
                className="text-white/50 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Nom du projet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Développement API Backend"
                  value={projectForm.nom}
                  onChange={(e) => setProjectForm({ ...projectForm, nom: e.target.value })}
                  className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#4FC3F7]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Description générale des objectifs du projet..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#4FC3F7] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Date de début *</label>
                  <input
                    type="date"
                    required
                    value={projectForm.dateDebut}
                    onChange={(e) => setProjectForm({ ...projectForm, dateDebut: e.target.value })}
                    className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#4FC3F7] [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Date de fin *</label>
                  <input
                    type="date"
                    required
                    value={projectForm.dateFin}
                    onChange={(e) => setProjectForm({ ...projectForm, dateFin: e.target.value })}
                    className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#4FC3F7] [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl text-sm transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 bg-gradient-to-r from-[#1E4D8C] to-[#4FC3F7] text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50 shadow-lg"
                >
                  {createLoading ? 'Création...' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}