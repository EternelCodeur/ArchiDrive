import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { apiFetch } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (identifier: string, password: string, remember: boolean) => Promise<User | null>;
  logout: () => void;
  booting: boolean;
  canEdit: (serviceId: number | null) => boolean;
  canDelete: (serviceId: number | null) => boolean;
  canShare: (serviceId: number | null) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialUser: User | null = (() => {
    try {
      const raw = sessionStorage.getItem('auth:user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  })();
  const [user, setUser] = useState<User | null>(initialUser);
  const [booting, setBooting] = useState<boolean>(!initialUser);

  const login = async (identifier: string, password: string, remember: boolean): Promise<User | null> => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, remember }),
      toast: { success: { message: 'Connexion réussie' }, error: { message: 'Identifiants invalides' } },
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const nextUser: User | null = data?.user ?? null;
    if (nextUser) {
      setUser(nextUser);
      try { sessionStorage.setItem('auth:user', JSON.stringify(nextUser)); } catch { void 0 }
      return nextUser;
    }
    return null;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', toast: { success: { message: 'Déconnexion réussie' } } });
    } catch { void 0 }
    setUser(null);
    try { sessionStorage.removeItem('auth:user'); } catch { void 0 }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const res = await apiFetch('/api/auth/me', { timeoutMs: 4000, toast: { error: { enabled: false } } });
        if (res.ok) {
          const me = (await res.json()) as User;
          setUser(me);
          try { sessionStorage.setItem('auth:user', JSON.stringify(me)); } catch { void 0 }
        } else if (res.status === 401) {
          setUser(null);
          try { sessionStorage.removeItem('auth:user'); } catch { void 0 }
        } else {
          // Keep cached user on transient/network/server errors to avoid accidental logout
          // No state change
        }
      } catch { void 0 } finally {
        setBooting(false);
      }
    };
    boot();
  }, []);

  const canEdit = (serviceId: number | null): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin') return true;
    if (user.role === 'agent' && user.service_id === serviceId) return true;
    return false;
  };

  const canDelete = (serviceId: number | null): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin') return true;
    if (user.role === 'agent' && user.service_id === serviceId) return true;
    return false;
  };

  const canShare = (serviceId: number | null): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin') return true;
    if (user.role === 'agent' && user.service_id === serviceId) return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, booting, canEdit, canDelete, canShare }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
