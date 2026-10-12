'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { Globe, Lock, Send, Image as ImageIcon, Paperclip, Mic, Download } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

type ChannelType = 'global' | 'responsables';

interface ChatMessage {
  id: string; message: string; user: { id: string; nom: string; isSuperAdmin?: boolean }; userId: string; creeLe: string;
}

export default function GlobalChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeChannel, setActiveChannel] = useState<ChannelType>('global');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [texte, setTexte] = useState('');
  const [loading, setLoading] = useState(true);
  const [isResponsable, setIsResponsable] = useState(false);
  const [erreur, setErreur] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      api.get('/projects').then((res) => {
        const isChef = res.data.some((p: any) => p.membres.some((m: any) => m.userId === user.id && m.role === 'chef'));
        setIsResponsable(user.isSuperAdmin || isChef);
      });
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true); setErreur('');
    api.get(`/channels/${activeChannel}/messages`)
      .then((res) => { setMessages(res.data); setTimeout(() => endRef.current?.scrollIntoView(), 100); })
      .catch((err) => setErreur(err.response?.data?.message || 'Accès refusé'))
      .finally(() => setLoading(false));

    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    socketRef.current.on(`channel_${activeChannel}_message`, (newMsg: ChatMessage) => {
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => { socketRef.current?.disconnect(); };
  }, [activeChannel, authLoading]);

  const envoyerTexte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try { await api.post(`/channels/${activeChannel}/messages`, { message: texte }); setTexte(''); } catch {}
  };

  const handleStopRecording = async () => {
    const audioFile = await stopRecording();
    if (!audioFile) return;
    handleFileUpload(audioFile, '[AUDIO]');
  };

  const handleFileUpload = async (file: File, tag: '[AUDIO]' | '[IMAGE]' | '[FILE]') => {
    if (file.size > 10 * 1024 * 1024) return alert('Fichier trop lourd (10Mo max)');
    setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const uploadRes = await api.post('/files/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fileUrl = uploadRes.data.url;
      const payloadMessage = tag === '[FILE]' ? `${tag}${fileUrl}|${file.name}` : `${tag}${fileUrl}`;
      await api.post(`/channels/${activeChannel}/messages`, { message: payloadMessage });
    } catch { alert("Erreur d'envoi"); } finally { setUploading(false); }
  };

  const parseMessage = (msg: string) => {
    const token = Cookies.get('token');
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    if (msg.startsWith('[AUDIO]')) {
      return <audio controls src={`${baseURL}${msg.replace('[AUDIO]', '')}?token=${token}`} className="w-48 sm:w-64 h-10 rounded-lg" />;
    }
    if (msg.startsWith('[IMAGE]')) {
      const pathUrl = msg.replace('[IMAGE]', '');
      return <img src={`${baseURL}${pathUrl}?token=${token}`} alt="Image envoyée" className="max-w-xs max-h-64 rounded-lg cursor-pointer shadow-sm hover:opacity-90" onClick={() => window.open(`${baseURL}${pathUrl}?token=${token}`, '_blank')} />;
    }
    if (msg.startsWith('[FILE]')) {
      const [pathUrl, fileName] = msg.replace('[FILE]', '').split('|');
      return (
        <a href={`${baseURL}${pathUrl}?token=${token}`} download={fileName} target="_blank" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition shadow-sm">
          <Download size={18}/> <span className="text-sm font-bold truncate max-w-[200px]">{fileName || 'Document'}</span>
        </a>
      );
    }
    return <span>{msg}</span>;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex gap-3 mb-6">
          <button onClick={() => setActiveChannel('global')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition ${activeChannel === 'global' ? 'bg-itec-sky text-[#0A2540] shadow-[0_0_15px_rgba(79,195,247,0.3)]' : 'glass-card text-white/50 hover:text-white hover:bg-white/10 border-transparent'}`}>
            <Globe size={18}/> Général (Tous)
          </button>

          {isResponsable && (
            <button onClick={() => setActiveChannel('responsables')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition ${activeChannel === 'responsables' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'glass-card text-white/50 hover:text-white hover:bg-white/10 border-transparent'}`}>
              <Lock size={18}/> QG Responsables
            </button>
          )}
        </div>

        <div className="flex-1 glass-card flex flex-col overflow-hidden relative">
          <div className="flex-1 p-6 overflow-y-auto z-10 space-y-6">
            {loading ? <p className="text-center text-white/40 mt-10">Chargement...</p> : erreur ? <p className="text-center text-red-400 mt-10 font-bold bg-red-500/10 p-4 rounded-xl inline-block mx-auto">⚠️ {erreur}</p> : messages.length === 0 ? <p className="text-center text-white/40 mt-10 italic">Aucun message dans ce salon.</p> : (
              messages.map((m) => {
                const isMe = m.userId === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1.5 px-1">
                      <span className={`text-xs font-bold ${isMe ? 'text-itec-sky' : 'text-white/80'}`}>{isMe ? 'Vous' : m.user.nom}</span>
                      <span className="text-[10px] text-white/30">{new Date(m.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`px-5 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm break-words ${isMe ? 'bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-br-sm' : 'bg-white/10 border border-white/5 text-white/90 rounded-bl-sm'}`}>
                      {parseMessage(m.message)}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={envoyerTexte} className="p-4 bg-black/20 border-t border-white/10 flex flex-col gap-3 z-10">
            <div className="flex gap-3 items-center">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2.5 bg-white/5 hover:bg-white/10 text-itec-sky rounded-xl transition"><ImageIcon size={20}/></button>

              <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 bg-white/5 hover:bg-white/10 text-itec-sky rounded-xl transition"><Paperclip size={20}/></button>

              <div className="flex-1"></div>

              <button type="button" onMouseDown={startRecording} onMouseUp={handleStopRecording} onTouchStart={startRecording} onTouchEnd={handleStopRecording} disabled={uploading} className={`p-2.5 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-itec-sky hover:bg-white/10'}`}><Mic size={20}/></button>
            </div>

            <div className="flex gap-3">
              <input type="text" value={texte} onChange={(e) => setTexte(e.target.value)} disabled={isRecording || uploading} placeholder={uploading ? "Envoi du fichier..." : `Écrire dans #${activeChannel}...`} className="glass-input flex-1 px-5 py-3 rounded-xl text-sm" />
              <button type="submit" disabled={isRecording || uploading || !texte.trim()} className="bg-itec-sky hover:bg-white text-[#0A2540] rounded-xl px-6 font-black transition disabled:opacity-50 flex items-center gap-2"><Send size={18}/> Envoyer</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}