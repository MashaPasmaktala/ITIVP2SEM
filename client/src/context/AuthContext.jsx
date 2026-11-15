import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getMe, logoutUser } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Перечитать текущего пользователя с сервера (например, после смены роли)
  const refreshUser = useCallback(
    () =>
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => setUser(null)),
    []
  );

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  if (loading) return <div className="loading">Проверка авторизации...</div>;

  return <AuthContext.Provider value={{ user, setUser, refreshUser, logout }}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
