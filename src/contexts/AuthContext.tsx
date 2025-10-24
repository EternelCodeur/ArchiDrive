import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  canEdit: (serviceId: number | null) => boolean;
  canDelete: (serviceId: number | null) => boolean;
  canShare: (serviceId: number | null) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Simulated logged-in user (DG for demo)
  const [user, setUser] = useState<User>({
    id: 1,
    name: "Marie Dubois",
    email: "marie.dubois@entreprise.fr",
    role: "dg",
    service_id: null,
    enterprise_id: 1,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie"
  });

  const canEdit = (serviceId: number | null): boolean => {
    if (user?.role === 'dg') return true;
    if (user?.role === 'manager' && user.service_id === serviceId) return true;
    return false;
  };

  const canDelete = (serviceId: number | null): boolean => {
    if (user?.role === 'dg') return true;
    if (user?.role === 'manager' && user.service_id === serviceId) return true;
    return false;
  };

  const canShare = (serviceId: number | null): boolean => {
    if (user?.role === 'dg') return true;
    if (user?.role === 'manager' && user.service_id === serviceId) return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, canEdit, canDelete, canShare }}>
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
