'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [year, setYear] = useState<number>(2026);

  // Exécuté uniquement côté client pour éviter l'erreur de rendu statique Next.js 16
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Décorations lumineuses en arrière-plan */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-itec-sky/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* BLOC CENTRAL */}
      <div className="glass-card max-w-lg w-full p-10 text-center relative z-10 flex flex-col items-center border border-white/10 shadow-2xl">
        
        {/* LOGO */}
        <img 
          src="/logo.jpg" 
          alt="ITEC Logo" 
          className="h-16 w-auto rounded-xl shadow-md object-contain"
        />
        
        <h1 className="text-3xl font-black text-white mb-4 tracking-wide">
          Espace Privé ITEC
        </h1>
        
        <p className="text-white/70 mb-10 text-[15px] leading-relaxed font-medium">
          Bienvenue sur la plateforme collaborative interne. Veuillez vous authentifier pour accéder à vos projets, tâches et discussions.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link 
            href="/login" 
            className="bg-gradient-to-r from-itec-sky to-blue-500 hover:from-blue-400 hover:to-blue-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg transition-transform transform hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center"
          >
            Se connecter
          </Link>
          <Link 
            href="/register" 
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-3.5 rounded-xl font-bold transition-all w-full sm:w-auto flex items-center justify-center"
          >
            Créer un compte
          </Link>
        </div>
      </div>

      <div className="mt-12 text-center text-white/40 text-xs font-medium z-10">
        © {year} ITEC. Accès restreint au personnel autorisé.
      </div>
    </div>
  );
}