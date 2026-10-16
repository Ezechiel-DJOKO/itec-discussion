'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import Navbar from '@/components/Navbar';
import { Project, User, Task, TaskStatut, TaskPriorite, TaskFile } from '@/types';
import ProjectChat from '@/components/ProjectChat';
import TaskReadmeModal from '@/components/TaskReadmeModal';
import EditProjectModal from '@/components/EditProjectModal';
import EditTaskModal from '@/components/EditTaskModal';
import { 
  ArrowLeft, Archive, LogOut, Calendar, User as UserIcon, CheckCircle, 
  Clock, ShieldAlert, Plus, Trash2, BookOpen, Upload, Download, 
  Users, FileText, Settings, Edit3
} from 'lucide-react';

// ─── Helpers UI ──────────────────────────────────────────
const statutConfig: Record<TaskStatut, { label: string; color: string }> = {
  a_faire: { label: 'À faire', color: 'bg-white/10 text-white/60 border border-white/20' },
  en_cours: { label: 'En cours', color: 'bg-itec-sky/20 text-itec-sky border border-itec-sky/30' },
  en_attente: { label: 'En attente', color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  termine: { label: 'Terminé', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
};

const prioriteConfig: Record<TaskPriorite, { label: string; color: string }> = {
  haute: { label: 'Haute', color: 'text-red-400 bg-red-500/10' },
  moyenne: { label: 'Moyenne', color: 'text-yellow-400 bg-yellow-500/10' },
  basse: { label: 'Basse', color: 'text-white/40 bg-white/5' },
};

function isEnRetard(task: Task): boolean {
  if (task.statut === 'termine') return false;
  return new Date(task.dateLimite) < new Date(new Date().toDateString());
}

function formatTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function iconeFichier(mimetype: string, nom: string) {
  if (mimetype.includes('zip')) return '📦';
  if (mimetype.includes('pdf')) return '📄';
  if (mimetype.includes('image')) return '🖼️';
  if (mimetype.includes('excel') || mimetype.includes('sheet')) return '📊';
  return '📎';
}

// ─── Composant Fichiers d'une tâche ──────────────────────
function TaskFilesSection({ task, userId, isChef, canUpload }: { task: Task; userId: string; isChef: boolean; canUpload: boolean }) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [erreur, setErreur] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    setLoading(true);
    try { const res = await api.get(`/tasks/${task.id}/files`); setFiles(res.data); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (open) loadFiles(); }, [open, task.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setErreur('Fichier trop volumineux (max 10 Mo)');
    setErreur(''); setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await api.post(`/tasks/${task.id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFiles((prev) => [res.data, ...prev]);
    } catch (err: any) { setErreur(err.response?.data?.message || "Erreur d'upload"); } finally {
      setUploading(false); if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (file: TaskFile) => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/files/${file.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob(); const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = file.nomOriginal;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { alert('Erreur lors du téléchargement'); }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    try { await api.delete(`/files/${fileId}`); setFiles((prev) => prev.filter((f) => f.id !== fileId)); } catch {}
  };

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <button onClick={() => setOpen(!open)} className="text-xs font-bold text-itec-sky hover:text-white transition flex items-center gap-1.5 uppercase tracking-wide">
        <FileText size={14} /> Fichiers Joints {open ? '▲' : '▼'} {!open && files.length > 0 && `(${files.length})`}
      </button>

      {open && (
        <div className="mt-3 space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
          {erreur && <div className="text-xs text-red-300 bg-red-500/20 px-3 py-2 rounded-lg">{erreur}</div>}
          
          {canUpload && (
            <div className="flex items-center gap-3">
              <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-xs font-medium text-white transition flex items-center gap-2">
                <Upload size={14}/> {uploading ? 'Upload...' : 'Ajouter un fichier'}
                <input ref={inputRef} type="file" onChange={handleUpload} accept=".zip,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv" className="hidden" disabled={uploading} />
              </label>
            </div>
          )}

          {loading ? <p className="text-xs text-white/40">Chargement...</p> : files.length === 0 ? <p className="text-xs text-white/40 italic">Aucun fichier joint.</p> : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">{iconeFichier(f.mimetype, f.nomOriginal)}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{f.nomOriginal}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{formatTaille(f.taille)} · {f.uploadedBy?.nom}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => handleDownload(f)} className="text-itec-sky hover:text-white transition"><Download size={16}/></button>
                    {(isChef || f.uploadedById === userId) && <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300 transition"><Trash2 size={16}/></button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────
function ProjectDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  const [showNewTask, setShowNewTask] = useState(false);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false); // État pour la popup blanche
  const [selectedTaskReadme, setSelectedTaskReadme] = useState<Task | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  const [taskForm, setTaskForm] = useState({
    titre: '',
    description: '',
    dateLimite: '',
    priorite: 'moyenne' as TaskPriorite,
    assignesIds: [] as string[],
  });
  const [taskErreur, setTaskErreur] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState<string>('tous');

  const isChef = project?.membres?.some((m) => m.userId === user?.id && m.role === 'chef') ?? false;

  const fetchAll = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data); setTasks(tasksRes.data);
    } catch (err: any) { setErreur(err.response?.data?.message || 'Erreur de chargement'); } finally { setLoading(false); }
  };

  useEffect(() => { if (projectId) fetchAll(); }, [projectId]);

  const handleDeleteProject = async () => {
    const confirmation = prompt(`🚨 SUPPRESSION DÉFINITIVE\nToutes les tâches, fichiers et messages seront effacés.\nPour confirmer, tapez : SUPPRIMER`);
    if (confirmation === 'SUPPRIMER') {
      try { await api.delete(`/projects/${projectId}`); router.push('/dashboard'); } catch {}
    }
  };

  const handleLeave = async () => {
    if (!confirm('Quitter ce projet ?')) return;
    try { await api.post(`/projects/${projectId}/leave`); router.push('/dashboard'); } catch {}
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskForm.assignesIds.length === 0) {
      setTaskErreur('Veuillez assigner la tâche à au moins une personne.');
      return;
    }
    setTaskErreur('');
    setTaskLoading(true);
    try {
      const payload: any = {
        titre: taskForm.titre,
        description: taskForm.description || undefined,
        dateLimite: taskForm.dateLimite,
        priorite: taskForm.priorite,
        assignesIds: taskForm.assignesIds
      };

      const res = await api.post(`/projects/${projectId}/tasks`, payload);
      setTasks((prev) => [res.data, ...prev]);
      setShowNewTask(false);
      setTaskForm({ titre: '', description: '', dateLimite: '', priorite: 'moyenne', assignesIds: [] });
    } catch (err: any) {
      setTaskErreur(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleChangeStatut = async (taskId: string, statut: TaskStatut) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/statut`, { statut });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t))); fetchAll();
    } catch {}
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try { await api.delete(`/tasks/${taskId}`); setTasks((prev) => prev.filter((t) => t.id !== taskId)); } catch {}
  };

  const canChangeStatut = (task: Task) => isChef || task.assignes?.some(a => a.id === user?.id);
  const canUpload = (task: Task) => isChef || task.assignes?.some(a => a.id === user?.id);
  const tasksFiltrees = filtreStatut === 'tous' ? tasks : tasks.filter((t) => t.statut === filtreStatut);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full"></div></div>;

  if (erreur || !project) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="glass-card p-10 text-center border-red-500/30">
        <ShieldAlert size={48} className="mx-auto text-red-400 mb-4"/>
        <p className="text-white font-bold text-lg mb-6">{erreur || 'Projet introuvable'}</p>
        <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition">← Retour</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0A2540]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-itec-sky hover:text-white transition font-medium w-fit">
          <ArrowLeft size={18} /> Retour aux espaces
        </Link>

        {/* ── EN-TÊTE PROJET ── */}
        <div className="glass-card p-6 sm:p-8 relative overflow-hidden bg-[#1E4D8C]/20 border border-[#1E4D8C]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#4FC3F7]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 relative z-10">
            <div>
              <h1 className="text-3xl font-black text-white">{project.nom}</h1>
              <p className="text-white/70 mt-2 max-w-2xl">{project.description || 'Pas de description'}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm font-medium text-white/50">
                <span className="flex items-center gap-1.5">
                  <Calendar size={16}/> {new Date(project.dateDebut).toLocaleDateString()} → {new Date(project.dateFin).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserIcon size={16}/> {project.createur?.nom}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {isChef ? (
                <>
                  <button onClick={() => setShowEditProject(true)} className="flex items-center gap-2 bg-[#1E4D8C] hover:bg-[#4FC3F7] text-white px-4 py-2 rounded-xl transition font-bold text-sm">
                    <Settings size={16}/> Paramètres
                  </button>
                  <button onClick={handleDeleteProject} className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl transition font-bold text-sm">
                    <Trash2 size={16}/> Supprimer
                  </button>
                </>
              ) : (
                <button onClick={handleLeave} className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl transition font-bold text-sm">
                  <LogOut size={16}/> Quitter
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ── COLONNE TÂCHES (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="text-itec-sky"/> Tâches du projet
              </h2>
              <div className="flex gap-3 w-full sm:w-auto">
                {isChef && (
                  <button onClick={() => setShowNewTask(!showNewTask)} className="bg-gradient-to-r from-[#1E4D8C] to-[#4FC3F7] hover:opacity-90 text-white px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap shadow-lg">
                    {showNewTask ? <><Archive size={16}/> Annuler</> : <><Plus size={16}/> Nouvelle tâche</>}
                  </button>
                )}
              </div>
            </div>

            {/* FORMULAIRE DE CRÉATION DE TÂCHE */}
            {showNewTask && (
              <form onSubmit={handleCreateTask} className="bg-[#0A2540] p-6 space-y-5 border border-[#1E4D8C] rounded-2xl shadow-xl">
                <h3 className="font-bold text-white text-lg">Créer une tâche</h3>
                {taskErreur && <div className="text-sm text-red-300 bg-red-500/20 px-4 py-3 rounded-xl border border-red-500/30">{taskErreur}</div>}
                
                <input type="text" placeholder="Titre de la tâche *" value={taskForm.titre} onChange={(e) => setTaskForm({ ...taskForm, titre: e.target.value })} required className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl text-white focus:outline-none focus:border-[#4FC3F7]" />
                <textarea placeholder="Description courte (optionnel)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl resize-none text-white focus:outline-none focus:border-[#4FC3F7]" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 mb-1 block uppercase">Date limite *</label>
                    <input type="date" value={taskForm.dateLimite} onChange={(e) => setTaskForm({ ...taskForm, dateLimite: e.target.value })} required className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-[#4FC3F7] [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 mb-1 block uppercase">Priorité</label>
                    <select value={taskForm.priorite} onChange={(e) => setTaskForm({ ...taskForm, priorite: e.target.value as TaskPriorite })} className="w-full bg-[#1E4D8C]/30 border border-[#1E4D8C] px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-[#4FC3F7] [&>option]:bg-[#0A2540]">
                      <option value="haute">Haute 🔴</option>
                      <option value="moyenne">Moyenne 🟡</option>
                      <option value="basse">Basse ⚪</option>
                    </select>
                  </div>
                  
                  {/* SECTEUR ASSIGNATION (Popup blanche intégrée) */}
                  <div className="col-span-1 sm:col-span-2 mt-2 relative">
                    <label className="text-xs font-bold text-gray-300 mb-1 block uppercase">Assigné à *</label>
                    
                    <button 
                      type="button" 
                      onClick={() => setShowAssigneeModal(!showAssigneeModal)}
                      className="w-full flex items-center justify-between bg-[#1E4D8C]/30 hover:bg-[#1E4D8C]/50 transition-colors border border-[#1E4D8C] px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-[#4FC3F7]"
                    >
                      <span className="truncate">
                        {taskForm.assignesIds.length === 0 
                          ? '— Personne —' 
                          : taskForm.assignesIds.length === (project?.membres?.length || 0) && (project?.membres?.length || 0) > 0
                            ? '🌐 Tout le monde'
                            : `${taskForm.assignesIds.length} membre(s) sélectionné(s)`}
                      </span>
                      <span className="text-gray-400 text-xs">▼</span>
                    </button>

                    {showAssigneeModal && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" onClick={() => setShowAssigneeModal(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
                          {/* Option: — Personne — */}
                          <button
                            type="button"
                            onClick={() => setTaskForm({ ...taskForm, assignesIds: [] })}
                            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition"
                          >
                            <span className="text-base font-medium text-gray-800">— Personne —</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${taskForm.assignesIds.length === 0 ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}`}>
                              {taskForm.assignesIds.length === 0 && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </button>

                          {/* Option: Tout le monde */}
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = project?.membres?.map((m: any) => m.userId) || [];
                              setTaskForm({ ...taskForm, assignesIds: allIds });
                            }}
                            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition"
                          >
                            <span className="text-base font-bold text-blue-600">🌐 Tout le monde</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${taskForm.assignesIds.length === (project?.membres?.length || 0) && (project?.membres?.length || 0) > 0 ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}`}>
                              {taskForm.assignesIds.length === (project?.membres?.length || 0) && (project?.membres?.length || 0) > 0 && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </button>

                          {/* Individual Members List */}
                          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                            {project?.membres?.map((m: any) => {
                              const isSelected = taskForm.assignesIds.includes(m.userId);
                              const nomComplet = `${(m.user as any)?.prenom || ''} ${m.user?.nom || ''}`.trim();
                              return (
                                <button
                                  key={m.userId}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) setTaskForm({ ...taskForm, assignesIds: taskForm.assignesIds.filter(id => id !== m.userId) });
                                    else setTaskForm({ ...taskForm, assignesIds: [...taskForm.assignesIds, m.userId] });
                                  }}
                                  className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition"
                                >
                                  <span className="text-base font-medium text-gray-900">{nomComplet}</span>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="p-2.5 bg-gray-50 text-right">
                            <button type="button" onClick={() => setShowAssigneeModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg">
                              Valider
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={taskLoading} className="w-full bg-gradient-to-r from-[#1E4D8C] to-[#4FC3F7] text-white font-bold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50 mt-4">
                  {taskLoading ? 'Création en cours...' : 'Valider la tâche'}
                </button>
              </form>
            )}

            {/* 📜 LISTE DES TÂCHES */}
            <div className="space-y-4">
              {tasksFiltrees.map((task) => {
                const retard = isEnRetard(task);
                return (
                  <div key={task.id} className="bg-[#0A2540] border border-[#1E4D8C] rounded-2xl p-5 sm:p-6 shadow-lg hover:border-[#4FC3F7]/50 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 w-full">
                        
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statutConfig[task.statut].color}`}>
                            {statutConfig[task.statut].label}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${prioriteConfig[task.priorite].color}`}>
                            {prioriteConfig[task.priorite].label}
                          </span>
                          {retard && <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full border border-red-500/30 uppercase">En retard</span>}
                        </div>

                        <h3 className="font-bold text-lg text-white">{task.titre}</h3>

                        {/* BARRE D'INFORMATIONS TÂCHE (DATE + ASSIGNATIONS) */}
                        <div className="bg-[#1E4D8C]/20 rounded-xl p-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-gray-300 border border-[#1E4D8C]/50 mt-2">
                          
                          {/* Date limite */}
                          <span className={`flex items-center gap-1.5 ${retard ? 'text-red-400' : ''}`}>
                            <Clock size={14}/> {new Date(task.dateLimite).toLocaleDateString()}
                          </span>
                          
                          {/* 👈 TON BOUT DE CODE EST PLACÉ EXACTEMENT ICI ! */}
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <UserIcon size={14} className="text-[#4FC3F7]" /> 
                            {task.assignes && task.assignes.length > 0 
                              ? task.assignes.map((a: any) => `${a.prenom || ''} ${a.nom || ''}`).join(', ') 
                              : 'Non assigné'}
                          </span>

                        </div>
                        
                        {/* Actions boutons */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button onClick={() => setSelectedTaskReadme(task)} className="text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition">
                            <BookOpen size={14}/> Voir détails & Readme
                          </button>
                          {canChangeStatut(task) && task.statut !== 'termine' && (
                            <button onClick={() => handleChangeStatut(task.id, 'termine')} className="text-xs font-bold bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition">
                              <CheckCircle size={14}/> Marquer terminé
                            </button>
                          )}
                          {isChef && (
                            <>
                              <button onClick={() => setTaskToEdit(task)} className="text-xs font-bold bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition">
                                <Edit3 size={14}/> Modifier
                              </button>
                              <button onClick={() => handleDeleteTask(task.id)} className="text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition">
                                <Trash2 size={14}/> Supprimer
                              </button>
                            </>
                          )}
                        </div>
                        
                        <TaskFilesSection task={task} userId={user?.id || ''} isChef={isChef} canUpload={canUpload(task)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COLONNE MEMBRES ── */}
          <div className="space-y-6">
            <div className="bg-[#0A2540] border border-[#1E4D8C] p-6 rounded-2xl shadow-lg">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2"><Users className="text-[#4FC3F7]" size={20}/> Équipe</h2>
              <div className="space-y-3">
                {project.membres?.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-[#1E4D8C]/20 rounded-xl border border-[#1E4D8C]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E4D8C] to-[#4FC3F7] flex items-center justify-center font-black text-white shadow-md">
                        {m.user?.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {(m.user as any)?.prenom} {m.user?.nom} {m.userId === user?.id && <span className="text-gray-400 text-[10px] font-normal ml-1">(vous)</span>}
                        </div>
                        <div className="text-[10px] text-[#4FC3F7]">{m.role === 'chef' ? '👑 CHEF DE PROJET' : 'COLLABORATEUR'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedTaskReadme && <TaskReadmeModal task={selectedTaskReadme} isChef={isChef} onClose={() => setSelectedTaskReadme(null)} onTaskUpdated={(updatedTask) => { setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))); setSelectedTaskReadme(updatedTask); }} />}
      {showEditProject && project && <EditProjectModal project={project} onClose={() => setShowEditProject(false)} onUpdated={(p) => setProject({ ...project, ...p })} />}
      {taskToEdit && <EditTaskModal task={taskToEdit} membres={project?.membres || []} onClose={() => setTaskToEdit(null)} onUpdated={(updated) => { setTasks(tasks.map((t) => t.id === updated.id ? updated : t)); fetchAll(); }} />}
      
      {/* 💬 COMPOSANT CHAT */}
      <ProjectChat
        projectId={project.id}
        currentUser={user}
        isChef={isChef}
        membres={project.membres || []}
        projectName={project?.nom}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full"></div></div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}