'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface User {
  id: string;
  nom: string;
  email: string;
  avatar?: string;
  isSuperAdmin: boolean; // 👈 NOUVEAU
  permissions: string[]; // 👈 NOUVEAU
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

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      api
        .get('/users/me')
        .then((res) => setUser(res.data))
        .catch(() => Cookies.remove('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, motDePasse: string) => {
    const res = await api.post('/auth/login', { email, motDePasse });
    Cookies.set('token', res.data.token, { expires: 7 });
    setUser(res.data.utilisateur);
  };

  const register = async (nom: string, email: string, motDePasse: string) => {
    const res = await api.post('/auth/register', { nom, email, motDePasse });
    Cookies.set('token', res.data.token, { expires: 7 });
    setUser(res.data.utilisateur);
  };

  const logout = () => {
    Cookies.remove('token');
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