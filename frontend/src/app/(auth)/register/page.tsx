'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (motDePasse !== confirmation) return setErreur('Les mots de passe ne correspondent pas');
    if (motDePasse.length < 6) return setErreur('6 caractères minimum pour le mot de passe');

    setChargement(true);
    try {
      await register(nom, email, motDePasse);
      router.push('/dashboard');
    } catch (err: any) {
      setErreur(err.response?.data?.message || "Erreur d'inscription.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-card p-8 sm:p-10 w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <img src="/logo-itec.jpg" alt="ITEC Logo" className="h-16 w-auto rounded-xl shadow-md" />
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-2">Inscription ITEC</h1>
        <p className="text-center text-white/50 mb-8 text-sm">Créez votre compte collaborateur</p>

        {erreur && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm text-center font-medium">
            ⚠️ {erreur}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Nom complet</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="glass-input w-full px-4 py-3 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Email professionnel</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass-input w-full px-4 py-3 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
              className="glass-input w-full px-4 py-3 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Confirmer</label>
            <input
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              className="glass-input w-full px-4 py-3 rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-gradient-to-r from-itec-sky to-blue-500 hover:from-blue-400 hover:to-blue-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg mt-4 disabled:opacity-50"
          >
            {chargement ? 'Création...' : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-white/50 mt-6 text-sm">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-itec-sky hover:text-white transition font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}