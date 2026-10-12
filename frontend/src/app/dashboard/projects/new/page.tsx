'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { User } from '@/types';
import { ArrowLeft, Users } from 'lucide-react';

export default function NewProjectPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    api.get('/users').then((res) => {
      setAllUsers(res.data.filter((u: User) => u.id !== user?.id));
    });
  }, [user]);

  const toggleMembre = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      const res = await api.post('/projects', { nom, description, dateDebut, dateFin, membresIds: selectedIds });
      router.push(`/dashboard/projects/${res.data.id}`);
    } catch (err: any) {
      setErreur(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-itec-sky hover:text-white transition mb-6 font-medium w-fit">
          <ArrowLeft size={18} /> Retour au Dashboard
        </Link>

        <div className="glass-card p-8 sm:p-10">
          <h1 className="text-2xl font-bold text-white mb-2">Créer un espace de travail</h1>
          <p className="text-white/60 text-sm mb-8">Définissez les paramètres de votre nouveau projet.</p>

          {erreur && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              ⚠️ {Array.isArray(erreur) ? erreur.join(', ') : erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Nom du projet *</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                placeholder="Ex: Refonte de la base de données..."
                className="glass-input w-full px-4 py-3 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Objectifs principaux du projet..."
                className="glass-input w-full px-4 py-3 rounded-xl resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Date de début *</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  required
                  className="glass-input w-full px-4 py-3 rounded-xl [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Date de fin *</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  required
                  className="glass-input w-full px-4 py-3 rounded-xl [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-itec-sky" />
                <label className="block text-sm font-bold text-white">Inviter des collaborateurs ({selectedIds.length}/19)</label>
              </div>
              
              {allUsers.length === 0 ? (
                <p className="text-sm text-white/40 italic bg-black/20 p-4 rounded-xl">Aucun autre collaborateur inscrit pour le moment.</p>
              ) : (
                <div className="bg-black/20 border border-white/10 rounded-xl max-h-48 overflow-y-auto divide-y divide-white/5 p-2">
                  {allUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer rounded-lg transition">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={() => toggleMembre(u.id)}
                        className="w-4 h-4 rounded border-gray-300 text-itec-sky focus:ring-itec-sky/50 bg-transparent"
                      />
                      <div>
                        <div className="text-sm font-medium text-white/90">{u.nom}</div>
                        <div className="text-xs text-white/40">{u.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={chargement}
              className="w-full bg-gradient-to-r from-itec-sky to-blue-500 hover:from-blue-400 hover:to-blue-600 text-white font-bold py-4 rounded-xl transition shadow-lg mt-4 disabled:opacity-50"
            >
              {chargement ? 'Initialisation du projet...' : 'Créer le projet'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}