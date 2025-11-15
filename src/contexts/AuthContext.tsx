import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { mockUsers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (identifier: string) => Promise<User | null>;
  logout: () => void;
  canEdit: (serviceId: number | null) => boolean;
  canDelete: (serviceId: number | null) => boolean;
  canShare: (serviceId: number | null) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem('auth_user');
      if (!stored) return null;
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  const login = async (identifier: string): Promise<User | null> => {
    const normalized = identifier.trim().toLowerCase();
    const found = mockUsers.find(
      (u) => u.email.toLowerCase() === normalized || u.name.toLowerCase() === normalized
    );

    if (found) {
      setUser(found);
      try {
        window.localStorage.setItem('auth_user', JSON.stringify(found));
      } catch {
        // ignore storage errors
      }
      return found;
    }

    return null;
  };

  const logout = () => {
    setUser(null);
    try {
      window.localStorage.removeItem('auth_user');
    } catch {
      // ignore storage errors
    }
  };

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
    <AuthContext.Provider value={{ user, setUser, login, logout, canEdit, canDelete, canShare }}>
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
