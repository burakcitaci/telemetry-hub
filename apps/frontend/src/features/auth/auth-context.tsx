import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { api, unwrap } from '@/shared/api/client';

export type UserRole = 'admin' | 'user';

export interface AuthSession {
  tenantSlug: string;
  role: UserRole;
  teamId?: string;
  teams: string[];
}

export interface LoginCredentials {
  tenantSlug: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  refreshSession: () => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((next: AuthSession) => {
    setSession(next);
    return next;
  }, []);

  useEffect(() => {
    api.get('/auth/session')
      .then(({ data }) => applySession(unwrap<AuthSession>(data)))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false));
  }, [applySession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { data } = await api.post('/auth/login', credentials);
    return applySession(unwrap<AuthSession>(data));
  }, [applySession]);

  const refreshSession = useCallback(async () => {
    const { data } = await api.get('/auth/session');
    const next = unwrap<AuthSession>(data);
    setSession(next);
    return next;
  }, []);
  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    session, isLoading, login, refreshSession, logout,
  }), [session, isLoading, login, refreshSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
