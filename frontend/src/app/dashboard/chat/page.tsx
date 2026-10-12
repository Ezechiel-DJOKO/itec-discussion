'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  Globe,
  Lock,
  Send,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Download,
  Copy,
  Forward,
  Edit2,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getSocket } from '@/lib/socket';

type ChannelType = 'global' | 'responsables';

interface ChatMessage {
  id: string;
  message: string;
  user: { id: string; nom: string; isSuperAdmin?: boolean };
  userId: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  creeLe: string;
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
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const scrollBottom = () =>
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

  useEffect(() => {
    if (!user) return;
    api.get('/projects').then((res) => {
      const isChef = res.data.some((p: any) =>
        p.membres?.some((m: any) => m.userId === user.id && m.role === 'chef'),
      );
      setIsResponsable(!!user.isSuperAdmin || isChef);
      setMyProjects(res.data.filter((p: any) => p.statut !== 'archive'));
    });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setErreur('');

    api
      .get(`/channels/${activeChannel}/messages`)
      .then((res) => {
        setMessages(res.data);
        scrollBottom();
      })
      .catch((err) =>
        setErreur(err.response?.data?.message || 'Accès refusé'),
      )
      .finally(() => setLoading(false));

    const socket = getSocket();

    const onNew = (newMsg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollBottom();
    };

    const onUpdate = (updated: ChatMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
    };

    socket.on(`channel_${activeChannel}_message`, onNew);
    socket.on(`channel_${activeChannel}_message_update`, onUpdate);

    return () => {
      socket.off(`channel_${activeChannel}_message`, onNew);
      socket.off(`channel_${activeChannel}_message_update`, onUpdate);
    };
  }, [activeChannel, authLoading]);

