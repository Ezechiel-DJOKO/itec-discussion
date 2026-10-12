'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { User } from '@/types';
import {
  MessageSquare,
  X,
  Send,
  Mic,
  Image as ImageIcon,
  Paperclip,
  Download,
  Edit2,
  Trash2,
  Copy,
  Forward,
  MoreVertical,
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getSocket } from '@/lib/socket';

interface Message {
  id: string;
  message: string;
  user: User;
  userId: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  creeLe: string;
}

export default function ProjectChat({
  projectId,
  currentUser,
}: {
  projectId: string;
  currentUser: User | null;
}) {
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

  const scrollBottom = () =>
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

  useEffect(() => {
    if (!open || !projectId) return;

    api.get(`/projects/${projectId}/messages`).then((res) => {
      setMessages(res.data);
      scrollBottom();
    });

    const socket = getSocket();

    const onNew = (newMsg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollBottom();
    };

    const onUpdate = (updated: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
    };

    socket.on(`project_${projectId}_message`, onNew);
    socket.on(`project_${projectId}_message_update`, onUpdate);

    return () => {
      socket.off(`project_${projectId}_message`, onNew);
      socket.off(`project_${projectId}_message_update`, onUpdate);
    };
  }, [open, projectId]);

  useEffect(() => {
    if (forwardMessage) {
      api.get('/projects').then((res) =>
        setMyProjects(
          res.data.filter((p: any) => p.statut !== 'archive'),
        ),
      );
    }
  }, [forwardMessage]);

  const envoyerTexte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;

    try {
      if (editingMsgId) {
        await api.patch(`/projects/messages/${editingMsgId}`, {
          message: texte,
        });
        setEditingMsgId(null);
      } else {
        await api.post(`/projects/${projectId}/messages`, {
          message: texte,
        });
      }
      setTexte('');
    } catch {
      alert('Erreur envoi / modification');
    }
  };

  const handleEdit = (msg: Message) => {
    if (msg.isDeleted || msg.message.startsWith('[')) {
      return alert('Seuls les messages texte peuvent être modifiés');
    }
    setEditingMsgId(msg.id);
    setTexte(msg.message);
    setMenuMsgId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message pour tout le monde ?')) return;
    try {
      await api.delete(`/projects/messages/${id}`);
      setMenuMsgId(null);
    } catch {
      alert('Erreur suppression');
    }
  };

  const handleCopy = async (msg: Message) => {
    let text = msg.message;
    if (text.startsWith('[TRANSFERT]')) text = text.replace('[TRANSFERT]', '').trim();
    if (text.startsWith('[FILE]')) {
      const parts = text.replace('[FILE]', '').split('|');
      text = parts[1] || 'Fichier';
    }
    if (text.startsWith('[IMAGE]') || text.startsWith('[AUDIO]')) {
      text = text.replace(/^\[(IMAGE|AUDIO)\]/, '').trim();
    }
    await navigator.clipboard.writeText(text);
    setMenuMsgId(null);
    alert('Message copié');
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
    const audioFile = await stopRecording();
    if (audioFile) handleFileUpload(audioFile, '[AUDIO]');
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
      await api.post(`/projects/${projectId}/messages`, {
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
          <div className="text-[10px] uppercase tracking-wide opacity-70 border-l-2 border-white/40 pl-2">
            Message transféré
          </div>
          <div>{parseMessage(msg.replace('[TRANSFERT]', '').trim())}</div>
        </div>
      );
    }

    if (msg.startsWith('[AUDIO]')) {
      const pathUrl = msg.replace('[AUDIO]', '');
      return (
        <audio
          controls
          src={`${baseURL}${pathUrl}?token=${token}`}
          className="w-48 sm:w-56 h-10 rounded-lg"
        />
      );
    }

    if (msg.startsWith('[IMAGE]')) {
      const pathUrl = msg.replace('[IMAGE]', '');
      const src = `${baseURL}${pathUrl}?token=${token}`;
      return (
        <img
          src={src}
          alt="Image"
          className="max-w-full max-h-48 rounded-lg cursor-pointer"
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
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl"
        >
          <Download size={16} />
          <span className="text-sm font-bold truncate max-w-[140px]">
            {fileName || 'Document'}
          </span>
        </a>
      );
    }

    return <span className="whitespace-pre-wrap">{msg}</span>;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_20px_rgba(79,195,247,0.4)] hover:scale-110 transition"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {open && (
        <div className="glass-card w-[350px] sm:w-[400px] h-[560px] flex flex-col rounded-2xl overflow-hidden bg-[#0A2540]/95 border border-white/20 shadow-2xl">
          <div className="bg-white/10 p-4 flex justify-between items-center border-b border-white/10">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              <MessageSquare size={18} /> Chat Équipe
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-white/40 mt-10">
                Aucun message. Lancez la discussion.
              </p>
            ) : (
              messages.map((m) => {
                const isMe = m.userId === currentUser?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span
                        className={`text-xs font-bold ${isMe ? 'text-itec-sky' : 'text-white'}`}
                      >
                        {isMe ? 'Vous' : m.user?.nom || 'Inconnu'}
                      </span>
                      <span className="text-[9px] text-white/40">
                        {new Date(m.creeLe).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {m.isEdited && !m.isDeleted && (
                        <span className="text-[9px] text-white/30 italic">
                          modifié
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-end gap-1 max-w-[88%]">
                      {isMe && (
                        <button
                          type="button"
                          onClick={() =>
                            setMenuMsgId(menuMsgId === m.id ? null : m.id)
                          }
                          className="p-1 text-white/40 hover:text-white mb-1"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() =>
                            setMenuMsgId(menuMsgId === m.id ? null : m.id)
                          }
                          className="order-2 p-1 text-white/40 hover:text-white mb-1"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}

                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm break-words ${
                          m.isDeleted
                            ? 'bg-white/5 text-white/40 italic'
                            : isMe
                              ? 'bg-gradient-to-r from-itec-sky to-blue-500 text-white rounded-br-sm'
                              : 'bg-white/10 text-white rounded-bl-sm border border-white/5'
                        }`}
                      >
                        {parseMessage(m.message)}
                      </div>

                      {menuMsgId === m.id && (
                        <div
                          className={`absolute z-30 top-0 ${isMe ? 'right-8' : 'left-8'} glass-card bg-[#0A2540] border border-white/20 p-1.5 min-w-[150px] shadow-xl`}
                        >
                          <button
                            className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg"
                            onClick={() => handleCopy(m)}
                          >
                            <Copy size={14} /> Copier
                          </button>
                          <button
                            className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg"
                            onClick={() => {
                              setForwardMessage(m);
                              setMenuMsgId(null);
                            }}
                          >
                            <Forward size={14} /> Transférer
                          </button>
                          {isMe &&
                            !m.isDeleted &&
                            !m.message.startsWith('[') && (
                              <button
                                className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg"
                                onClick={() => handleEdit(m)}
                              >
                                <Edit2 size={14} /> Modifier
                              </button>
                            )}
                          {isMe && !m.isDeleted && (
                            <button
                              className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded-lg"
                              onClick={() => handleDelete(m.id)}
                            >
                              <Trash2 size={14} /> Supprimer
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

          <form
            onSubmit={envoyerTexte}
            className="p-3 bg-black/20 border-t border-white/10 space-y-2"
          >
            {editingMsgId && (
              <div className="flex justify-between items-center text-xs text-itec-sky bg-white/5 px-3 py-1.5 rounded-lg">
                <span>Modification en cours…</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMsgId(null);
                    setTexte('');
                  }}
                  className="text-white/50 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex gap-2 items-center px-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0])
                    handleFileUpload(e.target.files[0], '[IMAGE]');
                }}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="p-2 bg-white/5 hover:bg-white/10 text-itec-sky rounded-full"
              >
                <ImageIcon size={18} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0])
                    handleFileUpload(e.target.files[0], '[FILE]');
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2 bg-white/5 hover:bg-white/10 text-itec-sky rounded-full"
              >
                <Paperclip size={18} />
              </button>

              <div className="flex-1" />

              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={handleStopRecording}
                onTouchStart={startRecording}
                onTouchEnd={handleStopRecording}
                disabled={uploading}
                className={`p-2 rounded-full ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white/5 text-itec-sky hover:bg-white/10'
                }`}
              >
                <Mic size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                disabled={isRecording || uploading}
                placeholder={
                  uploading
                    ? 'Envoi…'
                    : editingMsgId
                      ? 'Modifier le message…'
                      : 'Votre message…'
                }
                className="glass-input flex-1 px-4 py-2 rounded-full text-sm"
              />
              <button
                type="submit"
                disabled={isRecording || uploading || !texte.trim()}
                className="bg-itec-sky text-[#0A2540] rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Transférer */}
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