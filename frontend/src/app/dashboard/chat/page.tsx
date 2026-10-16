'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { Globe, Lock, Send, Image as ImageIcon, Paperclip, Mic, Download, Copy, Forward, Edit2, Trash2, Reply, ChevronDown, ChevronsDown, Trash, Pin, X } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getSocket } from '@/lib/socket';
import { useNotifications } from '@/context/NotificationContext'; // 👈 NOUVEAU IMPORT

type ChannelType = 'global' | 'responsables';

interface ChatMessage {
  id: string; message: string; user: { id: string; nom: string; isSuperAdmin?: boolean }; userId: string;
  isEdited?: boolean; isDeleted?: boolean; isPinned?: boolean; creeLe: string;
  replyTo?: { id: string; nom: string; preview: string } | null;
  reactions?: Record<string, string[]>;
}

export default function GlobalChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { resetChatUnread } = useNotifications(); // 👈 NOUVEAU HOOK

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
  
  // États WhatsApp Bouton Retour en bas
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadScrollCount, setUnreadScrollCount] = useState(0);
  const showScrollBtnRef = useRef(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const [chrono, setChrono] = useState(0);

  const formatChrono = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const scrollBottom = () => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    setShowScrollBtn(false);
    setUnreadScrollCount(0);
  };
  
  const focusComposer = () => setTimeout(() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);

  const pinnedMsg = [...messages].reverse().find(m => m.isPinned && !m.isDeleted);

  useEffect(() => {
    let interval: any;
    if (isRecording) { setChrono(0); interval = setInterval(() => setChrono(p => p + 1), 1000); } 
    else { clearInterval(interval); }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!user) return;
    api.get('/projects').then((res) => setMyProjects(res.data.filter((p: any) => p.statut !== 'archive')));
    api.get('/users').then((res) => setAllUsers(res.data));

    const canAccessQG = !!user.isSuperAdmin || (Array.isArray(user.permissions) && user.permissions.includes('can_access_qg'));
    setIsResponsable(canAccessQG);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const canAccessQG = !!user.isSuperAdmin || (Array.isArray(user.permissions) && user.permissions.includes('can_access_qg'));
    if (!canAccessQG && activeChannel === 'responsables') setActiveChannel('global');
  }, [user, activeChannel]);

  useEffect(() => {
    showScrollBtnRef.current = showScrollBtn;
  }, [showScrollBtn]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true); setErreur('');

    // 🔔 NOUVEAU : On efface la pastille rouge car l'utilisateur lit le channel
    resetChatUnread(activeChannel);

    api.get(`/channels/${activeChannel}/messages`).then((res) => {
      setMessages(res.data);
      setTimeout(scrollBottom, 100);
    }).catch((err) => setErreur(err.response?.data?.message || 'Accès refusé')).finally(() => setLoading(false));

    const socket = getSocket();
    const onNew = (newMsg: ChatMessage) => {
      setMessages((prev) => { if (prev.some((m) => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      
      if (showScrollBtnRef.current) {
        setUnreadScrollCount(prev => prev + 1);
      } else {
        scrollBottom();
      }
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
  }, [activeChannel, authLoading, resetChatUnread]); // 👈 Ajout de la dépendance

  // ... (LE RESTE DE VOTRE CODE EST INCHANGÉ JUSQU'EN BAS)
  // Détection du scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const isNotBottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight > 100;
    setShowScrollBtn(isNotBottom);
    if (!isNotBottom) {
      setUnreadScrollCount(0);
    }
  };

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
      scrollBottom();
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
      setMenuMsgId(null);
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
      scrollBottom();
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
      part.startsWith('@') ? <span key={i} className="text-[#0A2540] bg-[#4FC3F7] font-bold px-1 rounded">{part}</span> : <span key={i}>{part}</span>
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0A2540]"><div className="animate-spin w-8 h-8 border-4 border-[#4FC3F7] border-t-transparent rounded-full" /></div>;

  return (
    <div className="flex flex-col h-screen bg-[#0A2540] overflow-hidden text-white">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col relative overflow-hidden bg-[#0A2540]">
        
        {/* HEADER STATIQUE */}
        <div className="shrink-0 bg-[#0A2540] border-b border-[#1E4D8C] px-4 py-3 flex gap-2 sm:gap-3 overflow-x-auto hide-scrollbar z-20 shadow-md">
          <button onClick={() => setActiveChannel('global')} className={`flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition whitespace-nowrap ${activeChannel === 'global' ? 'bg-[#4FC3F7] text-[#0A2540]' : 'bg-[#1E4D8C]/40 text-gray-300 hover:text-white border border-[#1E4D8C]'}`}>
            <Globe size={16} /> Général
          </button>
          {isResponsable && (
            <button onClick={() => setActiveChannel('responsables')} className={`flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition whitespace-nowrap ${activeChannel === 'responsables' ? 'bg-orange-500 text-white' : 'bg-[#1E4D8C]/40 text-gray-300 hover:text-white border border-[#1E4D8C]'}`}>
              <Lock size={16} /> QG Responsables
            </button>
          )}
        </div>

        {/* CORPS DU CHAT SCROLLABLE */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {pinnedMsg && (
            <div onClick={() => document.getElementById(`msg-${pinnedMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="bg-[#1E4D8C]/40 hover:bg-[#1E4D8C] border-b border-[#1E4D8C] px-4 py-2.5 flex items-center gap-3 cursor-pointer transition z-10 shadow-sm shrink-0">
              <Pin size={16} className="text-[#4FC3F7] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-[#4FC3F7] uppercase tracking-wider">Message Épinglé</div>
                <div className="text-xs text-white/80 truncate">{getPreviewText(pinnedMsg.message)}</div>
              </div>
            </div>
          )}

          {/* ZONE DES MESSAGES */}
          <div onScroll={handleScroll} className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4 relative bg-[#0A2540] custom-scrollbar">
            {loading ? <p className="text-center text-gray-400 mt-10">Chargement…</p> : erreur ? <p className="text-center text-red-400 mt-10 font-bold">{erreur}</p> : messages.length === 0 ? <p className="text-center text-gray-400 mt-10 italic">Aucun message.</p> : (
              messages.map((m) => {
                const isMe = m.userId === user?.id;
                const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;

                return (
                  <div key={m.id} id={`msg-${m.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-[10px] font-bold text-[#4FC3F7] mb-0.5 ml-1">{m.user?.nom} {m.user?.isSuperAdmin && <span className="text-yellow-400">👑</span>}</span>}

                    <div className="relative flex items-center max-w-[90%] sm:max-w-[75%]">
                      
                      <div className="flex flex-col relative w-full">
                        
                        {/* BULLE AVEC LA FLÈCHE (CHEVRON) */}
                        <div 
                          onContextMenu={(e) => { e.preventDefault(); setMenuMsgId(m.id); }}
                          className={`relative px-3.5 py-2.5 pr-8 rounded-2xl text-[14px] leading-relaxed break-words shadow-md transition-transform select-none ${
                            m.isDeleted 
                              ? 'bg-[#1E4D8C]/20 text-gray-400 italic border border-[#1E4D8C]' 
                              : isMe 
                                ? 'bg-[#1E4D8C] text-white border border-[#2A65A8]/50 rounded-tr-sm' 
                                : 'bg-[#0F2D4A] text-white border border-[#1E4D8C]/60 rounded-tl-sm'
                          }`}
                        >
                          {!m.isDeleted && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setMenuMsgId(menuMsgId === m.id ? null : m.id); }}
                              className="absolute top-1.5 right-1.5 p-0.5 text-gray-300 hover:text-white transition-colors rounded-full z-10 bg-black/10 hover:bg-black/30"
                              title="Options du message"
                            >
                              <ChevronDown size={16} strokeWidth={2.5} />
                            </button>
                          )}

                          {m.replyTo && !m.isDeleted && (
                            <div onClick={(e) => { e.stopPropagation(); document.getElementById(`msg-${m.replyTo!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className="mb-1.5 p-2 bg-[#0A2540]/60 border-l-4 border-[#4FC3F7] rounded text-xs opacity-90 cursor-pointer hover:opacity-100 transition">
                              <div className="font-bold text-[#4FC3F7] mb-0.5">{m.replyTo.nom}</div>
                              <div className="truncate text-gray-300">{m.replyTo.preview}</div>
                            </div>
                          )}

                          {parseMessage(m.message)}
                          
                          <div className="text-[10px] text-gray-300 text-right mt-1 flex justify-end items-center gap-1 font-medium">
                            {m.isEdited && !m.isDeleted && <span className="italic opacity-70">modifié</span>}
                            {new Date(m.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {hasReactions && !m.isDeleted && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(m.reactions!).map(([emoji, users]) => {
                              const iReacted = users.includes(user?.id || '');
                              return (
                                <button key={emoji} onClick={() => handleReact(m.id, emoji)} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-transform hover:scale-105 ${iReacted ? 'bg-[#4FC3F7] border-[#4FC3F7] text-[#0A2540]' : 'bg-[#1E4D8C] border-[#1E4D8C] text-white'}`}>
                                  <span>{emoji}</span> <span className="font-bold">{users.length}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {menuMsgId === m.id && (
                        <>
                          <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setMenuMsgId(null)} />
                          <div className={`absolute z-40 top-8 ${isMe ? 'right-0' : 'left-0'} bg-[#0A2540] border border-[#1E4D8C] p-1 min-w-[160px] rounded-lg shadow-2xl`}>
                            {!m.isDeleted && (
                              <>
                                <div className="flex justify-between items-center px-2 py-2 border-b border-[#1E4D8C] mb-1">
                                  {['👍', '❤️', '😂', '🚀', '👀'].map(e => (
                                    <button key={e} onClick={() => { handleReact(m.id, e); setMenuMsgId(null); }} className="hover:scale-125 transition text-base">{e}</button>
                                  ))}
                                </div>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded-lg" onClick={() => { setReplyToMsg(m); setMenuMsgId(null); focusComposer(); }}><Reply size={14} /> Répondre</button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded-lg" onClick={() => handleCopy(m)}><Copy size={14} /> Copier</button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded-lg" onClick={() => { setForwardMessage(m); setMenuMsgId(null); api.get('/projects').then(res=>setMyProjects(res.data)); }}><Forward size={14} /> Transférer</button>
                                {isResponsable && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#4FC3F7] hover:bg-[#1E4D8C] rounded-lg" onClick={() => handlePin(m)}><Pin size={14} /> {m.isPinned ? 'Désépingler' : 'Épingler'}</button>}
                                {isMe && !m.message.startsWith('[') && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded-lg" onClick={() => handleEdit(m)}><Edit2 size={14} /> Modifier</button>}
                              </>
                            )}
                            {isMe && !m.isDeleted && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950 rounded-lg" onClick={() => handleDelete(m.id)}><Trash2 size={14} /> Supprimer</button>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* BOUTON WHATSAPP "SCROLL TO BOTTOM" */}
          {showScrollBtn && (
            <button 
              type="button" 
              onClick={scrollBottom} 
              className="absolute bottom-4 right-4 sm:right-6 z-30 bg-[#1E4D8C] hover:bg-[#4FC3F7] text-white p-2.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.6)] border border-[#4FC3F7]/30 transition-all duration-300 ease-in-out hover:scale-110 flex items-center justify-center group" 
              title="Aller en bas"
            >
              <ChevronsDown size={22} className="text-gray-200 group-hover:text-[#0A2540] transition-colors" />
              
              {unreadScrollCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[11px] font-bold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {unreadScrollCount > 99 ? '99+' : unreadScrollCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* BARRE DE SAISIE */}
        <div className="shrink-0 bg-[#0A2540] border-t border-[#1E4D8C] flex flex-col z-30">
          
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 bg-[#0A2540] border-t border-[#1E4D8C] max-h-32 overflow-y-auto z-40 shadow-xl custom-scrollbar">
              {filteredMembers.map(u => (
                <button key={u.id} type="button" onClick={() => handleMentionClick(u.nom)} className="w-full text-left px-4 py-2 border-b border-[#1E4D8C] hover:bg-[#1E4D8C]/50 text-sm text-white flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1E4D8C] text-[#4FC3F7] flex items-center justify-center text-xs font-bold">{u.nom.charAt(0)}</div>
                  {u.nom}
                </button>
              ))}
            </div>
          )}

          {(replyToMsg || editingMsgId) && (
            <div className="px-4 py-2 bg-[#1E4D8C]/30 flex justify-between items-center text-xs border-b border-[#1E4D8C]">
              <div className="flex-1 min-w-0 border-l-2 border-[#4FC3F7] pl-2">
                <div className="text-[#4FC3F7] font-bold">{editingMsgId ? 'Modification' : `Réponse à ${replyToMsg?.user.nom}`}</div>
                <div className="text-gray-400 truncate">{editingMsgId ? 'Modifiez votre message' : getPreviewText(replyToMsg?.message || '')}</div>
              </div>
              <button type="button" onClick={() => { setReplyToMsg(null); setEditingMsgId(null); setTexte(''); }} className="text-gray-400 hover:text-white p-1"><X size={16}/></button>
            </div>
          )}

          <div className="px-3 pt-1 text-[10px] h-3 text-[#4FC3F7] italic">
            {typingUsers.length > 0 ? `${typingUsers.join(', ')} écrit...` : ''}
          </div>

          <form onSubmit={envoyerTexte} className="p-2 sm:p-3 flex gap-1.5 items-end">
            {isRecording ? (
              <div className="flex-1 bg-[#1E4D8C]/40 rounded-full px-4 py-2.5 flex items-center justify-between border border-[#1E4D8C]">
                <div className="flex items-center gap-2 text-red-400 animate-pulse">
                  <Mic size={16} /> <span className="text-sm font-mono font-bold">{formatChrono(chrono)}</span>
                </div>
                <button type="button" onClick={cancelRecording} className="text-gray-400 hover:text-red-400 p-1"><Trash size={14}/></button>
              </div>
            ) : (
              <div className="flex-1 bg-[#1E4D8C]/30 border border-[#1E4D8C] rounded-3xl px-2 py-1 flex items-end min-h-[44px]">
                {!texte && (
                  <div className="flex items-center pb-1 gap-1">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2 text-gray-400 hover:text-[#4FC3F7] transition"><ImageIcon size={18} /></button>
                    
                    <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-gray-400 hover:text-[#4FC3F7] transition"><Paperclip size={18} /></button>
                  </div>
                )}
                <input ref={inputRef} type="text" value={texte} onChange={handleInputChange} disabled={uploading} placeholder={uploading ? "Envoi..." : "Message (@ pour mentionner)"} className="flex-1 bg-transparent px-2 py-2 text-[14px] text-white outline-none w-full placeholder-gray-500" />
              </div>
            )}

            <div className="shrink-0 mb-0.5 ml-1">
              {texte || isRecording ? (
                <button type="button" onClick={isRecording ? handleStopRecording : envoyerTexte} disabled={uploading} className="bg-[#4FC3F7] text-[#0A2540] rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition">
                  <Send size={18} className="ml-0.5" />
                </button>
              ) : (
                <button type="button" onClick={startRecording} disabled={uploading} className="bg-[#1E4D8C] text-white hover:text-[#4FC3F7] hover:bg-[#0A2540] border border-[#1E4D8C] rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition">
                  <Mic size={20} />
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      {forwardMessage && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-[#0A2540] w-full max-w-xs p-5 rounded-2xl space-y-3 border border-[#1E4D8C] shadow-2xl">
            <h3 className="font-bold text-white text-sm">Transférer à...</h3>
            <button className="w-full text-left px-4 py-3 bg-[#1E4D8C]/30 hover:bg-[#1E4D8C] border border-[#1E4D8C] rounded-xl text-sm text-white transition font-medium" onClick={() => handleForward('channel', 'global', '#Général')}>🌍 Chat Général</button>
            {isResponsable && <button className="w-full text-left px-4 py-3 bg-[#1E4D8C]/30 hover:bg-[#1E4D8C] border border-[#1E4D8C] rounded-xl text-sm text-white transition font-medium" onClick={() => handleForward('channel', 'responsables', '#Responsables')}>🔒 QG Responsables</button>}
            {myProjects.map((p) => (
              <button key={p.id} className="w-full text-left px-4 py-3 bg-[#1E4D8C]/30 hover:bg-[#1E4D8C] border border-[#1E4D8C] rounded-xl text-sm text-white transition font-medium" onClick={() => handleForward('project', p.id, p.nom)}>📁 {p.nom}</button>
            ))}
            <button onClick={() => setForwardMessage(null)} className="w-full py-2 text-gray-400 hover:text-white text-sm mt-2 uppercase font-bold text-[10px]">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}