'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { Globe, Lock, Send, Image as ImageIcon, Paperclip, Mic, Download, Copy, Forward, Edit2, Trash2, Reply, ChevronDown, Trash, X } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getSocket } from '@/lib/socket';

type ChannelType = 'global' | 'responsables';

interface ChatMessage {
  id: string; message: string; user: { id: string; nom: string; isSuperAdmin?: boolean }; userId: string;
  isEdited?: boolean; isDeleted?: boolean; creeLe: string;
  replyTo?: { id: string; nom: string; preview: string } | null;
}

export default function GlobalChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeChannel, setActiveChannel] = useState<ChannelType>('global');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [texte, setTexte] = useState('');
  const [loading, setLoading] = useState(true);
  const [isResponsable, setIsResponsable] = useState(false);
  const [erreur, setErreur] = useState('');
  
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<ChatMessage | null>(null);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const [chrono, setChrono] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollBottom = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  useEffect(() => {
    let interval: any;
    if (isRecording) { setChrono(0); interval = setInterval(() => setChrono(p => p + 1), 1000); } 
    else { clearInterval(interval); }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatChrono = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    if (!user) return;
    api.get('/projects').then((res) => {
      const isChef = res.data.some((p: any) => p.membres?.some((m: any) => m.userId === user.id && m.role === 'chef'));
      setIsResponsable(!!user.isSuperAdmin || isChef);
      setMyProjects(res.data.filter((p: any) => p.statut !== 'archive'));
    });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true); setErreur('');
    api.get(`/channels/${activeChannel}/messages`).then((res) => { setMessages(res.data); setTimeout(scrollBottom, 100); })
      .catch((err) => setErreur(err.response?.data?.message || 'Accès refusé')).finally(() => setLoading(false));

    const socket = getSocket();
    const onNew = (newMsg: ChatMessage) => {
      setMessages((prev) => { if (prev.some((m) => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      setTimeout(scrollBottom, 100);
    };
    const onUpdate = (updated: ChatMessage) => setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

    socket.on(`channel_${activeChannel}_message`, onNew);
    socket.on(`channel_${activeChannel}_message_update`, onUpdate);

    return () => { socket.off(`channel_${activeChannel}_message`, onNew); socket.off(`channel_${activeChannel}_message_update`, onUpdate); };
  }, [activeChannel, authLoading]);

  const handleScroll = (e: any) => setShowScrollBtn(e.target.scrollHeight - e.target.scrollTop > e.target.clientHeight + 150);

  const handlePressStart = (id: string) => { pressTimer.current = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(50); setMenuMsgId(id); }, 400); };
  const handlePressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  const envoyerTexte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try {
      if (editingMsgId) {
        await api.patch(`/channels/messages/${editingMsgId}`, { message: texte });
        setEditingMsgId(null);
      } else {
        await api.post(`/channels/${activeChannel}/messages`, { message: texte, replyToId: replyToMsg?.id });
        setReplyToMsg(null);
      }
      setTexte('');
    } catch { alert('Erreur'); }
  };

  const handleEdit = (msg: ChatMessage) => {
    if (msg.isDeleted || msg.message.startsWith('[')) return alert('Modification impossible');
    setEditingMsgId(msg.id); setTexte(msg.message); setMenuMsgId(null); setReplyToMsg(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try { await api.delete(`/channels/messages/${id}`); setMenuMsgId(null); } catch { alert('Erreur'); }
  };

  const handleCopy = async (msg: ChatMessage) => {
    let text = msg.message;
    if (text.startsWith('[TRANSFERT]')) text = text.replace('[TRANSFERT]', '').trim();
    if (text.startsWith('[FILE]')) text = text.replace('[FILE]', '').split('|')[1] || 'Fichier';
    if (text.startsWith('[IMAGE]') || text.startsWith('[AUDIO]')) text = text.replace(/^\[(IMAGE|AUDIO)\]/, '').trim();
    await navigator.clipboard.writeText(text); setMenuMsgId(null); alert('Copié');
  };

  const handleForward = async (targetType: 'project' | 'channel', targetId: string, label: string) => {
    if (!forwardMessage) return;
    try {
      await api.post('/messages/forward', { message: forwardMessage.message, targetType, targetId });
      setForwardMessage(null); alert(`Transféré vers ${label}`);
    } catch { alert('Erreur transfert'); }
  };

  const handleStopRecording = async () => { const f = await stopRecording(); if (f) handleFileUpload(f, '[AUDIO]'); };

  const handleFileUpload = async (file: File, tag: '[AUDIO]' | '[IMAGE]' | '[FILE]') => {
    if (file.size > 10 * 1024 * 1024) return alert('Max 10 Mo');
    setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const uploadRes = await api.post('/files/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fileUrl = uploadRes.data.url;
      const payload = tag === '[FILE]' ? `${tag}${fileUrl}|${file.name}` : `${tag}${fileUrl}`;
      await api.post(`/channels/${activeChannel}/messages`, { message: payload, replyToId: replyToMsg?.id });
      setReplyToMsg(null);
    } catch { alert("Erreur d'envoi"); } finally { setUploading(false); }
  };

  const parseMessage = (msg: string) => {
    const token = Cookies.get('token');
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const resolveUrl = (pathUrl: string) => (pathUrl.startsWith('http') ? pathUrl : `${baseURL}${pathUrl}?token=${token}`);

    if (msg.startsWith('[TRANSFERT]')) return (
      <div className="space-y-0.5"><div className="text-[9px] uppercase opacity-70 border-l-2 border-white/40 pl-1.5">Transféré</div><div>{parseMessage(msg.replace('[TRANSFERT]', '').trim())}</div></div>
    );
    if (msg.startsWith('[AUDIO]')) return <audio controls src={resolveUrl(msg.replace('[AUDIO]', ''))} className="w-48 sm:w-64 h-8 rounded outline-none" onPlay={(e) => e.stopPropagation()} />;
    if (msg.startsWith('[IMAGE]')) return <img src={resolveUrl(msg.replace('[IMAGE]', ''))} alt="img" className="max-w-[200px] sm:max-w-xs rounded cursor-pointer" onClick={() => window.open(resolveUrl(msg.replace('[IMAGE]', '')), '_blank')} />;
    if (msg.startsWith('[FILE]')) {
      const [pathUrl, fileName] = msg.replace('[FILE]', '').split('|');
      return (
        <a href={resolveUrl(pathUrl)} download={fileName} target="_blank" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-white border border-white/10 transition">
          <Download size={16} /> <span className="text-xs font-bold truncate max-w-[150px] sm:max-w-[200px]">{fileName || 'Document'}</span>
        </a>
      );
    }
    return <span className="whitespace-pre-wrap">{msg}</span>;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0A2540]"><div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A2540]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-3 flex flex-col h-[calc(100vh-60px)] relative">
        <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar shrink-0 z-10">
          <button onClick={() => setActiveChannel('global')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition whitespace-nowrap ${activeChannel === 'global' ? 'bg-itec-sky text-[#0A2540]' : 'bg-white/5 text-white/50 hover:text-white border border-white/10'}`}>
            <Globe size={16} /> Général
          </button>
          {isResponsable && (
            <button onClick={() => setActiveChannel('responsables')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition whitespace-nowrap ${activeChannel === 'responsables' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:text-white border border-white/10'}`}>
              <Lock size={16} /> Responsables
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-white/10 relative bg-[#07192f]">
          
          <div onScroll={handleScroll} className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 relative bg-[url('/bg-pattern.png')] bg-opacity-10">
            {loading ? <p className="text-center text-white/40 mt-10">Chargement…</p> : erreur ? <p className="text-center text-red-400 mt-10 font-bold">{erreur}</p> : messages.length === 0 ? <p className="text-center text-white/40 mt-10 italic">Aucun message.</p> : (
              messages.map((m) => {
                const isMe = m.userId === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-[10px] font-bold text-itec-sky mb-0.5 px-1">{m.user?.nom}</span>}

                    <div className="relative flex items-end gap-1 max-w-[90%] sm:max-w-[75%]">
                      <div 
                        onTouchStart={() => handlePressStart(m.id)} onTouchEnd={handlePressEnd} onTouchMove={handlePressEnd}
                        onMouseDown={() => handlePressStart(m.id)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                        className={`px-3 py-2 rounded-2xl text-[14px] break-words shadow-sm transition-all select-none ${m.isDeleted ? 'bg-white/5 text-white/40 italic border border-white/5' : isMe ? 'bg-gradient-to-r from-itec-sky to-blue-600 text-white rounded-br-sm' : 'bg-white/10 border border-white/5 text-white rounded-tl-sm'}`}
                      >
                        {m.replyTo && !m.isDeleted && (
                          <div className="mb-1.5 p-2 bg-black/20 border-l-4 border-white/50 rounded text-xs opacity-90">
                            <div className="font-bold text-white/90 mb-0.5">{m.replyTo.nom}</div>
                            <div className="truncate text-white/70">{m.replyTo.preview}</div>
                          </div>
                        )}

                        {parseMessage(m.message)}
                        
                        <div className="text-[9px] text-white/50 text-right mt-1 flex justify-end items-center gap-1">
                          {m.isEdited && !m.isDeleted && <span className="italic">modifié</span>}
                          {new Date(m.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {menuMsgId === m.id && (
                        <div className={`absolute z-30 top-6 ${isMe ? 'right-0' : 'left-0'} bg-[#233138] border border-white/10 p-1 min-w-[140px] rounded-lg shadow-xl`}>
                          {!m.isDeleted && (
                            <>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded" onClick={() => { setReplyToMsg(m); setMenuMsgId(null); }}><Reply size={14} /> Répondre</button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleCopy(m)}><Copy size={14} /> Copier</button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded" onClick={() => { setForwardMessage(m); setMenuMsgId(null); api.get('/projects').then(res=>setMyProjects(res.data)); }}><Forward size={14} /> Transférer</button>
                              {isMe && !m.message.startsWith('[') && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleEdit(m)}><Edit2 size={14} /> Modifier</button>}
                            </>
                          )}
                          {isMe && !m.isDeleted && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded" onClick={() => handleDelete(m.id)}><Trash2 size={14} /> Supprimer</button>}
                          <button className="w-full text-center py-1 mt-1 text-[10px] text-white/30 border-t border-white/5 uppercase font-bold" onClick={() => setMenuMsgId(null)}>Fermer</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {showScrollBtn && (
            <button onClick={scrollBottom} className="absolute bottom-24 right-4 bg-[#202c33] text-white p-2 rounded-full shadow-lg border border-white/10 opacity-90 hover:opacity-100 transition z-20">
              <ChevronDown size={20} />
            </button>
          )}

          <div className="bg-[#0A2540] border-t border-white/5 flex flex-col z-30">
            {(replyToMsg || editingMsgId) && (
              <div className="px-4 py-2 bg-black/20 flex justify-between items-center text-xs border-b border-white/5">
                <div className="flex-1 min-w-0 border-l-2 border-itec-sky pl-2">
                  <div className="text-itec-sky font-bold">{editingMsgId ? 'Modification' : `Réponse à ${replyToMsg?.user.nom}`}</div>
                  <div className="text-white/50 truncate">{editingMsgId ? 'Modifiez votre message' : replyToMsg?.message}</div>
                </div>
                <button type="button" onClick={() => { setReplyToMsg(null); setEditingMsgId(null); setTexte(''); }} className="text-white/40 hover:text-white p-1"><X size={16}/></button>
              </div>
            )}

            <form onSubmit={envoyerTexte} className="p-2 sm:p-3 flex gap-1.5 items-end">
              {isRecording ? (
                <div className="flex-1 bg-white/5 rounded-full px-4 py-2.5 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-2 text-red-400 animate-pulse">
                    <Mic size={16} /> <span className="text-sm font-mono font-bold">{formatChrono(chrono)}</span>
                  </div>
                  <button type="button" onClick={cancelRecording} className="text-white/40 hover:text-red-400 p-1 bg-white/5 rounded-full"><Trash size={14}/></button>
                </div>
              ) : (
                <div className="flex-1 bg-white/5 border border-white/5 rounded-3xl px-2 py-1 flex items-end min-h-[44px]">
                  {!texte && (
                    <div className="flex items-center pb-1 gap-1">
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
                      <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2 text-white/50 hover:text-itec-sky transition"><ImageIcon size={18} /></button>
                      
                      <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-white/50 hover:text-itec-sky transition"><Paperclip size={18} /></button>
                    </div>
                  )}
                  <input type="text" value={texte} onChange={(e) => setTexte(e.target.value)} disabled={uploading} placeholder={uploading ? "Envoi..." : "Message"} className="flex-1 bg-transparent px-2 py-2 text-[14px] text-white outline-none w-full placeholder-white/30" />
                </div>
              )}

              <div className="shrink-0 mb-0.5 ml-1">
                {texte || isRecording ? (
                  <button type="button" onClick={isRecording ? handleStopRecording : envoyerTexte} disabled={uploading} className="bg-itec-sky text-[#0A2540] rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition">
                    <Send size={18} className="ml-0.5" />
                  </button>
                ) : (
                  <button type="button" onClick={startRecording} disabled={uploading} className="bg-itec-sky text-[#0A2540] rounded-full w-11 h-11 flex items-center justify-center shadow-lg hover:scale-105 transition">
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Modal Transfert */}
      {forwardMessage && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-[#0A2540] w-full max-w-xs p-5 rounded-2xl space-y-3 border border-white/10 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Transférer à...</h3>
            <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-white transition font-medium" onClick={() => handleForward('channel', 'global', '#Général')}>🌍 Chat Général</button>
            {isResponsable && <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-white transition font-medium" onClick={() => handleForward('channel', 'responsables', 'QG Responsables')}>🔒 QG Responsables</button>}
            {myProjects.map((p) => (
              <button key={p.id} className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-white transition font-medium" onClick={() => handleForward('project', p.id, p.nom)}>📁 {p.nom}</button>
            ))}
            <button onClick={() => setForwardMessage(null)} className="w-full py-2 text-white/50 text-sm mt-2 uppercase font-bold text-[10px]">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}