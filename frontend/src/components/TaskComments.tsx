'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { User } from '@/types';
import { MessageCircle, Send } from 'lucide-react';

export default function TaskComments({ taskId, currentUser }: { taskId: string; currentUser: User | null }) {
  const [comments, setComments] = useState<any[]>([]);
  const [texte, setTexte] = useState('');
  const [open, setOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (open) {
      api.get(`/tasks/${taskId}/comments`).then((res) => setComments(res.data));
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
      socketRef.current.on(`task_${taskId}_comment`, (newCmd: any) => setComments((prev) => [...prev, newCmd]));
    }
    return () => { socketRef.current?.disconnect(); };
  }, [open, taskId]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try {
      await api.post(`/tasks/${taskId}/comments`, { message: texte });
      setTexte('');
    } catch {}
  };

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <button onClick={() => setOpen(!open)} className="text-xs font-bold text-itec-sky hover:text-white transition flex items-center gap-1.5 uppercase tracking-wide">
        <MessageCircle size={14} /> Commentaires {open ? '▲' : '▼'} {!open && comments.length > 0 && `(${comments.length})`}
      </button>

      {open && (
        <div className="mt-3 space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {comments.length === 0 ? (
              <p className="text-[10px] text-white/40 italic">Aucun commentaire. Signalez un blocage ici.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-white/5 p-2.5 rounded-lg border border-white/5 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white/90">{c.user.nom}</span>
                    <span className="text-[9px] text-white/40">{new Date(c.creeLe).toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-white/70 mt-1">{c.message}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={envoyer} className="flex gap-2">
            <input type="text" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ajouter un commentaire..." className="glass-input flex-1 px-3 py-2 text-xs rounded-lg" />
            <button type="submit" className="bg-itec-sky text-[#0A2540] px-3 rounded-lg hover:bg-white transition flex items-center"><Send size={14}/></button>
          </form>
        </div>
      )}
    </div>
  );
}