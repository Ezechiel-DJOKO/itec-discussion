'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Task, TaskPriorite } from '@/types';
import { Edit3, X, Save } from 'lucide-react';

export default function EditTaskModal({
  task,
  membres,
  onClose,
  onUpdated,
}: {
  task: Task;
  membres: any[];
  onClose: () => void;
  onUpdated: (t: Task) => void;
}) {
  const [titre, setTitre] = useState(task.titre);
  const [description, setDescription] = useState(task.description || '');
  const [dateLimite, setDateLimite] = useState(task.dateLimite);
  const [priorite, setPriorite] = useState<TaskPriorite>(task.priorite);
  const [assignesIds, setAssignesIds] = useState<string[]>(
    task.assignes?.map((a) => a.id) || [],
  );
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const toggleAssignee = (id: string) => {
    setAssignesIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');
    try {
      const res = await api.put(`/tasks/${task.id}`, {
        titre,
        description,
        dateLimite,
        priorite,
        assignesIds,
      });
      onUpdated(res.data);
      onClose();
    } catch (err: any) {
      setErreur(
        err.response?.data?.message || 'Erreur de modification',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A2540]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card bg-[#0A2540] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit3 className="text-itec-sky" /> Modifier la Tâche
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {erreur && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-4 text-sm">
            {Array.isArray(erreur) ? erreur.join(', ') : erreur}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/50 mb-1">
              Titre *
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              className="glass-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/50 mb-1 block">
                Date limite *
              </label>
              <input
                type="date"
                value={dateLimite}
                onChange={(e) => setDateLimite(e.target.value)}
                required
                className="glass-input w-full px-3 py-2 rounded-xl text-sm [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-white/50 mb-1 block">
                Priorité
              </label>
              <select
                value={priorite}
                onChange={(e) =>
                  setPriorite(e.target.value as TaskPriorite)
                }
                className="glass-input w-full px-3 py-2 rounded-xl text-sm [&>option]:bg-[#0A2540]"
              >
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </div>

          {/* Assignés multiples */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-white/50 uppercase">
                Assigné à
              </label>
              <button
                type="button"
                onClick={() =>
                  setAssignesIds(membres.map((m) => m.userId))
                }
                className="text-[10px] bg-itec-sky/20 text-itec-sky px-2 py-1 rounded font-bold"
              >
                TOUT LE MONDE
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-black/20 rounded-xl border border-white/5">
              {membres.map((m) => (
                <label
                  key={m.userId}
                  className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={assignesIds.includes(m.userId)}
                    onChange={() => toggleAssignee(m.userId)}
                    className="rounded border-white/20 bg-transparent text-itec-sky focus:ring-itec-sky/50"
                  />
                  {m.user?.nom}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-itec-sky to-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <Save size={18} />
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}