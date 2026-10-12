'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { User } from '@/types';
import {
  MessageSquare, X, Send, Mic, Image as ImageIcon,
  Paperclip, Download, Edit2, Trash2, Copy, Forward, MoreVertical,
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getSocket } from '@/lib/socket';

interface Message {
  id: string; message: string; user: User; userId: string;
  isEdited?: boolean; isDeleted?: boolean; creeLe: string;
}

export default function ProjectChat({ projectId, currentUser }: { projectId: string; currentUser: User | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const scrollBottom = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

  useEffect(() => {
    if (!open || !projectId) return;

    api.get(`/projects/${projectId}/messages`).then((res) => {
      setMessages(res.data);
      scrollBottom();
    });

    const socket = getSocket();
    const onNew = (newMsg: Message) => {
      setMessages((prev) => { if (prev.some((m) => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      scrollBottom();
    };
    const onUpdate = (updated: Message) => setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

    socket.on(`project_${projectId}_message`, onNew);
    socket.on(`project_${projectId}_message_update`, onUpdate);

    return () => {
      socket.off(`project_${projectId}_message`, onNew);
      socket.off(`project_${projectId}_message_update`, onUpdate);
    };
  }, [open, projectId]);

  useEffect(() => {
    if (forwardMessage) api.get('/projects').then((res) => setMyProjects(res.data.filter((p: any) => p.statut !== 'archive')));
  }, [forwardMessage]);

  const envoyerTexte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try {
      if (editingMsgId) {
        await api.patch(`/projects/messages/${editingMsgId}`, { message: texte });
        setEditingMsgId(null);
      } else {
        await api.post(`/projects/${projectId}/messages`, { message: texte });
      }
      setTexte('');
    } catch { alert('Erreur'); }
  };

  const handleEdit = (msg: Message) => {
    if (msg.isDeleted || msg.message.startsWith('[')) return alert('Modification impossible');
    setEditingMsgId(msg.id); setTexte(msg.message); setMenuMsgId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try { await api.delete(`/projects/messages/${id}`); setMenuMsgId(null); } catch { alert('Erreur'); }
  };

  const handleCopy = async (msg: Message) => {
    let text = msg.message;
    if (text.startsWith('[TRANSFERT]')) text = text.replace('[TRANSFERT]', '').trim();
    if (text.startsWith('[FILE]')) text = text.replace('[FILE]', '').split('|')[1] || 'Fichier';
    if (text.startsWith('[IMAGE]') || text.startsWith('[AUDIO]')) text = text.replace(/^\[(IMAGE|AUDIO)\]/, '').trim();
    await navigator.clipboard.writeText(text);
    setMenuMsgId(null); alert('Copié !');
  };

  const handleForward = async (targetType: 'project' | 'channel', targetId: string, label: string) => {
    if (!forwardMessage) return;
    try {
      await api.post('/messages/forward', { message: forwardMessage.message, targetType, targetId });
      setForwardMessage(null); alert(`Transféré vers ${label}`);
    } catch { alert('Erreur'); }
  };

  const handleStopRecording = async () => { const audioFile = await stopRecording(); if (audioFile) handleFileUpload(audioFile, '[AUDIO]'); };

  const handleFileUpload = async (file: File, tag: '[AUDIO]' | '[IMAGE]' | '[FILE]') => {
    if (file.size > 10 * 1024 * 1024) return alert('Max 10 Mo');
    setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const uploadRes = await api.post('/files/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fileUrl = uploadRes.data.url;
      const payload = tag === '[FILE]' ? `${tag}${fileUrl}|${file.name}` : `${tag}${fileUrl}`;
      await api.post(`/projects/${projectId}/messages`, { message: payload });
    } catch { alert("Erreur d'envoi"); } finally { setUploading(false); }
  };

  const parseMessage = (msg: string) => {
    const token = Cookies.get('token');
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    if (msg.startsWith('[TRANSFERT]')) return (
      <div className="space-y-1"><div className="text-[10px] uppercase opacity-70 border-l-2 border-white/40 pl-2">Transféré</div><div>{parseMessage(msg.replace('[TRANSFERT]', '').trim())}</div></div>
    );
    if (msg.startsWith('[AUDIO]')) return <audio controls src={`${baseURL}${msg.replace('[AUDIO]', '')}?token=${token}`} className="w-48 h-10 rounded-lg" />;
    if (msg.startsWith('[IMAGE]')) {
      const src = `${baseURL}${msg.replace('[IMAGE]', '')}?token=${token}`;
      return <img src={src} alt="Img" className="max-w-[200px] rounded-lg cursor-pointer" onClick={() => window.open(src, '_blank')} />;
    }
    if (msg.startsWith('[FILE]')) {
      const [pathUrl, fileName] = msg.replace('[FILE]', '').split('|');
      return (
        <a href={`${baseURL}${pathUrl}?token=${token}`} download={fileName} target="_blank" className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl">
          <Download size={16} /> <span className="text-xs font-bold truncate max-w-[120px]">{fileName || 'Document'}</span>
        </a>
      );
    }
    return <span className="whitespace-pre-wrap">{msg}</span>;
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {!open && (
        <button onClick={() => setOpen(true)} className="bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_20px_rgba(79,195,247,0.4)]">
          <MessageSquare size={24} />
        </button>
      )}

      {open && (
        // 🔴 FOND SOLIDE (#0A2540) ET LARGEUR ADAPTÉE MOBILE
        <div className="w-[calc(100vw-2rem)] sm:w-[400px] h-[500px] sm:h-[560px] flex flex-col rounded-2xl overflow-hidden bg-[#0A2540] border border-white/20 shadow-2xl">
          <div className="bg-black/30 p-3 flex justify-between items-center border-b border-white/10">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm"><MessageSquare size={16} /> Chat Équipe</h3>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {messages.map((m) => {
              const isMe = m.userId === currentUser?.id;
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-[10px] font-bold ${isMe ? 'text-itec-sky' : 'text-white'}`}>{isMe ? 'Vous' : m.user?.nom}</span>
                    <span className="text-[9px] text-white/40">{new Date(m.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {m.isEdited && !m.isDeleted && <span className="text-[9px] text-white/30 italic">modifié</span>}
                  </div>

                  <div className="relative flex items-end gap-1 max-w-[90%]">
                    {/* MENU POINTS (⋯) */}
                    <button onClick={() => setMenuMsgId(menuMsgId === m.id ? null : m.id)} className={`p-1 text-white/40 hover:text-white ${isMe ? 'order-first' : 'order-last'}`}>
                      <MoreVertical size={14} />
                    </button>

                    <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm break-words ${m.isDeleted ? 'bg-white/5 text-white/40 italic' : isMe ? 'bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm border border-white/5'}`}>
                      {parseMessage(m.message)}
                    </div>

                    {/* ACTIONS SUR LE MESSAGE */}
                    {menuMsgId === m.id && (
                      <div className={`absolute z-30 top-0 ${isMe ? 'right-6' : 'left-6'} bg-[#0A2540] border border-white/20 p-1.5 min-w-[120px] rounded-lg shadow-xl`}>
                        {/* 🔴 CONDITION : ON CACHE SI MESSAGE SUPPRIMÉ */}
                        {!m.isDeleted && (
                          <>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleCopy(m)}><Copy size={12} /> Copier</button>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-white/10 rounded" onClick={() => { setForwardMessage(m); setMenuMsgId(null); }}><Forward size={12} /> Transférer</button>
                            {isMe && !m.message.startsWith('[') && (
                              <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleEdit(m)}><Edit2 size={12} /> Modifier</button>
                            )}
                          </>
                        )}
                        {/* SUPPRIMER RESTE VISIBLE POUR LE PROPRIETAIRE */}
                        {isMe && !m.isDeleted && (
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded" onClick={() => handleDelete(m.id)}><Trash2 size={12} /> Supprimer</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={envoyerTexte} className="p-2 bg-black/30 border-t border-white/10 space-y-2">
            <div className="flex gap-2 items-center px-1">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 bg-white/5 text-itec-sky rounded-lg"><ImageIcon size={16} /></button>

              <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/5 text-itec-sky rounded-lg"><Paperclip size={16} /></button>
              
              <div className="flex-1" />

              <button type="button" onMouseDown={startRecording} onMouseUp={handleStopRecording} onTouchStart={startRecording} onTouchEnd={handleStopRecording} className={`p-2 rounded-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-itec-sky'}`}><Mic size={16} /></button>
            </div>

            <div className="flex gap-2">
              <input type="text" value={texte} onChange={(e) => setTexte(e.target.value)} disabled={!!editingMsgId && uploading} placeholder={editingMsgId ? "Modifier..." : "Votre message..."} className="w-full bg-white/10 px-3 py-2 rounded-lg text-sm text-white outline-none focus:border-itec-sky border border-transparent" />
              <button type="submit" disabled={isRecording || uploading || !texte.trim()} className="bg-itec-sky text-[#0A2540] rounded-lg w-10 h-10 flex items-center justify-center shrink-0"><Send size={16} /></button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Transfert (inchangée) */}
      {forwardMessage && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="glass-card bg-[#0A2540] w-full max-w-sm p-5 space-y-3 border border-white/20">
            <h3 className="font-bold text-white text-sm">Transférer vers…</h3>
            <button
              className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white"
              onClick={() =>
                handleForward('channel', 'global', '#Général')
              }
            >
              🌍 Chat Général
            </button>
            {myProjects.map((p) => (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white"
                onClick={() => handleForward('project', p.id, p.nom)}
              >
                📁 {p.nom}
              </button>
            ))}
            <button
              onClick={() => setForwardMessage(null)}
              className="w-full py-2 text-white/50 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}