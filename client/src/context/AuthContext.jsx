import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api/client';
import { getSupportedCurrencyCodes, setActiveCurrencyCode } from '../utils/format';

const AuthContext = createContext(null);

const STORAGE_KEY = 'finpilot_token';
const DEFAULT_CURRENCY_CODE = 'USD';

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    setAuthToken(token);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled) {
          const currencyCode = data.currencyCode || DEFAULT_CURRENCY_CODE;
          setUser({ ...data, currencyCode });
          setActiveCurrencyCode(currencyCode);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_KEY);
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setToken = (t) => {
    if (t) localStorage.setItem(STORAGE_KEY, t);
    else localStorage.removeItem(STORAGE_KEY);
    setTokenState(t);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    const currencyCode = data.currencyCode || DEFAULT_CURRENCY_CODE;
    setUser({ _id: data._id, name: data.name, email: data.email, currencyCode });
    setActiveCurrencyCode(currencyCode);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setToken(data.token);
    const currencyCode = data.currencyCode || DEFAULT_CURRENCY_CODE;
    setUser({ _id: data._id, name: data.name, email: data.email, currencyCode });
    setActiveCurrencyCode(currencyCode);
    return data;
  };

  const updateCurrencyCode = async (currencyCode) => {
    const { data } = await api.patch('/auth/me', { currencyCode });
    const normalized = data.currencyCode || DEFAULT_CURRENCY_CODE;
    setUser((prev) => (prev ? { ...prev, currencyCode: normalized } : prev));
    setActiveCurrencyCode(normalized);
    return normalized;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveCurrencyCode(DEFAULT_CURRENCY_CODE);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      updateCurrencyCode,
      supportedCurrencyCodes: user?.supportedCurrencyCodes || getSupportedCurrencyCodes(),
      logout,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
