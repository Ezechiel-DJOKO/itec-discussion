'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Project } from '@/types';
import { Settings, X, Save } from 'lucide-react';

export default function EditProjectModal({
  project,
  onClose,
  onUpdated,
}: {
  project: Project;
  onClose: () => void;
  onUpdated: (p: Project) => void;
}) {
  const [nom, setNom] = useState(project.nom);
  const [description, setDescription] = useState(project.description || '');
  const [dateDebut, setDateDebut] = useState(project.dateDebut);
  const [dateFin, setDateFin] = useState(project.dateFin);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');
    try {
      const res = await api.put(`/projects/${project.id}`, { nom, description, dateDebut, dateFin });
      onUpdated(res.data);
      onClose();
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Erreur de modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A2540]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card bg-[#0A2540] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-white/20">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="text-itec-sky"/> Modifier le Projet</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={24}/></button>
        </div>

        {erreur && <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-4 text-sm">{erreur}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-white/50 mb-1">Nom du projet</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required className="glass-input w-full px-4 py-3 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/50 mb-1">Date de début</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required className="glass-input w-full px-4 py-3 rounded-xl text-sm [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 mb-1">Date de fin</label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} required className="glass-input w-full px-4 py-3 rounded-xl text-sm [color-scheme:dark]" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-itec-sky to-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
            <Save size={18}/> {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  );
}