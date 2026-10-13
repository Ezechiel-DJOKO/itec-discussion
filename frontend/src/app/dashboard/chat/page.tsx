'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { Globe, Lock, Send, Image as ImageIcon, Paperclip, Mic, Download, Copy, Forward, Edit2, Trash2, Reply, ChevronDown, Trash, Pin, MoreVertical, SmilePlus, X } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getSocket } from '@/lib/socket';

type ChannelType = 'global' | 'responsables';

interface ChatMessage {
  id: string; message: string; user: { id: string; nom: string; isSuperAdmin?: boolean }; userId: string;
  isEdited?: boolean; isDeleted?: boolean; isPinned?: boolean; creeLe: string;
  replyTo?: { id: string; nom: string; preview: string } | null;
  reactions?: Record<string, string[]>;
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
  const [reactionMenuId, setReactionMenuId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const [chrono, setChrono] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollBottom = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  const focusComposer = () => setTimeout(() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);

  const pinnedMsg = [...messages].reverse().find(m => m.isPinned && !m.isDeleted);

  useEffect(() => {
    let interval: any;
    if (isRecording) { setChrono(0); interval = setInterval(() => setChrono(p => p + 1), 1000); } 
    else { clearInterval(interval); }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatChrono = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

      useEffect(() => {
    if (!user) return;

    // Liste des projets (pour le transfert de messages uniquement)
    api.get('/projects').then((res) => {
      setMyProjects(
        res.data.filter((p: any) => p.statut !== 'archive'),
      );
    });

    // Tous les users (pour les mentions @)
    api.get('/users').then((res) => setAllUsers(res.data));

    // 🔴 QG : UNIQUEMENT Super Admin ou permission can_access_qg
    const canAccessQG =
      !!user.isSuperAdmin ||
      (Array.isArray(user.permissions) &&
        user.permissions.includes('can_access_qg'));

    setIsResponsable(canAccessQG);
  }, [user]);

    // Si plus le droit QG → forcer l'onglet Général
  useEffect(() => {
    if (!user) return;

    const canAccessQG =
      !!user.isSuperAdmin ||
      (Array.isArray(user.permissions) &&
        user.permissions.includes('can_access_qg'));

    if (!canAccessQG && activeChannel === 'responsables') {
      setActiveChannel('global');
    }
  }, [user, activeChannel]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true); setErreur('');

    api.get(`/channels/${activeChannel}/messages`).then((res) => {
      setMessages(res.data);
      setTimeout(scrollBottom, 100);
    }).catch((err) => setErreur(err.response?.data?.message || 'Accès refusé')).finally(() => setLoading(false));

    const socket = getSocket();
    const onNew = (newMsg: ChatMessage) => {
      setMessages((prev) => { if (prev.some((m) => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      scrollBottom();
    };
    const onUpdate = (updated: ChatMessage) => setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    const onTyping = ({ userName, isTyping }: { userName: string, isTyping: boolean }) => {
      if (userName === user?.nom) return;
      setTypingUsers(prev => {
        if (isTyping && !prev.includes(userName)) return [...prev, userName];
        if (!isTyping) return prev.filter(n => n !== userName);
        return prev;
      });
      scrollBottom();
    };

    socket.on(`channel_${activeChannel}_message`, onNew);
    socket.on(`channel_${activeChannel}_message_update`, onUpdate);
    socket.on(`channel_${activeChannel}_typing`, onTyping);

    return () => { 
      socket.off(`channel_${activeChannel}_message`, onNew); 
      socket.off(`channel_${activeChannel}_message_update`, onUpdate); 
      socket.off(`channel_${activeChannel}_typing`, onTyping);
    };
  }, [activeChannel, authLoading]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setShowScrollBtn(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight > 80);
  const handlePressStart = (id: string) => { pressTimer.current = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(50); setMenuMsgId(id); setReactionMenuId(null); }, 400); };
  const handlePressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTexte(val);

    const lastWord = val.split(' ').pop();
    if (lastWord?.startsWith('@')) {
      const search = lastWord.substring(1).toLowerCase();
      setFilteredMembers(allUsers.filter(u => u.nom.toLowerCase().includes(search)));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }

    const socket = getSocket();
    socket.emit('typing_start', { room: `channel_${activeChannel}`, userName: user?.nom });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { room: `channel_${activeChannel}`, userName: user?.nom });
    }, 2000);
  };

