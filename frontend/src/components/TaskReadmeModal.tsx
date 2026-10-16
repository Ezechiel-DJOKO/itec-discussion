'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Task } from '@/types';
import { BookOpen, X, Edit3, Save, XCircle } from 'lucide-react';

export default function TaskReadmeModal({
  task,
  isChef,
  onClose,
  onTaskUpdated,
}: {
  task: Task;
  isChef: boolean;
  onClose: () => void;
  onTaskUpdated: (t: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [readmeText, setReadmeText] = useState(task.readme || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/tasks/${task.id}`, { readme: readmeText });
      onTaskUpdated(res.data);
      setEditing(false);
    } catch {
      alert('Erreur lors de la sauvegarde du readme');
    } finally {
      setSaving(false);
    }
  };

  const assignesLabel =
    task.assignes && task.assignes.length > 0
      ? task.assignes.map((a: any) => `${a.prenom || ''} ${a.nom || ''}`.trim()).join(', ')
      : (task as any).assigneA?.nom || 'Personne';

  return (
    <div className="fixed inset-0 bg-[#0A2540]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A2540] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col border border-[#1E4D8C] rounded-2xl">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-4 border-b border-[#1E4D8C]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4FC3F7]/20 rounded-lg text-[#4FC3F7]">
              <BookOpen size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#4FC3F7] uppercase tracking-widest">
                Cahier des charges
              </span>
              <h3 className="text-xl font-bold text-white mt-1 leading-tight">{task.titre}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition p-2 hover:bg-white/10 rounded-full"
          >
            <X size={22} />
          </button>
        </div>

        {/* BODY */}
        <div className="my-6 flex-1 overflow-y-auto custom-scrollbar">
          {editing ? (
            <textarea
              value={readmeText}
              onChange={(e) => setReadmeText(e.target.value)}
              placeholder="Rédigez les instructions détaillées, le cahier des charges, les critères d'acceptation..."
              rows={14}
              className="w-full bg-[#1E4D8C]/20 border border-[#1E4D8C] p-4 rounded-xl text-sm text-white resize-none font-mono focus:outline-none focus:border-[#4FC3F7] placeholder-white/30"
              autoFocus
            />
          ) : (
            <div className="bg-[#1E4D8C]/10 p-5 rounded-xl border border-[#1E4D8C]/40 text-sm text-white/90 whitespace-pre-wrap leading-relaxed min-h-[220px]">
              {task.readme ? (
                task.readme
              ) : (
                <p className="text-white/30 italic text-center py-12">
                  Aucune instruction rédigée pour cette tâche.
                </p>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="pt-4 border-t border-[#1E4D8C]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-xs text-white/50">
            Assigné à :{' '}
            <strong className="text-[#4FC3F7] font-semibold">{assignesLabel}</strong>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {isChef && !editing && (
              <button
                onClick={() => {
                  setReadmeText(task.readme || '');
                  setEditing(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition border border-white/10"
              >
                <Edit3 size={16} /> Modifier
              </button>
            )}

            {editing && (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setReadmeText(task.readme || '');
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                >
                  <XCircle size={16} /> Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-[#1E4D8C] to-[#4FC3F7] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 shadow-lg"
                >
                  <Save size={16} /> {saving ? '...' : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}