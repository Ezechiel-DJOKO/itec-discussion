'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, BookOpen, Edit3, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { Task } from '@/types';

interface TaskReadmeModalProps {
  task: Task;
  isChef: boolean;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
}

export default function TaskReadmeModal({
  task,
  isChef,
  onClose,
  onTaskUpdated,
}: TaskReadmeModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDescription(task.description || '');
  }, [task.description]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.patch(`/tasks/${task.id}`, { description });
      onTaskUpdated(res.data);
      setIsEditing(false);
    } catch (err) {
      alert('Erreur lors de la sauvegarde des détails.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0A2540] border border-[#1E4D8C] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E4D8C] bg-[#0A2540]/80">
          <div className="flex items-center gap-3">
            <div className="bg-[#4FC3F7]/20 p-2 rounded-lg">
              <BookOpen className="text-[#4FC3F7]" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{task.titre}</h2>
              <p className="text-xs text-white/50">Détails de la tâche</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition bg-white/5 hover:bg-white/10 p-2 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0A2540]">
          {isEditing ? (
            <div className="space-y-4">
              <label className="text-xs font-bold text-[#4FC3F7] uppercase tracking-wide">
                Rédiger les détails
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={14}
                placeholder="Rédigez ici tous les détails de la tâche..."
                className="w-full bg-[#1E4D8C]/20 text-[#4FC3F7] border border-[#1E4D8C] rounded-xl p-4 text-sm focus:outline-none focus:border-[#4FC3F7] resize-none custom-scrollbar"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#4FC3F7] uppercase tracking-wide">
                  Contenu
                </label>
                {isChef && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition"
                  >
                    <Edit3 size={14} /> {description ? 'Éditer' : 'Rédiger'}
                  </button>
                )}
              </div>
              
              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#1E4D8C]/10 p-5 rounded-xl border border-[#1E4D8C]/30 min-h-[200px]">
                {description.trim() ? (
                  description
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white/30 italic gap-2 py-10">
                    <ShieldAlert size={32} className="text-white/20" />
                    <span>Aucun détail n'a été rédigé pour cette tâche.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pied */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-[#1E4D8C] bg-[#0A2540]">
            <button
              onClick={() => {
                setDescription(task.description || '');
                setIsEditing(false);
              }}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white/70 hover:text-white transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-[#4FC3F7] hover:bg-[#29b6f6] text-[#0A2540] px-5 py-2 rounded-xl font-bold transition disabled:opacity-50"
            >
              <Check size={16} /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}