  const envoyerTexte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try {
      if (editingMsgId) {
        await api.patch(`/channels/messages/${editingMsgId}`, {
          message: texte,
        });
        setEditingMsgId(null);
      } else {
        await api.post(`/channels/${activeChannel}/messages`, {
          message: texte,
        });
      }
      setTexte('');
    } catch {
      alert('Erreur');
    }
  };

  const handleEdit = (msg: ChatMessage) => {
    if (msg.isDeleted || msg.message.startsWith('[')) {
      return alert('Seuls les messages texte peuvent être modifiés');
    }
    setEditingMsgId(msg.id);
    setTexte(msg.message);
    setMenuMsgId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await api.delete(`/channels/messages/${id}`);
      setMenuMsgId(null);
    } catch {
      alert('Erreur');
    }
  };

  const handleCopy = async (msg: ChatMessage) => {
    let text = msg.message;
    if (text.startsWith('[TRANSFERT]'))
      text = text.replace('[TRANSFERT]', '').trim();
    if (text.startsWith('[FILE]')) {
      text = text.replace('[FILE]', '').split('|')[1] || 'Fichier';
    }
    if (text.startsWith('[IMAGE]') || text.startsWith('[AUDIO]')) {
      text = text.replace(/^\[(IMAGE|AUDIO)\]/, '').trim();
    }
    await navigator.clipboard.writeText(text);
    setMenuMsgId(null);
    alert('Copié');
  };

  const handleForward = async (
    targetType: 'project' | 'channel',
    targetId: string,
    label: string,
  ) => {
    if (!forwardMessage) return;
    try {
      await api.post('/messages/forward', {
        message: forwardMessage.message,
        targetType,
        targetId,
      });
      setForwardMessage(null);
      alert(`Transféré vers ${label}`);
    } catch {
      alert('Erreur transfert');
    }
  };

  const handleStopRecording = async () => {
    const f = await stopRecording();
    if (f) handleFileUpload(f, '[AUDIO]');
  };

  const handleFileUpload = async (
    file: File,
    tag: '[AUDIO]' | '[IMAGE]' | '[FILE]',
  ) => {
    if (file.size > 10 * 1024 * 1024) return alert('Max 10 Mo');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await api.post('/files/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = uploadRes.data.url;
      const payload =
        tag === '[FILE]'
          ? `${tag}${fileUrl}|${file.name}`
          : `${tag}${fileUrl}`;
      await api.post(`/channels/${activeChannel}/messages`, {
        message: payload,
      });
    } catch {
      alert("Erreur d'envoi");
    } finally {
      setUploading(false);
    }
  };

  const parseMessage = (msg: string) => {
    const token = Cookies.get('token');
    const baseURL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    if (msg.startsWith('[TRANSFERT]')) {
      return (
        <div className="space-y-1">
          <div className="text-[10px] uppercase opacity-70 border-l-2 border-white/40 pl-2">
            Transféré
          </div>
          <div>{parseMessage(msg.replace('[TRANSFERT]', '').trim())}</div>
        </div>
      );
    }
    if (msg.startsWith('[AUDIO]')) {
      return (
        <audio
          controls
          src={`${baseURL}${msg.replace('[AUDIO]', '')}?token=${token}`}
          className="w-48 sm:w-64 h-10"
        />
      );
    }
    if (msg.startsWith('[IMAGE]')) {
      const src = `${baseURL}${msg.replace('[IMAGE]', '')}?token=${token}`;
      return (
        <img
          src={src}
          alt="img"
          className="max-w-xs max-h-64 rounded-lg cursor-pointer"
          onClick={() => window.open(src, '_blank')}
        />
      );
    }
    if (msg.startsWith('[FILE]')) {
      const [pathUrl, fileName] = msg.replace('[FILE]', '').split('|');
      return (
        <a
          href={`${baseURL}${pathUrl}?token=${token}`}
          download={fileName}
          target="_blank"
          className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl"
        >
          <Download size={16} />
          <span className="text-sm font-bold truncate max-w-[150px] sm:max-w-[200px]">
            {fileName || 'Document'}
          </span>
        </a>
      );
    }
    return <span className="whitespace-pre-wrap">{msg}</span>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-itec-sky border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
        
        {/* ONGLET DES CHANNELS */}
        <div className="flex gap-2 sm:gap-3 mb-4 overflow-x-auto pb-1 hide-scrollbar">
          <button
            onClick={() => setActiveChannel('global')}
            className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap ${
              activeChannel === 'global'
                ? 'bg-itec-sky text-[#0A2540]'
                : 'bg-white/10 text-white/50 hover:text-white border border-transparent'
            }`}
          >
            <Globe size={16} /> Général
          </button>
          
          {isResponsable && (
            <button
              onClick={() => setActiveChannel('responsables')}
              className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap ${
                activeChannel === 'responsables'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/50 hover:text-white border border-transparent'
              }`}
            >
              <Lock size={16} /> QG Responsables
            </button>
          )}
        </div>

        {/* 🔴 FOND OPAQUE BG-[#0A2540] */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0A2540] rounded-2xl shadow-xl border border-white/20">
          
          {/* ZONE DES MESSAGES */}
          <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4">
            {loading ? (
              <p className="text-center text-white/40 mt-10">Chargement…</p>
            ) : erreur ? (
              <p className="text-center text-red-400 mt-10 font-bold">{erreur}</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-white/40 mt-10 italic">Aucun message</p>
            ) : (
              messages.map((m) => {
                const isMe = m.userId === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className={`text-[10px] sm:text-xs font-bold ${isMe ? 'text-itec-sky' : 'text-white'}`}>
                        {isMe ? 'Vous' : m.user?.nom || 'Inconnu'}
                      </span>
                      <span className="text-[9px] text-white/40">
                        {new Date(m.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.isEdited && !m.isDeleted && (
                        <span className="text-[9px] text-white/30 italic">modifié</span>
                      )}
                    </div>

                    <div className="relative flex items-end gap-1 max-w-[90%] sm:max-w-[80%]">
                      <button
                        type="button"
                        onClick={() => setMenuMsgId(menuMsgId === m.id ? null : m.id)}
                        className={`p-1 text-white/40 hover:text-white ${isMe ? 'order-first' : 'order-last'}`}
                      >
                        <MoreVertical size={14} />
                      </button>

                      <div
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm break-words ${
                          m.isDeleted
                            ? 'bg-white/5 text-white/40 italic'
                            : isMe
                              ? 'bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-br-sm'
                              : 'bg-white/10 text-white rounded-bl-sm border border-white/5'
                        }`}
                      >
                        {parseMessage(m.message)}
                      </div>

                      {/* MENU ACTIONS MSG */}
                      {menuMsgId === m.id && (
                        <div className={`absolute z-30 top-0 ${isMe ? 'right-6' : 'left-6'} bg-[#0A2540] border border-white/20 p-1.5 min-w-[130px] rounded-lg shadow-xl`}>
                          
                          {/* 🔴 ACTIONS BLOQUÉES SI MSG SUPPRIMÉ */}
                          {!m.isDeleted && (
                            <>
                              <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleCopy(m)}>
                                <Copy size={12} /> Copier
                              </button>
                              <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-white/10 rounded" onClick={() => { setForwardMessage(m); setMenuMsgId(null); }}>
                                <Forward size={12} /> Transférer
                              </button>
                              {isMe && !m.message.startsWith('[') && (
                                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-white/10 rounded" onClick={() => handleEdit(m)}>
                                  <Edit2 size={12} /> Modifier
                                </button>
                              )}
                            </>
                          )}
                          
                          {isMe && !m.isDeleted && (
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded" onClick={() => handleDelete(m.id)}>
                              <Trash2 size={12} /> Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* ZONE DE TEXTE & BOUTONS */}
          <form onSubmit={envoyerTexte} className="p-2 sm:p-3 bg-black/30 border-t border-white/10 space-y-2">
            
            {editingMsgId && (
              <div className="flex justify-between items-center text-xs text-itec-sky bg-white/5 px-3 py-1.5 rounded-lg">
                <span>Modification...</span>
                <button type="button" onClick={() => { setEditingMsgId(null); setTexte(''); }}>✕</button>
              </div>
            )}

            <div className="flex gap-2 items-center px-1">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[IMAGE]'); }} />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 bg-white/5 text-itec-sky rounded-lg">
                <ImageIcon size={16} />
              </button>
              
              <input ref={fileInputRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], '[FILE]'); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/5 text-itec-sky rounded-lg">
                <Paperclip size={16} />
              </button>
              
              <div className="flex-1" />
              
              <button type="button" onMouseDown={startRecording} onMouseUp={handleStopRecording} onTouchStart={startRecording} onTouchEnd={handleStopRecording} className={`p-2 rounded-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-itec-sky'}`}>
                <Mic size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                disabled={!!erreur || uploading || isRecording}
                placeholder={uploading ? 'Envoi...' : 'Votre message...'}
                className="bg-white/10 flex-1 px-3 sm:px-4 py-2 rounded-lg text-sm text-white outline-none focus:border focus:border-itec-sky border border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!!erreur || uploading || isRecording || !texte.trim()}
                className="bg-itec-sky text-[#0A2540] rounded-lg w-10 h-10 flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </form>

        </div>
      </main>

      {/* Modal Transférer */}
      {forwardMessage && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="glass-card bg-[#0A2540] w-full max-w-sm p-5 space-y-3 border border-white/20">
            <h3 className="font-bold text-white text-sm">Transférer vers…</h3>
            <button className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white" onClick={() => handleForward('channel', 'global', '#Général')}>
              🌍 Chat Général
            </button>
            {isResponsable && (
              <button className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white" onClick={() => handleForward('channel', 'responsables', '#Responsables')}>
                🔒 QG Responsables
              </button>
            )}
            {myProjects.map((p) => (
              <button key={p.id} className="w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-white" onClick={() => handleForward('project', p.id, p.nom)}>
                📁 {p.nom}
              </button>
            ))}
            <button onClick={() => setForwardMessage(null)} className="w-full py-2 text-white/50 text-sm">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}