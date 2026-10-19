import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname.startsWith('/login');
      // Ne redirige pas si on est déjà sur /login (évite boucle + spam console)
      if (!isLoginPage) {
        Cookies.remove('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;