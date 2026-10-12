'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { User } from '@/types';
import { MessageSquare, X, Send, Mic, Image as ImageIcon, Paperclip, Download } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface Message { 
  id: string; 
  message: string; 
  user: User; 
  userId: string; 
  creeLe: string; 
}

export default function ProjectChat({ projectId, currentUser }: { projectId: string; currentUser: User | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState('');
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      api.get(`/projects/${projectId}/messages`).then((res) => {
        setMessages(res.data);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
      socketRef.current.on(`project_${projectId}_message`, (newMsg: Message) => {
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
    }
    return () => { socketRef.current?.disconnect(); };
  }, [open, projectId]);

  const envoyerTexte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try {
      await api.post(`/projects/${projectId}/messages`, { message: texte });
      setTexte('');
    } catch {}
  };

  const handleStopRecording = async () => {
    const audioFile = await stopRecording();
    if (!audioFile) return;
    handleFileUpload(audioFile, '[AUDIO]');
  };

  const handleFileUpload = async (file: File, tag: '[AUDIO]' | '[IMAGE]' | '[FILE]') => {
    if (file.size > 10 * 1024 * 1024) return alert('Fichier trop lourd (10Mo max)');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await api.post('/files/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = uploadRes.data.url;

      // On attache le nom original pour les fichiers classiques
      const payloadMessage = tag === '[FILE]' 
        ? `${tag}${fileUrl}|${file.name}` 
        : `${tag}${fileUrl}`;

      await api.post(`/projects/${projectId}/messages`, { message: payloadMessage });
    } catch (err) {
      alert("Erreur d'envoi du fichier");
    } finally {
      setUploading(false);
    }
  };

  const parseMessage = (msg: string) => {
    const token = Cookies.get('token');
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    if (msg.startsWith('[AUDIO]')) {
      const pathUrl = msg.replace('[AUDIO]', '');
      return <audio controls src={`${baseURL}${pathUrl}?token=${token}`} className="w-48 sm:w-64 h-10 rounded-lg outline-none" />;
    }

    if (msg.startsWith('[IMAGE]')) {
      const pathUrl = msg.replace('[IMAGE]', '');
      return <img src={`${baseURL}${pathUrl}?token=${token}`} alt="Image envoyée" className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition shadow-sm" onClick={() => window.open(`${baseURL}${pathUrl}?token=${token}`, '_blank')} />;
    }

    if (msg.startsWith('[FILE]')) {
      const content = msg.replace('[FILE]', '');
      const [pathUrl, fileName] = content.split('|');
      return (
        <a href={`${baseURL}${pathUrl}?token=${token}`} download={fileName} target="_blank" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition shadow-sm">
          <Download size={18}/>
          <span className="text-sm font-bold truncate max-w-[150px]">{fileName || 'Document'}</span>
        </a>
      );
    }

    return <span>{msg}</span>;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open && (
        <button onClick={() => setOpen(true)} className="bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_20px_rgba(79,195,247,0.4)] transition-transform transform hover:scale-110">
          <MessageSquare size={24} />
        </button>
      )}

      {open && (
        <div className="glass-card w-[350px] sm:w-[400px] h-[550px] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-[#0A2540]/95 border border-white/20">
          <div className="bg-white/10 text-white p-4 flex justify-between items-center border-b border-white/10">
            <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> Chat Équipe</h3>
            <button onClick={() => setOpen(false)} className="hover:text-itec-sky text-white/70 transition"><X size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-white/40 mt-10">Aucun message pour l'instant.</p>
            ) : (
              messages.map((m) => {
                const isMe = m.userId === currentUser?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-white/40 mb-1 px-1">{isMe ? 'Vous' : m.user.nom}</span>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm break-words ${isMe ? 'bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm border border-white/5'}`}>
                      {parseMessage(m.message)}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={envoyerTexte} className="p-3 bg-black/20 border-t border-white/10 flex flex-col gap-2 relative">
            {/* Boutons d'action rapides (Images, Fichiers, Micro) */}
            <div className="flex gap-2 items-center px-1">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2 bg-white/5 hover:bg-white/10 text-itec-sky rounded-full transition disabled:opacity-50" title="Envoyer une image">
                <ImageIcon size={18}/>
              </button>

              <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 bg-white/5 hover:bg-white/10 text-itec-sky rounded-full transition disabled:opacity-50" title="Envoyer un fichier">
                <Paperclip size={18}/>
              </button>

              <div className="flex-1"></div>

              <button type="button" onMouseDown={startRecording} onMouseUp={handleStopRecording} onTouchStart={startRecording} onTouchEnd={handleStopRecording} disabled={uploading} className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-itec-sky hover:bg-white/10'}`} title="Maintenir pour envoyer un vocal">
                <Mic size={18}/>
              </button>
            </div>

            {/* Zone de texte et envoi */}
            <div className="flex gap-2">
              <input type="text" value={texte} onChange={(e) => setTexte(e.target.value)} disabled={isRecording || uploading} placeholder={uploading ? "Envoi du fichier..." : "Votre message..."} className="glass-input flex-1 px-4 py-2 rounded-full text-sm disabled:opacity-50" />
              <button type="submit" disabled={isRecording || uploading || !texte.trim()} className="bg-itec-sky text-[#0A2540] rounded-full w-10 h-10 flex items-center justify-center hover:bg-white transition disabled:opacity-50"><Send size={18}/></button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}