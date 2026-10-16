'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { User } from '@/types';
import {
  MessageSquare, X, Send, Mic, Image as ImageIcon, Paperclip, Download,
  Edit2, Trash2, Copy, Forward, Reply, ChevronDown, ChevronsDown, Trash, Pin, MoreVertical, SmilePlus
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getSocket } from '@/lib/socket';
import { useNotifications } from '@/context/NotificationContext';

interface Message {
  id: string; message: string; user: User; userId: string;
  isEdited?: boolean; isDeleted?: boolean; isPinned?: boolean; creeLe: string;
  replyTo?: { id: string; nom: string; preview: string } | null;
  reactions?: Record<string, string[]>;
}

export default function ProjectChat({
  projectId,
  currentUser,
  isChef,
  membres,
  projectName,
}: {
  projectId: string;
  currentUser: User | null;
  isChef?: boolean;
  membres: any[];
  projectName?: string;
}) {
  const { getProjectUnread, resetChatUnread } = useNotifications();
  const projectUnread = getProjectUnread(projectId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<Message | null>(null);
  const [open, setOpen] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [reactionMenuId, setReactionMenuId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadScrollCount, setUnreadScrollCount] = useState(0);
  const showScrollBtnRef = useRef(false);

  const [showMentions, setShowMentions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const [chrono, setChrono] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollBottom = () => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    setShowScrollBtn(false);
    setUnreadScrollCount(0);
  };
  const focusComposer = () => setTimeout(() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);

  const pinnedMsg = [...messages].reverse().find((m) => m.isPinned && !m.isDeleted);

  useEffect(() => {
    showScrollBtnRef.current = showScrollBtn;
  }, [showScrollBtn]);

  useEffect(() => {
    let interval: any;
    if (isRecording) { setChrono(0); interval = setInterval(() => setChrono((p) => p + 1), 1000); }
    else { clearInterval(interval); }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatChrono = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  // Ouvrir / fermer → badge + flag global
  const handleOpen = (value: boolean) => {
    setOpen(value);
    if (typeof window !== 'undefined' && (window as any).__setOpenProjectChat) {
      (window as any).__setOpenProjectChat(value ? projectId : null);
    }
    if (value) {
      resetChatUnread(projectId);
    }
  };

  useEffect(() => {
    if (!open || !projectId) return;

    resetChatUnread(projectId);
    api.get(`/projects/${projectId}/messages`).then((res) => { setMessages(res.data); scrollBottom(); });

    const socket = getSocket();
    const onNew = (newMsg: Message) => {
      setMessages((prev) => { if (prev.some((m) => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      if (showScrollBtnRef.current) setUnreadScrollCount((c) => c + 1);
      else scrollBottom();
    };
    const onUpdate = (updated: Message) => setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    const onTyping = ({ userName, isTyping }: { userName: string; isTyping: boolean }) => {
      if (userName === currentUser?.nom) return;
      setTypingUsers((prev) => {
        if (isTyping && !prev.includes(userName)) return [...prev, userName];
        if (!isTyping) return prev.filter((name) => name !== userName);
        return prev;
      });
    };

    socket.on(`project_${projectId}_message`, onNew);
    socket.on(`project_${projectId}_message_update`, onUpdate);
    socket.on(`project_${projectId}_typing`, onTyping);

    return () => {
      socket.off(`project_${projectId}_message`, onNew);
      socket.off(`project_${projectId}_message_update`, onUpdate);
      socket.off(`project_${projectId}_typing`, onTyping);
      // Si on démonte en étant ouvert, on libère le flag
      if (typeof window !== 'undefined' && (window as any).__setOpenProjectChat) {
        (window as any).__setOpenProjectChat(null);
      }
    };
  }, [open, projectId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const isNotBottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight > 80;
    setShowScrollBtn(isNotBottom);
    if (!isNotBottom) setUnreadScrollCount(0);
  };

  const handlePressStart = (id: string) => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setMenuMsgId(id);
      setReactionMenuId(null);
    }, 400);
  };
  const handlePressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTexte(val);
    const lastWord = val.split(' ').pop();
    if (lastWord?.startsWith('@')) {
      const search = lastWord.substring(1).toLowerCase();
      setFilteredMembers(membres.filter((m) => m.user?.nom.toLowerCase().includes(search)));
      setShowMentions(true);
    } else setShowMentions(false);

    const socket = getSocket();
    socket.emit('typing_start', { room: `project_${projectId}`, userName: currentUser?.nom });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { room: `project_${projectId}`, userName: currentUser?.nom });
    }, 2000);
  };

  const handleMentionClick = (nom: string) => {
    const parts = texte.split(' ');
    parts.pop();
    setTexte([...parts, `@${nom} `].join(' '));
    setShowMentions(false);
    focusComposer();
  };

  const envoyerTexte = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!texte.trim()) return;
    try {
      if (editingMsgId) {
        await api.patch(`/projects/messages/${editingMsgId}`, { message: texte });
        setEditingMsgId(null);
      } else {
        await api.post(`/projects/${projectId}/messages`, { message: texte, replyToId: replyToMsg?.id });
        setReplyToMsg(null);
      }
      setTexte('');
      setShowMentions(false);
      scrollBottom();
      getSocket().emit('typing_stop', { room: `project_${projectId}`, userName: currentUser?.nom });
    } catch { alert('Erreur'); }
  };

  const handleEdit = (msg: Message) => {
    if (msg.isDeleted || msg.message.startsWith('[')) return alert('Modification impossible');
    setEditingMsgId(msg.id); setTexte(msg.message); setMenuMsgId(null); setReplyToMsg(null); focusComposer();
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try { await api.delete(`/projects/messages/${id}`); setMenuMsgId(null); } catch { alert('Erreur'); }
  };
  const handlePin = async (msg: Message) => {
    try { await api.patch(`/projects/messages/${msg.id}/pin`); setMenuMsgId(null); } catch { alert('Erreur'); }
  };
  const handleReact = async (msgId: string, emoji: string) => {
    try { await api.post(`/projects/messages/${msgId}/react`, { emoji }); setReactionMenuId(null); setMenuMsgId(null); } catch { alert('Erreur de réaction'); }
  };

  const handleCopy = async (msg: Message) => {
    let text = msg.message;
    if (text.startsWith('[TRANSFERT]')) text = text.replace('[TRANSFERT]', '').trim();
    if (text.startsWith('[FILE]')) text = text.replace('[FILE]', '').split('|')[1] || 'Fichier';
    if (text.startsWith('[IMAGE]') || text.startsWith('[AUDIO]')) text = text.replace(/^\[(IMAGE|AUDIO)\]/, '').trim();
    await navigator.clipboard.writeText(text); setMenuMsgId(null); alert('Copié !');
  };

  const handleForward = async (targetType: 'project' | 'channel', targetId: string, label: string) => {
    if (!forwardMessage) return;
    try {
      await api.post('/messages/forward', { message: forwardMessage.message, targetType, targetId });
      setForwardMessage(null); alert(`Transféré vers ${label}`);
    } catch { alert('Erreur'); }
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
      await api.post(`/projects/${projectId}/messages`, { message: payload, replyToId: replyToMsg?.id });
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
      part.startsWith('@')
        ? <span key={i} className="text-[#0A2540] bg-[#4FC3F7] font-bold px-1 rounded">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  const parseMessage = (msg: string) => {
    const token = Cookies.get('token');
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const resolveUrl = (pathUrl: string) => pathUrl.startsWith('http') ? pathUrl : `${baseURL}${pathUrl}?token=${token}`;

    if (msg.startsWith('[TRANSFERT]')) return <div className="space-y-0.5"><div className="text-[9px] uppercase opacity-70 border-l-2 border-white/40 pl-1.5">Transféré</div><div>{parseMessage(msg.replace('[TRANSFERT]', '').trim())}</div></div>;
    if (msg.startsWith('[AUDIO]')) return <audio controls src={resolveUrl(msg.replace('[AUDIO]', ''))} className="w-48 h-8 rounded outline-none" onPlay={(e) => e.stopPropagation()} />;
    if (msg.startsWith('[IMAGE]')) return <img src={resolveUrl(msg.replace('[IMAGE]', ''))} alt="Img" className="max-w-[200px] rounded cursor-pointer" onClick={() => window.open(resolveUrl(msg.replace('[IMAGE]', '')), '_blank')} />;
    if (msg.startsWith('[FILE]')) {
      const [pathUrl, fileName] = msg.replace('[FILE]', '').split('|');
      return <a href={resolveUrl(pathUrl)} download={fileName} target="_blank" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-lg text-white border border-white/10 transition"><Download size={14} /> <span className="text-xs font-bold truncate max-w-[120px]">{fileName || 'Document'}</span></a>;
    }
    return <span className="whitespace-pre-wrap">{renderTextWithMentions(msg)}</span>;
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60]">
      {!open && (
        <button
          onClick={() => handleOpen(true)}
          className="relative bg-gradient-to-r from-[#4FC3F7] to-[#1E4D8C] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_20px_rgba(79,195,247,0.4)] transition-transform hover:scale-110"
        >
          <MessageSquare size={24} />
          {/* 🔴 BADGE NON LUS PROJET */}
          {projectUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center border-2 border-[#0A2540] animate-bounce shadow-lg">
              {projectUnread > 99 ? '99+' : projectUnread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="w-[calc(100vw-2rem)] sm:w-[360px] h-[75vh] sm:h-[500px] flex flex-col rounded-2xl overflow-hidden bg-[#0A2540] border border-[#1E4D8C] shadow-2xl relative">
          <div className="bg-[#07192f] p-3 flex justify-between items-center border-b border-[#1E4D8C] z-10 shadow-sm">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              <MessageSquare size={16} className="text-[#4FC3F7]" />
              {projectName ? `Chat — ${projectName}` : 'Chat Équipe'}
            </h3>
            <button onClick={() => handleOpen(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
          </div>

          {pinnedMsg && (
            <div onClick={() => document.getElementById(`pmsg-${pinnedMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="bg-[#1E4D8C]/40 hover:bg-[#1E4D8C] border-b border-[#1E4D8C] px-3 py-2 flex items-center gap-3 cursor-pointer transition z-10">
              <Pin size={16} className="text-[#4FC3F7] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-[#4FC3F7] uppercase">Message Épinglé</div>
                <div className="text-xs text-white/80 truncate">{getPreviewText(pinnedMsg.message)}</div>
              </div>
            </div>
          )}

          <div ref={chatBoxRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-3 relative bg-[#0A2540] custom-scrollbar">
            {messages.map((m) => {
              const isMe = m.userId === currentUser?.id;
              const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;

              return (
                <div key={m.id} id={`pmsg-${m.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] font-bold text-[#4FC3F7] mb-0.5 px-1">{m.user?.nom}</span>}

                  <div className="relative flex items-end gap-1 max-w-[90%]">
                    {!m.isDeleted && (
                      <div className={`flex flex-col gap-1 ${isMe ? 'order-first mr-1' : 'order-last ml-1'}`}>
                        <button onClick={() => { setReactionMenuId(reactionMenuId === m.id ? null : m.id); setMenuMsgId(null); }} className="p-1 text-white/40 hover:text-white bg-black/20 rounded-full" title="Réagir"><SmilePlus size={14}/></button>
                        <button onClick={() => { setMenuMsgId(menuMsgId === m.id ? null : m.id); setReactionMenuId(null); }} className="p-1 text-white/40 hover:text-white bg-black/20 rounded-full" title="Plus"><MoreVertical size={14}/></button>
                      </div>
                    )}

                    <div className="flex flex-col">
                      <div
                        onTouchStart={() => handlePressStart(m.id)} onTouchEnd={handlePressEnd} onTouchMove={handlePressEnd}
                        onMouseDown={() => handlePressStart(m.id)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                        className={`px-3 py-2 rounded-2xl text-[13px] break-words shadow-sm select-none ${
                          m.isDeleted ? 'bg-white/5 text-white/40 italic border border-white/5'
                            : isMe ? 'bg-[#1E4D8C] text-white rounded-br-sm border border-[#2A65A8]/50'
                            : 'bg-[#0F2D4A] border border-[#1E4D8C]/60 text-white rounded-tl-sm'
                        }`}
                      >
                        {m.replyTo && !m.isDeleted && (
                          <div onClick={() => document.getElementById(`pmsg-${m.replyTo!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mb-1.5 p-2 bg-black/20 border-l-4 border-[#4FC3F7] rounded text-xs cursor-pointer">
                            <div className="font-bold text-[#4FC3F7] mb-0.5">{m.replyTo.nom}</div>
                            <div className="truncate text-white/70">{m.replyTo.preview}</div>
                          </div>
                        )}
                        {parseMessage(m.message)}
                        <div className="text-[9px] text-white/50 text-right mt-1 flex justify-end gap-1">
                          {m.isEdited && !m.isDeleted && <span className="italic">modifié</span>}
                          {new Date(m.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {hasReactions && !m.isDeleted && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(m.reactions!).map(([emoji, users]) => {
                            const iReacted = users.includes(currentUser?.id || '');
                            return (
                              <button key={emoji} onClick={() => handleReact(m.id, emoji)} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border ${iReacted ? 'bg-[#4FC3F7]/20 border-[#4FC3F7] text-[#4FC3F7]' : 'bg-[#07192f] border-white/10 text-white/70'}`}>
                                <span>{emoji}</span><span className="font-bold">{users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {reactionMenuId === m.id && (
                      <div className={`absolute z-40 ${isMe ? 'right-8' : 'left-8'} -top-10 bg-[#07192f] border border-[#1E4D8C] p-1.5 rounded-full shadow-2xl flex gap-1`}>
                        {['👍', '❤️', '😂', '🚀', '👀'].map((e) => (
                          <button key={e} onClick={() => handleReact(m.id, e)} className="hover:bg-white/10 p-1.5 rounded-full text-lg hover:scale-125">{e}</button>
                        ))}
                      </div>
                    )}

                    {menuMsgId === m.id && (
                      <div className={`absolute z-30 top-6 ${isMe ? 'right-0' : 'left-0'} bg-[#0A2540] border border-[#1E4D8C] p-1.5 min-w-[140px] rounded-lg shadow-xl`}>
                        {!m.isDeleted && (
                          <>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded" onClick={() => { setReplyToMsg(m); setMenuMsgId(null); focusComposer(); }}><Reply size={14} /> Répondre</button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded" onClick={() => handleCopy(m)}><Copy size={14} /> Copier</button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded" onClick={() => { setForwardMessage(m); setMenuMsgId(null); api.get('/projects').then((res) => setMyProjects(res.data)); }}><Forward size={14} /> Transférer</button>
                            {isChef && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#4FC3F7] hover:bg-[#1E4D8C] rounded" onClick={() => handlePin(m)}><Pin size={14} /> {m.isPinned ? 'Désépingler' : 'Épingler'}</button>}
                            {isMe && !m.message.startsWith('[') && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1E4D8C] rounded" onClick={() => handleEdit(m)}><Edit2 size={14} /> Modifier</button>}
                          </>
                        )}
                        {isMe && !m.isDeleted && <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded" onClick={() => handleDelete(m.id)}><Trash2 size={14} /> Supprimer</button>}
                        <button className="w-full text-center py-1 mt-1 text-[10px] text-white/30 border-t border-white/5 uppercase font-bold" onClick={() => setMenuMsgId(null)}>Fermer</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {showScrollBtn && (
            <button
              type="button"
              onClick={scrollBottom}
              className="absolute bottom-28 right-3 z-40 bg-[#1E4D8C] hover:bg-[#4FC3F7] text-white p-2.5 rounded-full shadow-lg border border-[#4FC3F7]/30 hover:scale-110 transition flex items-center justify-center"
              title="Aller en bas"
            >
              <ChevronsDown size={20} />
              {unreadScrollCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center animate-bounce">
                  {unreadScrollCount > 99 ? '99+' : unreadScrollCount}
                </span>
              )}
            </button>
          )}

          <div className="bg-[#07192f] border-t border-[#1E4D8C] flex flex-col z-30 relative">
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 bg-[#0A2540] border-t border-[#1E4D8C] max-h-32 overflow-y-auto z-40 shadow-xl">
                {filteredMembers.map((m) => (
                  <button key={m.id} type="button" onClick={() => handleMentionClick(m.user.nom)} className="w-full text-left px-4 py-2 border-b border-[#1E4D8C] hover:bg-[#1E4D8C]/50 text-sm text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#1E4D8C] text-[#4FC3F7] flex items-center justify-center text-xs font-bold">{m.user.nom.charAt(0)}</div>
                    {m.user.nom}
                  </button>
                ))}
              </div>
            )}

            {(replyToMsg || editingMsgId) && (
              <div className="px-4 py-2 bg-black/20 flex justify-between items-center text-xs border-b border-[#1E4D8C]">
                <div className="flex-1 min-w-0 border-l-2 border-[#4FC3F7] pl-2">
                  <div className="text-[#4FC3F7] font-bold">{editingMsgId ? 'Modification' : `Réponse à ${replyToMsg?.user.nom}`}</div>
                  <div className="text-white/50 truncate">{editingMsgId ? 'Modifiez votre message' : getPreviewText(replyToMsg?.message || '')}</div>
                </div>
                <button type="button" onClick={() => { setReplyToMsg(null); setEditingMsgId(null); setTexte(''); }} className="text-white/40 hover:text-white p-1"><X size={16}/></button>
              </div>
            )}

            <div className="px-3 pt-1 text-[10px] h-3 text-[#4FC3F7] italic">
              {typingUsers.length > 0 ? `${typingUsers.join(', ')} écrit...` : ''}
            </div>

            <form onSubmit={envoyerTexte} className="p-2 flex gap-1.5 items-end">
              {isRecording ? (
                <div className="flex-1 bg-white/5 rounded-full px-4 py-2.5 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-2 text-red-400 animate-pulse">
                    <Mic size={16} /> <span className="text-sm font-mono font-bold">{formatChrono(chrono)}</span>
                  </div>
                  <button type="button" onClick={cancelRecording} className="text-white/40 hover:text-red-400 p-1"><Trash size={14}/></button>
                </div>
              ) : (
                <div className="flex-1 bg-white/5 border border-white/5 rounded-3xl px-2 py-1 flex items-end min-h-[44px]">
                  {!texte && (
                    <div className="flex items-center pb-1 gap-1">
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
                      <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="p-2 text-white/50 hover:text-[#4FC3F7]"><ImageIcon size={18} /></button>
                      <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-white/50 hover:text-[#4FC3F7]"><Paperclip size={18} /></button>
                    </div>
                  )}
                  <input ref={inputRef} type="text" value={texte} onChange={handleInputChange} disabled={uploading} placeholder={uploading ? 'Envoi...' : 'Message (@ pour mentionner)'} className="flex-1 bg-transparent px-2 py-2 text-[14px] text-white outline-none w-full placeholder-white/30" />
                </div>
              )}

              <div className="shrink-0 mb-0.5 ml-1">
                {texte || isRecording ? (
                  <button type="button" onClick={isRecording ? handleStopRecording : () => envoyerTexte()} disabled={uploading} className="bg-[#4FC3F7] text-[#0A2540] rounded-full w-11 h-11 flex items-center justify-center shadow-lg">
                    <Send size={18} className="ml-0.5" />
                  </button>
                ) : (
                  <button type="button" onClick={startRecording} disabled={uploading} className="bg-[#1E4D8C] text-white hover:text-[#4FC3F7] border border-[#1E4D8C] rounded-full w-11 h-11 flex items-center justify-center shadow-lg">
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {forwardMessage && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-[#0A2540] w-full max-w-xs p-5 rounded-2xl space-y-3 border border-[#1E4D8C] shadow-2xl">
            <h3 className="font-bold text-white text-sm">Transférer à...</h3>
            <button className="w-full text-left px-4 py-3 bg-[#1E4D8C]/30 hover:bg-[#1E4D8C] border border-[#1E4D8C] rounded-xl text-sm text-white" onClick={() => handleForward('channel', 'global', '#Général')}>🌍 Chat Général</button>
            {myProjects.map((p) => (
              <button key={p.id} className="w-full text-left px-4 py-3 bg-[#1E4D8C]/30 hover:bg-[#1E4D8C] border border-[#1E4D8C] rounded-xl text-sm text-white" onClick={() => handleForward('project', p.id, p.nom)}>📁 {p.nom}</button>
            ))}
            <button onClick={() => setForwardMessage(null)} className="w-full py-2 text-white/50 text-sm mt-2 uppercase font-bold text-[10px]">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}