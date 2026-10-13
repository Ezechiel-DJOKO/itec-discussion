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
import TaskComments from '@/components/TaskComments';
import TaskReadmeModal from '@/components/TaskReadmeModal';
import EditProjectModal from '@/components/EditProjectModal';
import EditTaskModal from '@/components/EditTaskModal';
import { 
  ArrowLeft, Archive, LogOut, Calendar, User as UserIcon, CheckCircle, 
  Clock, ShieldAlert, Plus, Trash2, BookOpen, Upload, Download, 
  Activity, Users, FileText, AlertTriangle, Settings, Edit3, RotateCcw
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
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTaskReadme, setSelectedTaskReadme] = useState<Task | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  const [taskForm, setTaskForm] = useState({
    titre: '',
    description: '',
    dateLimite: '',
    priorite: 'moyenne' as TaskPriorite,
    assignesIds: [] as string[], // Tableau pour assignation multiple
  });
  const [taskErreur, setTaskErreur] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState<string>('tous');

  const isChef = project?.membres?.some((m) => m.userId === user?.id && m.role === 'chef') ?? false;

  const fetchAll = async () => {
    try {
      const [projRes, tasksRes, logsRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
        api.get(`/projects/${projectId}/logs`),
      ]);
      setProject(projRes.data); setTasks(tasksRes.data); setLogs(logsRes.data);
    } catch (err: any) { setErreur(err.response?.data?.message || 'Erreur de chargement'); } finally { setLoading(false); }
  };

  useEffect(() => { if (projectId) fetchAll(); }, [projectId]);

  const openAddMember = () => {
    api.get('/users').then((res) => {
      const memberIds = project?.membres.map((m) => m.userId) || [];
      setAllUsers(res.data.filter((u: User) => !memberIds.includes(u.id)));
      setShowAddMember(true);
    });
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      const res = await api.post(`/projects/${projectId}/members`, { userId: selectedUserId });
      setProject(res.data); setShowAddMember(false); setSelectedUserId('');
    } catch {}
  };

  const handleRemoveMember = async (uid: string) => {
    if (!confirm('Retirer ce membre ?')) return;
    try { const res = await api.delete(`/projects/${projectId}/members/${uid}`); setProject(res.data); } catch {}
  };

  const handlePenalty = async (uid: string) => {
    const motif = prompt('Motif de la pénalité (-5% sur le rendement global) ?');
    if (motif) {
      try { await api.post(`/users/${uid}/penalty`, { projectId, motif }); alert('Pénalité infligée !'); } catch {}
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archiver ce projet ? Il ne sera plus visible dans la liste active, mais restera en base.')) return;
    try {
      await api.patch(`/projects/${projectId}/archive`);
      router.push('/dashboard');
    } catch (err: any) { alert(err.response?.data?.message || 'Erreur'); }
  };

  const handleUnarchive = async () => {
    try {
      await api.patch(`/projects/${projectId}/unarchive`);
      setProject({ ...project!, statut: 'en_cours' });
      alert('Projet désarchivé et réactivé avec succès !');
    } catch (err: any) { alert(err.response?.data?.message || 'Erreur'); }
  };

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

  const handleSurplus = async (taskId: string) => {
    const j = prompt('Combien de jours de délai supplémentaire ?');
    if (!j || isNaN(Number(j)) || Number(j) <= 0) return;
    try {
      const res = await api.patch(`/tasks/${taskId}/surplus`, { jours: Number(j) });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t))); fetchAll();
      alert('Délai accordé !');
    } catch {}
  };

  // Autorisation: Le chef ou l'un des membres assignés
  const canChangeStatut = (task: Task) => isChef || task.assignes?.some(a => a.id === user?.id);
  const canUpload = (task: Task) => isChef || task.assignes?.some(a => a.id === user?.id);
  const tasksFiltrees = filtreStatut === 'tous' ? tasks : tasks.filter((t) => t.statut === filtreStatut);

  const stats = {
    total: tasks.length,
    aFaire: tasks.filter((t) => t.statut === 'a_faire').length,
    enCours: tasks.filter((t) => t.statut === 'en_cours').length,
    termine: tasks.filter((t) => t.statut === 'termine').length,
    enRetard: tasks.filter((t) => isEnRetard(t)).length,
  };

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
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-itec-sky hover:text-white transition font-medium w-fit">
          <ArrowLeft size={18} /> Retour aux espaces
        </Link>

        {/* ── EN-TÊTE PROJET ── */}
        <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-itec-sky/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
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
                  <button onClick={() => setShowEditProject(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition font-bold text-sm">
                    <Settings size={16}/> Paramètres
                  </button>

                  {project.statut === 'archive' ? (
                    <button onClick={handleUnarchive} className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-4 py-2 rounded-xl transition font-bold text-sm">
                      <RotateCcw size={16}/> Désarchiver
                    </button>
                  ) : (
                    <button onClick={handleArchive} className="flex items-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-xl transition font-bold text-sm">
                      <Archive size={16}/> Archiver
                    </button>
                  )}

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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 relative z-10">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'À faire', value: stats.aFaire, color: 'text-white/60' },
              { label: 'En cours', value: stats.enCours, color: 'text-itec-sky' },
              { label: 'Terminées', value: stats.termine, color: 'text-green-400' },
              { label: 'En retard', value: stats.enRetard, color: 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="bg-black/20 border border-white/5 rounded-xl p-4 text-center">
                <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1 font-bold">{s.label}</div>
              </div>
            ))}
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
                <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="glass-input text-sm rounded-xl px-4 py-2 flex-1 sm:flex-none [&>option]:bg-[#0A2540] [&>option]:text-white cursor-pointer">
                  <option value="tous">Tous les statuts</option>
                  <option value="a_faire">À faire</option>
                  <option value="en_cours">En cours</option>
                  <option value="en_attente">En attente</option>
                  <option value="termine">Terminé</option>
                </select>
                {isChef && (
                  <button onClick={() => setShowNewTask(!showNewTask)} className="bg-itec-sky hover:bg-white text-[#0A2540] px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap">
                    {showNewTask ? <><Archive size={16}/> Annuler</> : <><Plus size={16}/> Nouvelle tâche</>}
                  </button>
                )}
              </div>
            </div>

            {showNewTask && (
              <form onSubmit={handleCreateTask} className="glass-card p-6 space-y-5 border-itec-sky/30">
                <h3 className="font-bold text-white text-lg">Créer une tâche</h3>
                {taskErreur && <div className="text-sm text-red-300 bg-red-500/20 px-4 py-3 rounded-xl border border-red-500/30">{taskErreur}</div>}
                
                <input type="text" placeholder="Titre de la tâche *" value={taskForm.titre} onChange={(e) => setTaskForm({ ...taskForm, titre: e.target.value })} required className="glass-input w-full px-4 py-3 rounded-xl" />
                <textarea placeholder="Description courte (optionnel)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} className="glass-input w-full px-4 py-3 rounded-xl resize-none" />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-white/50 mb-1 block uppercase">Date limite *</label>
                    <input type="date" value={taskForm.dateLimite} onChange={(e) => setTaskForm({ ...taskForm, dateLimite: e.target.value })} required className="glass-input w-full px-4 py-3 rounded-xl text-sm [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/50 mb-1 block uppercase">Priorité</label>
                    <select value={taskForm.priorite} onChange={(e) => setTaskForm({ ...taskForm, priorite: e.target.value as TaskPriorite })} className="glass-input w-full px-4 py-3 rounded-xl text-sm [&>option]:bg-[#0A2540]">
                      <option value="haute">Haute 🔴</option>
                      <option value="moyenne">Moyenne 🟡</option>
                      <option value="basse">Basse ⚪</option>
                    </select>
                  </div>
                  <div className="col-span-1 sm:col-span-3 mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-white/50 uppercase">Assigné à</label>
                      <button 
                        type="button" 
                        onClick={() => setTaskForm({ ...taskForm, assignesIds: project?.membres.map(m => m.userId) || [] })}
                        className="text-[10px] bg-itec-sky/20 text-itec-sky px-2 py-1 rounded hover:bg-itec-sky/30 transition font-bold"
                      >
                        TOUT LE MONDE
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-3 bg-black/20 rounded-xl border border-white/5">
                      {project.membres?.map((m) => (
                        <label key={m.userId} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded transition">
                          <input 
                            type="checkbox" 
                            checked={taskForm.assignesIds.includes(m.userId)}
                            onChange={(e) => {
                              if (e.target.checked) setTaskForm({...taskForm, assignesIds: [...taskForm.assignesIds, m.userId]});
                              else setTaskForm({...taskForm, assignesIds: taskForm.assignesIds.filter(id => id !== m.userId)});
                            }}
                            className="rounded border-white/20 bg-transparent text-itec-sky focus:ring-itec-sky/50"
                          />
                          {m.user?.nom}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={taskLoading} className="w-full bg-gradient-to-r from-itec-sky to-blue-500 hover:from-blue-400 hover:to-blue-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50">
                  {taskLoading ? 'Création...' : 'Valider la tâche'}
                </button>
              </form>
            )}

            {tasksFiltrees.length === 0 ? (
              <div className="glass-card p-12 text-center border-dashed border-2 border-white/10">
                <CheckCircle size={48} className="mx-auto text-white/10 mb-4"/>
                <p className="text-white/40 font-medium">Aucune tâche trouvée.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasksFiltrees.map((task) => {
                  const retard = isEnRetard(task);
                  return (
                    <div key={task.id} className={`glass-card p-5 sm:p-6 transition-all ${retard ? 'border-red-500/50 bg-red-900/10' : 'hover:bg-white/5 border-white/10'}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg text-white">{task.titre}</h3>
                            <span className={`text-[10px] uppercase tracking-wide font-black px-2.5 py-1 rounded-full ${statutConfig[task.statut].color}`}>{statutConfig[task.statut].label}</span>
                            <span className={`text-[10px] uppercase tracking-wide font-black px-2.5 py-1 rounded-full border border-current ${prioriteConfig[task.priorite].color}`}>{prioriteConfig[task.priorite].label}</span>
                            {retard && <span className="text-[10px] uppercase tracking-wide font-black px-2.5 py-1 rounded-full bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] flex items-center gap-1"><AlertTriangle size={12}/> En retard</span>}
                          </div>

                          {task.description && <p className="text-sm text-white/60 mb-4">{task.description}</p>}

                          <div className="bg-black/30 rounded-xl p-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-white/70 border border-white/5">
                            <span className={`flex items-center gap-1.5 ${retard ? 'text-red-400' : ''}`}><Clock size={14}/> {new Date(task.dateLimite).toLocaleDateString()}</span>
                            
                            {/* 🔴 CORRECTION D'AFFICHAGE MULTIPLE ICI */}
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <UserIcon size={14}/> 
                              {task.assignes && task.assignes.length > 0 
                                ? task.assignes.map((a: any) => a.nom).join(', ') 
                                : 'Non assigné'}
                            </span>
                            
                            {task.joursSurplus > 0 && (
                              <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                Initiale: {new Date(task.dateLimiteInitiale).toLocaleDateString()} (+{task.joursSurplus}j)
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            <button onClick={() => setSelectedTaskReadme(task)} className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                              <BookOpen size={14}/> Instructions / README {task.readme ? '✓' : ''}
                            </button>

                            {isChef && (
                              <button onClick={() => setTaskToEdit(task)} className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                                <Edit3 size={14}/> Modifier
                              </button>
                            )}

                            {isChef && task.statut !== 'termine' && (
                              <button onClick={() => handleSurplus(task.id)} className="text-xs font-bold bg-itec-sky/20 hover:bg-itec-sky/30 text-itec-sky border border-itec-sky/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                                <Plus size={14}/> Délai
                              </button>
                            )}
                          </div>

                          <TaskFilesSection task={task} userId={user?.id || ''} isChef={isChef} canUpload={canUpload(task)} />
                          <TaskComments taskId={task.id} currentUser={user} />
                        </div>

                        {/* ACTIONS DROITE */}
                        <div className="flex sm:flex-col items-center gap-3 shrink-0 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/10">
                          {canChangeStatut(task) && (
                            <select value={task.statut} onChange={(e) => handleChangeStatut(task.id, e.target.value as TaskStatut)} className="glass-input text-xs font-bold rounded-lg px-3 py-2 w-full [&>option]:bg-[#0A2540] [&>option]:text-white">
                              <option value="a_faire">À faire</option>
                              <option value="en_cours">En cours</option>
                              <option value="en_attente">En attente</option>
                              <option value="termine">Terminé</option>
                            </select>
                          )}
                          {isChef && (
                            <button onClick={() => handleDeleteTask(task.id)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg font-bold transition w-full flex items-center justify-center gap-1.5">
                              <Trash2 size={14}/> <span className="sm:hidden">Supprimer</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── COLONNE MEMBRES & LOGS (1/3) ── */}
          <div className="space-y-6">
            
            {/* MEMBRES */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users className="text-itec-sky" size={20}/> Équipe</h2>
                {isChef && (
                  <button onClick={openAddMember} className="bg-itec-sky hover:bg-white text-[#0A2540] w-8 h-8 rounded-full flex items-center justify-center font-bold transition">
                    <Plus size={18}/>
                  </button>
                )}
              </div>

              {showAddMember && (
                <div className="mb-5 p-4 bg-black/30 rounded-xl border border-white/10 space-y-3">
                  <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="glass-input w-full px-3 py-2 rounded-lg text-sm [&>option]:bg-[#0A2540]">
                    <option value="">— Sélectionner —</option>
                    {allUsers.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleAddMember} className="flex-1 bg-itec-sky text-[#0A2540] font-bold text-xs py-2 rounded-lg">Ajouter</button>
                    <button onClick={() => setShowAddMember(false)} className="flex-1 bg-white/10 text-white font-bold text-xs py-2 rounded-lg">Annuler</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {project.membres?.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-itec-sky to-blue-600 flex items-center justify-center font-black text-white shadow-md">
                        {m.user?.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {m.user?.nom} {m.userId === user?.id && <span className="text-white/40 text-[10px] font-normal ml-1">(vous)</span>}
                        </div>
                        <div className="text-[10px] text-itec-sky">{m.role === 'chef' ? '👑 CHEF DE PROJET' : 'COLLABORATEUR'}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isChef && m.userId !== user?.id && (
                        <button onClick={() => handlePenalty(m.userId)} className="text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 p-2 rounded-lg transition" title="Infliger une pénalité (-5%)">
                          <ShieldAlert size={16}/>
                        </button>
                      )}
                      {isChef && m.role !== 'chef' && (
                        <button onClick={() => handleRemoveMember(m.userId)} className="text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition" title="Retirer">
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HISTORIQUE */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2"><Activity className="text-itec-sky" size={20}/> Journal d'Activité</h2>
              <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
                {logs.length === 0 ? <p className="text-sm text-white/40 italic text-center py-4">Rien à signaler pour le moment.</p> : (
                  logs.map((log) => {
                    let icone = <Activity size={14} className="text-white/40"/>;
                    let message = '';
                    if (log.action === 'statut_modifie') { icone = <Clock size={14} className="text-itec-sky"/>; message = `a passé la tâche "${log.details.taskTitre}" en ${statutConfig[log.details.nouveauStatut as TaskStatut]?.label}`; } 
                    else if (log.action === 'surplus_accorde') { icone = <Plus size={14} className="text-orange-400"/>; message = `a accordé +${log.details.joursAccordes}j à "${log.details.taskTitre}"`; } 
                    else if (log.action === 'fichier_uploade') { icone = <Upload size={14} className="text-green-400"/>; message = `a uploadé "${log.details.nomFichier}" sur "${log.details.taskTitre}"`; }

                    return (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="mt-1">{icone}</div>
                        <div>
                          <p className="text-white/80 leading-snug"><span className="font-bold text-white">{log.user?.nom}</span> {message}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{new Date(log.creeLe).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL README TACHE */}
      {selectedTaskReadme && (
        <TaskReadmeModal
          task={selectedTaskReadme}
          isChef={isChef}
          onClose={() => setSelectedTaskReadme(null)}
          onTaskUpdated={(updatedTask) => {
            setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
            setSelectedTaskReadme(updatedTask);
          }}
        />
      )}

      {/* MODALES D'EDITION */}
      {showEditProject && project && (
        <EditProjectModal project={project} onClose={() => setShowEditProject(false)} onUpdated={(p) => setProject({ ...project, ...p })} />
      )}
      
      {taskToEdit && (
        <EditTaskModal task={taskToEdit} membres={project?.membres || []} onClose={() => setTaskToEdit(null)} onUpdated={(updated) => { setTasks(tasks.map((t) => t.id === updated.id ? updated : t)); fetchAll(); }} />
      )}

      {/* CHAT FLOTTANT */}
      <ProjectChat projectId={projectId} currentUser={user} isChef={isChef} membres={project?.membres || []}/>
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