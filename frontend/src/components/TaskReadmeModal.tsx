'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Task } from '@/types';
import { BookOpen, X, Edit3, Save, XCircle } from 'lucide-react';

export default function TaskReadmeModal({ task, isChef, onClose, onTaskUpdated }: { task: Task; isChef: boolean; onClose: () => void; onTaskUpdated: (t: Task) => void; }) {
  const [editing, setEditing] = useState(false);
  const [readmeText, setReadmeText] = useState(task.readme || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/tasks/${task.id}`, { readme: readmeText });
      onTaskUpdated(res.data);
      setEditing(false);
    } catch { alert('Erreur'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-[#0A2540]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card bg-[#0A2540] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col border border-white/20">
        
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-itec-sky/20 rounded-lg text-itec-sky"><BookOpen size={24}/></div>
            <div>
              <span className="text-[10px] font-black text-itec-sky uppercase tracking-widest">Cahier des charges</span>
              <h3 className="text-xl font-bold text-white mt-1">{task.titre}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={24}/></button>
        </div>

        <div className="my-6 flex-1 overflow-y-auto">
          {editing ? (
            <textarea value={readmeText} onChange={(e) => setReadmeText(e.target.value)} placeholder="Rédigez les instructions..." rows={12} className="glass-input w-full p-4 rounded-xl text-sm resize-none font-mono" />
          ) : (
            <div className="bg-black/20 p-5 rounded-xl border border-white/5 text-sm text-white/80 whitespace-pre-wrap leading-relaxed min-h-[200px]">
              {task.readme ? task.readme : <p className="text-white/30 italic text-center py-10">Aucune instruction rédigée.</p>}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <div className="text-xs text-white/40">Assigné à : <strong className="text-white">{task.assigneA?.nom || 'Personne'}</strong></div>
          <div className="flex gap-2">
            {isChef && !editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"><Edit3 size={16}/> Modifier</button>
            )}
            {editing && (
              <>
                <button onClick={() => setEditing(false)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold px-4 py-2.5 rounded-xl transition"><XCircle size={16}/> Annuler</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-gradient-to-r from-itec-sky to-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50"><Save size={16}/> {saving ? '...' : 'Enregistrer'}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}