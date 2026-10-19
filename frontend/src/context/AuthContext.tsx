'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

interface User {
  id: string;
  nom: string;
  email: string;
  avatar?: string;
  role?: string;
  isSuperAdmin: boolean;
  permissions: string[];
  sub?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  register: (nom: string, email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérification de la session au démarrage
  useEffect(() => {
    const token = Cookies.get('token') || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    
    if (token) {
      // Synchronisation des 2 stockages
      Cookies.set('token', token, { expires: 7 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }

      api
        .get('/users/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          Cookies.remove('token');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, motDePasse: string) => {
    const res = await api.post('/auth/login', { email, motDePasse });
    const token = res.data.token;

    Cookies.set('token', token, { expires: 7 });
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    
    setUser(res.data.utilisateur);
  };

  const register = async (nom: string, email: string, motDePasse: string) => {
    const res = await api.post('/auth/register', { nom, email, motDePasse });
    const token = res.data.token;

    Cookies.set('token', token, { expires: 7 });
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }

    setUser(res.data.utilisateur);
  };

  const logout = () => {
    // 1. Déconnexion explicite du Socket.io
    disconnectSocket();

    // 2. Nettoyage des jetons
    Cookies.remove('token');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }

    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
};