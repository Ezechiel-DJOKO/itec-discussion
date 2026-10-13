'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { User } from '@/types';
import {
  MessageSquare, X, Send, Mic, Image as ImageIcon,
  Paperclip, Download, Edit2, Trash2, Copy, Forward, ChevronDown, Trash
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
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Chrono vocal
  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const [chrono, setChrono] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Chronomètre
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      setChrono(0);
      interval = setInterval(() => setChrono(p => p + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatChrono = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (!open || !projectId) return;
    api.get(`/projects/${projectId}/messages`).then((res) => {
      setMessages(res.data);
      setTimeout(scrollBottom, 100);
    });

    const socket = getSocket();
    const onNew = (newMsg: Message) => {
      setMessages((prev) => { if (prev.some((m) => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      setTimeout(scrollBottom, 100);
    };
    const onUpdate = (updated: Message) => setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

    socket.on(`project_${projectId}_message`, onNew);
    socket.on(`project_${projectId}_message_update`, onUpdate);

    return () => {
      socket.off(`project_${projectId}_message`, onNew);
      socket.off(`project_${projectId}_message_update`, onUpdate);
    };
  }, [open, projectId]);

  const handleScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollBtn(scrollHeight - scrollTop > clientHeight + 150);
  };

  // APPUI LONG (WhatsApp style)
  const handlePressStart = (id: string) => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50); // Vibration mobile
      setMenuMsgId(id);
    }, 500); // 500ms
  };
  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

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

  const handleStopRecording = async () => { 
    const audioFile = await stopRecording(); 
    if (audioFile) handleFileUpload(audioFile, '[AUDIO]'); 
  };

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
    const resolveUrl = (pathUrl: string) => (pathUrl.startsWith('http') ? pathUrl : `${baseURL}${pathUrl}?token=${token}`);

    if (msg.startsWith('[TRANSFERT]')) return (
      <div className="space-y-0.5"><div className="text-[9px] uppercase opacity-70 border-l-2 border-white/40 pl-1.5">Transféré</div><div>{parseMessage(msg.replace('[TRANSFERT]', '').trim())}</div></div>
    );
    // onPlay stopPropagtion empéche le bug du scroll audio
    if (msg.startsWith('[AUDIO]')) return <audio controls src={resolveUrl(msg.replace('[AUDIO]', ''))} className="w-48 h-8 rounded outline-none" onPlay={(e) => e.stopPropagation()} />;
    if (msg.startsWith('[IMAGE]')) return <img src={resolveUrl(msg.replace('[IMAGE]', ''))} alt="Img" className="max-w-[200px] rounded cursor-pointer" onClick={() => window.open(resolveUrl(msg.replace('[IMAGE]', '')), '_blank')} />;
    if (msg.startsWith('[FILE]')) {
      const [pathUrl, fileName] = msg.replace('[FILE]', '').split('|');
      return (
        <a href={resolveUrl(pathUrl)} download={fileName} target="_blank" className="flex items-center gap-1.5 bg-white/20 px-2 py-1.5 rounded-lg text-white">
          <Download size={14} /> <span className="text-xs font-bold truncate max-w-[120px]">{fileName || 'Document'}</span>
        </a>
      );
    }
    return <span className="whitespace-pre-wrap">{msg}</span>;
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60]">
      {!open && (
        <button onClick={() => setOpen(true)} className="bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-110">
          <MessageSquare size={24} />
        </button>
      )}

      {open && (
        <div className="w-[calc(100vw-2rem)] sm:w-[360px] h-[75vh] sm:h-[500px] flex flex-col rounded-2xl overflow-hidden bg-[#0A2540] border border-white/20 shadow-2xl">
          <div className="bg-[#0A2540] p-3 flex justify-between items-center border-b border-white/10 z-10">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm"><MessageSquare size={16} /> Chat Équipe</h3>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
          </div>

          {/* ZONE MESSAGES */}
          <div ref={chatBoxRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-2 relative bg-[#07192f] bg-[url('/bg-pattern.png')] bg-opacity-10">
            {messages.map((m) => {
              const isMe = m.userId === currentUser?.id;
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[9px] font-bold text-itec-sky mb-0.5 px-1">{m.user?.nom}</span>}
                  
                  <div className="relative flex items-end gap-1 max-w-[90%]">
                    {/* APPUI LONG SUR LA BULLE */}
                    <div 
                      onTouchStart={() => handlePressStart(m.id)} onTouchEnd={handlePressEnd} onTouchMove={handlePressEnd}
                      onMouseDown={() => handlePressStart(m.id)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                      className={`px-3 py-1.5 rounded-2xl text-[13px] break-words shadow-sm transition-all select-none ${m.isDeleted ? 'bg-white/5 text-white/40 italic' : isMe ? 'bg-[#005c4b] text-white rounded-tr-sm' : 'bg-[#202c33] text-white rounded-tl-sm'}`}
                    >
                      {parseMessage(m.message)}
                      
                      {/* L'heure DANS la bulle en bas à droite (vrai style WhatsApp) */}
                      <div className="text-[9px] text-white/50 text-right mt-0.5 flex justify-end items-center gap-1">
                        {m.isEdited && !m.isDeleted && <span className="italic">modifié</span>}
                        {new Date(m.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* MENU ACTIONS (Ouvrable avec l'appui long) */}
                    {menuMsgId === m.id && (
                      <div className={`absolute z-30 top-6 ${isMe ? 'right-0' : 'left-0'} bg-[#233138] border border-white/10 p-1 min-w-[140px] rounded-lg shadow-xl`}>
                        {!m.isDeleted && (
                          <>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleCopy(m)}><Copy size={14} /> Copier</button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded" onClick={() => { setForwardMessage(m); setMenuMsgId(null); api.get('/projects').then(res=>setMyProjects(res.data)); }}><Forward size={14} /> Transférer</button>
                            {isMe && !m.message.startsWith('[') && (
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleEdit(m)}><Edit2 size={14} /> Modifier</button>
                            )}
                          </>
                        )}
                        {isMe && !m.isDeleted && (
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded" onClick={() => handleDelete(m.id)}><Trash2 size={14} /> Supprimer</button>
                        )}
                        <button className="w-full text-center py-1 mt-1 text-[10px] text-white/30 border-t border-white/5" onClick={() => setMenuMsgId(null)}>Fermer</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* BOUTON SCROLL BOTTOM */}
          {showScrollBtn && (
            <button onClick={scrollBottom} className="absolute bottom-16 right-4 bg-[#202c33] text-white p-2 rounded-full shadow-lg border border-white/10 opacity-90 hover:opacity-100 transition z-20">
              <ChevronDown size={20} />
            </button>
          )}

          {/* ZONE DE TEXTE COMPACTE */}
          <form onSubmit={envoyerTexte} className="p-2 bg-[#0A2540] border-t border-white/5 flex gap-1 items-end relative">
            
            {editingMsgId && (
              <div className="absolute -top-8 left-0 right-0 bg-[#202c33] px-3 py-1.5 flex justify-between items-center text-xs text-itec-sky border-t border-white/10">
                <span>Modification...</span>
                <button type="button" onClick={() => { setEditingMsgId(null); setTexte(''); }}><X size={14}/></button>
              </div>
            )}

            {isRecording ? (
              // 🔴 INTERFACE D'ENREGISTREMENT VOCAL
              <div className="flex-1 bg-[#202c33] rounded-full px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400 animate-pulse">
                  <Mic size={16} /> <span className="text-sm font-mono">{formatChrono(chrono)}</span>
                </div>
                <button type="button" onClick={cancelRecording} className="text-white/40 hover:text-red-400 p-1"><Trash size={16}/></button>
              </div>
            ) : (
              <div className="flex-1 bg-[#202c33] rounded-3xl px-2 py-1 flex items-end min-h-[40px]">
                {/* Icônes masquées si on tape du texte */}
                {!texte && (
                  <div className="flex items-center pb-1">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2 text-white/50 hover:text-white"><ImageIcon size={18} /></button>
                    
                    <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-white/50 hover:text-white"><Paperclip size={18} /></button>
                  </div>
                )}

                <input type="text" value={texte} onChange={(e) => setTexte(e.target.value)} disabled={uploading} placeholder={uploading ? "Envoi..." : "Message"} className="flex-1 bg-transparent px-2 py-2 text-[14px] text-white outline-none w-full placeholder-white/40" />
              </div>
            )}

            {/* BOUTON D'ACTION (Micro ou Envoi) */}
            <div className="shrink-0 mb-0.5 ml-1">
              {texte || isRecording ? (
                <button type="button" onClick={isRecording ? handleStopRecording : envoyerTexte} disabled={uploading} className="bg-[#00a884] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                  <Send size={18} className="ml-1" />
                </button>
              ) : (
                <button type="button" onClick={startRecording} disabled={uploading} className="bg-[#00a884] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:scale-105 transition">
                  <Mic size={20} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Modal Transfert (inchangée) */}
      {forwardMessage && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-[#202c33] w-full max-w-xs p-4 rounded-xl space-y-2 border border-white/10 shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-2">Transférer à...</h3>
            <button className="w-full text-left px-3 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white" onClick={() => handleForward('channel', 'global', '#Général')}>🌍 Chat Général</button>
            {myProjects.map((p) => (
              <button key={p.id} className="w-full text-left px-3 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white" onClick={() => handleForward('project', p.id, p.nom)}>📁 {p.nom}</button>
            ))}
            <button onClick={() => setForwardMessage(null)} className="w-full py-3 text-white/50 text-sm mt-2">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}