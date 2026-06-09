import { createContext, useContext, useState, useEffect } from 'react';
import { get, post } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    get(API_ENDPOINTS.AUTH.PROFILE)
      .then((res) => { setUser(res.data); localStorage.setItem('user', JSON.stringify(res.data)); })
      .catch(() => { localStorage.clear(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res;
  };

  const logout = async () => {
    try { await post(API_ENDPOINTS.AUTH.LOGOUT); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