  const handleMentionClick = (nom: string) => {
    const parts = texte.split(' ');
    parts.pop(); 
    const newText = [...parts, `@${nom} `].join(' '); 
    setTexte(newText);
    setShowMentions(false);
    focusComposer();
  };

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
      setShowMentions(false);
      const socket = getSocket();
      socket.emit('typing_stop', { room: `channel_${activeChannel}`, userName: user?.nom });
    } catch { alert('Erreur'); }
  };

  const handleEdit = (msg: ChatMessage) => {
    if (msg.isDeleted || msg.message.startsWith('[')) return alert('Modification impossible');
    setEditingMsgId(msg.id); setTexte(msg.message); setMenuMsgId(null); setReplyToMsg(null); focusComposer();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try { await api.delete(`/channels/messages/${id}`); setMenuMsgId(null); } catch { alert('Erreur'); }
  };

  const handlePin = async (msg: ChatMessage) => {
    try { await api.patch(`/channels/messages/${msg.id}/pin`); setMenuMsgId(null); } catch { alert('Erreur'); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await api.post(`/channels/messages/${msgId}/react`, { emoji });
      setReactionMenuId(null);
    } catch { alert('Erreur de réaction'); }
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

  const getPreviewText = (msg: string) => {
    if (msg.startsWith('[AUDIO]')) return '🎤 Message vocal';
    if (msg.startsWith('[IMAGE]')) return '📷 Image';
    if (msg.startsWith('[FILE]')) return '📎 ' + (msg.split('|')[1] || 'Document');
    if (msg.startsWith('[TRANSFERT]')) return '🔄 Message transféré';
    return msg;
  };

  const renderTextWithMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? <span key={i} className="text-itec-sky font-bold bg-itec-sky/10 px-1 rounded">{part}</span> : <span key={i}>{part}</span>
    );
  };

  const parseMessage = (msg: string) => {
    const token = Cookies.get('token');
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const resolveUrl = (pathUrl: string) => pathUrl.startsWith('http') ? pathUrl : `${baseURL}${pathUrl}?token=${token}`;

    if (msg.startsWith('[TRANSFERT]')) return <div className="space-y-0.5"><div className="text-[9px] uppercase opacity-70 border-l-2 border-white/40 pl-1.5">Transféré</div><div>{parseMessage(msg.replace('[TRANSFERT]', '').trim())}</div></div>;
    if (msg.startsWith('[AUDIO]')) return <audio controls src={resolveUrl(msg.replace('[AUDIO]', ''))} className="w-48 sm:w-64 h-8 rounded outline-none" onPlay={(e) => e.stopPropagation()} />;
    if (msg.startsWith('[IMAGE]')) return <img src={resolveUrl(msg.replace('[IMAGE]', ''))} alt="Img" className="max-w-[200px] sm:max-w-xs rounded cursor-pointer" onClick={() => window.open(resolveUrl(msg.replace('[IMAGE]', '')), '_blank')} />;
    if (msg.startsWith('[FILE]')) {
      const [pathUrl, fileName] = msg.replace('[FILE]', '').split('|');
      return <a href={resolveUrl(pathUrl)} download={fileName} target="_blank" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-white border border-white/10 transition"><Download size={14} /> <span className="text-xs font-bold truncate max-w-[150px] sm:max-w-[200px]">{fileName || 'Document'}</span></a>;
    }
    return <span className="whitespace-pre-wrap">{renderTextWithMentions(msg)}</span>;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0A2540]"><div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A2540]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:py-6 flex flex-col h-[calc(100vh-60px)] relative">
        <div className="flex gap-2 sm:gap-3 mb-2 sm:mb-4 overflow-x-auto hide-scrollbar shrink-0 z-10">
          <button onClick={() => setActiveChannel('global')} className={`flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition whitespace-nowrap ${activeChannel === 'global' ? 'bg-itec-sky text-[#0A2540]' : 'bg-white/10 text-white/50 hover:text-white border border-transparent'}`}>
            <Globe size={16} /> Général
          </button>
          {isResponsable && (
            <button onClick={() => setActiveChannel('responsables')} className={`flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition whitespace-nowrap ${activeChannel === 'responsables' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/50 hover:text-white border border-transparent'}`}>
              <Lock size={16} /> QG Responsables
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden sm:rounded-2xl sm:border border-white/10 relative bg-[#07192f]">
          
          {pinnedMsg && (
            <div onClick={() => document.getElementById(`msg-${pinnedMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="bg-itec-sky/10 hover:bg-itec-sky/20 border-b border-itec-sky/20 px-4 py-2.5 flex items-center gap-3 cursor-pointer transition z-10 shadow-sm">
              <Pin size={16} className="text-itec-sky shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-itec-sky uppercase tracking-wider">Message Épinglé</div>
                <div className="text-xs text-white/80 truncate">{getPreviewText(pinnedMsg.message)}</div>
              </div>
            </div>
          )}

          <div onScroll={handleScroll} className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4 relative bg-[url('/bg-pattern.png')] bg-opacity-10">
            {loading ? <p className="text-center text-white/40 mt-10">Chargement…</p> : erreur ? <p className="text-center text-red-400 mt-10 font-bold">{erreur}</p> : messages.length === 0 ? <p className="text-center text-white/40 mt-10 italic">Aucun message.</p> : (
              messages.map((m) => {
                const isMe = m.userId === user?.id;
                const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;

                return (
                  <div key={m.id} id={`msg-${m.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-[10px] font-bold text-itec-sky mb-0.5 px-1">{m.user?.nom} {m.user?.isSuperAdmin && <span className="text-yellow-400">👑</span>}</span>}

                    <div className="relative flex items-center gap-1 max-w-[90%] sm:max-w-[75%]">
                      
                      {!m.isDeleted && (
                        <div className={`flex flex-col gap-1 ${isMe ? 'order-first mr-1' : 'order-last ml-1'}`}>
                          <button onClick={() => { setReactionMenuId(reactionMenuId === m.id ? null : m.id); setMenuMsgId(null); }} className="p-1 text-white/40 hover:text-white bg-black/20 rounded-full hover:bg-white/10 transition" title="Réagir"><SmilePlus size={14}/></button>
                          <button onClick={() => { setMenuMsgId(menuMsgId === m.id ? null : m.id); setReactionMenuId(null); }} className="p-1 text-white/40 hover:text-white bg-black/20 rounded-full hover:bg-white/10 transition" title="Plus"><MoreVertical size={14}/></button>
                        </div>
                      )}

                      <div className="flex flex-col">
                        <div 
                          onTouchStart={() => handlePressStart(m.id)} onTouchEnd={handlePressEnd} onTouchMove={handlePressEnd}
                          onMouseDown={() => handlePressStart(m.id)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                          className={`px-3 py-2 rounded-2xl text-[14px] break-words shadow-sm transition-all select-none ${m.isDeleted ? 'bg-white/5 text-white/40 italic border border-white/5' : isMe ? 'bg-gradient-to-r from-itec-sky to-blue-600 text-white rounded-br-sm' : 'bg-white/10 border border-white/5 text-white rounded-tl-sm'}`}
                        >
                          {m.replyTo && !m.isDeleted && (
                            <div onClick={() => document.getElementById(`msg-${m.replyTo!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mb-1.5 p-2 bg-black/20 border-l-4 border-white/50 rounded text-xs opacity-90 cursor-pointer hover:bg-black/30 transition">
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

                        {hasReactions && !m.isDeleted && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(m.reactions!).map(([emoji, users]) => {
                              const iReacted = users.includes(user?.id || '');
                              return (
                                <button key={emoji} onClick={() => handleReact(m.id, emoji)} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-transform hover:scale-105 ${iReacted ? 'bg-itec-sky/20 border-itec-sky/50 text-itec-sky' : 'bg-[#07192f] border-white/10 text-white/70'}`}>
                                  <span>{emoji}</span> <span className="font-bold">{users.length}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {reactionMenuId === m.id && (
                        <div className={`absolute z-40 ${isMe ? 'right-8' : 'left-8'} -top-10 bg-[#07192f] border border-white/20 p-1.5 rounded-full shadow-2xl flex gap-1 animate-in fade-in zoom-in duration-200`}>
                          {['👍', '❤️', '😂', '🚀', '👀'].map(e => (
                            <button key={e} onClick={() => handleReact(m.id, e)} className="hover:bg-white/10 p-1.5 rounded-full transition text-lg hover:scale-125 transform">{e}</button>
                          ))}
                        </div>
                      )}

                      {menuMsgId === m.id && (
                        <div className={`absolute z-30 top-6 ${isMe ? 'right-0' : 'left-0'} bg-[#233138] border border-white/10 p-1.5 min-w-[140px] rounded-lg shadow-xl`}>
                          {!m.isDeleted && (
                            <>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg" onClick={() => { setReplyToMsg(m); setMenuMsgId(null); focusComposer(); }}><Reply size={14} /> Répondre</button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg" onClick={() => handleCopy(m)}><Copy size={14} /> Copier</button>
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg" onClick={() => { setForwardMessage(m); setMenuMsgId(null); api.get('/projects').then(res=>setMyProjects(res.data)); }}><Forward size={14} /> Transférer</button>
                              {isResponsable && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-itec-sky hover:bg-white/10 rounded-lg" onClick={() => handlePin(m)}><Pin size={14} /> {m.isPinned ? 'Désépingler' : 'Épingler'}</button>}
                              {isMe && !m.message.startsWith('[') && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg" onClick={() => handleEdit(m)}><Edit2 size={14} /> Modifier</button>}
                            </>
                          )}
                          {isMe && !m.isDeleted && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded-lg" onClick={() => handleDelete(m.id)}><Trash2 size={14} /> Supprimer</button>}
                          <button className="w-full text-center py-1.5 mt-1 text-[10px] text-white/30 border-t border-white/5 uppercase font-bold" onClick={() => setMenuMsgId(null)}>Fermer</button>
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
            <button type="button" onClick={() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowScrollBtn(false); }} className="absolute bottom-28 sm:bottom-32 right-4 z-40 bg-itec-sky text-[#0A2540] p-3 rounded-full shadow-[0_4px_20px_rgba(79,195,247,0.5)] border border-white/20 hover:scale-110 transition" title="Aller en bas">
              <ChevronDown size={22} strokeWidth={2.5} />
            </button>
          )}

          <div className="bg-[#0A2540] border-t border-white/5 flex flex-col z-30 relative">
            
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 bg-[#0A2540] border-t border-white/10 max-h-32 overflow-y-auto z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
                {filteredMembers.map(u => (
                  <button key={u.id} type="button" onClick={() => handleMentionClick(u.nom)} className="w-full text-left px-4 py-2 border-b border-white/5 hover:bg-white/5 text-sm text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-itec-sky/20 text-itec-sky flex items-center justify-center text-xs font-bold">{u.nom.charAt(0)}</div>
                    {u.nom}
                  </button>
                ))}
              </div>
            )}

            {(replyToMsg || editingMsgId) && (
              <div className="px-4 py-2 bg-black/20 flex justify-between items-center text-xs border-b border-white/5">
                <div className="flex-1 min-w-0 border-l-2 border-itec-sky pl-2">
                  <div className="text-itec-sky font-bold">{editingMsgId ? 'Modification' : `Réponse à ${replyToMsg?.user.nom}`}</div>
                  <div className="text-white/50 truncate">{editingMsgId ? 'Modifiez votre message' : getPreviewText(replyToMsg?.message || '')}</div>
                </div>
                <button type="button" onClick={() => { setReplyToMsg(null); setEditingMsgId(null); setTexte(''); }} className="text-white/40 hover:text-white p-1"><X size={16}/></button>
              </div>
            )}

            <div className="px-3 pt-1 text-[10px] h-3 text-itec-sky italic">
              {typingUsers.length > 0 ? `${typingUsers.join(', ')} écrit...` : ''}
            </div>

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
                  <input ref={inputRef} type="text" value={texte} onChange={handleInputChange} disabled={uploading} placeholder={uploading ? "Envoi..." : "Message (@ pour mentionner)"} className="flex-1 bg-transparent px-2 py-2 text-[14px] text-white outline-none w-full placeholder-white/30" />
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
            {isResponsable && <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm text-white transition font-medium" onClick={() => handleForward('channel', 'responsables', '#Responsables')}>🔒 QG Responsables</button>}
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