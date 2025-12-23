import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';
import { apiFetch } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (identifier: string, password: string, remember: boolean) => Promise<User | null>;
  logout: () => Promise<void>;
  booting: boolean;
  canEdit: (serviceId: number | null) => boolean;
  canDelete: (serviceId: number | null) => boolean;
  canShare: (serviceId: number | null) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
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
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      try {
        const text = await res.text();
        throw new Error(`Réponse non-JSON reçue depuis l'API (content-type: ${ct || 'inconnu'}). Début: ${text.slice(0, 80)}`);
      } catch {
        throw new Error(`Réponse non-JSON reçue depuis l'API (content-type: ${ct || 'inconnu'}).`);
      }
    }
    const data = await res.json();
    const nextUser: User | null = data?.user ?? null;
    if (nextUser) {
      setUser(nextUser);
      try { sessionStorage.setItem('auth:user', JSON.stringify(nextUser)); } catch { void 0 }
      // Clear all cached queries to avoid showing previous user's data
      try { queryClient.clear(); } catch { void 0 }
      // Load and apply enterprise UI preferences (theme & accent)
      try {
        const prefRes = await apiFetch('/api/ui-preferences', { toast: { error: { enabled: false } } });
        if (prefRes.ok) {
          const prefs = await prefRes.json() as { ui_theme?: 'light'|'dark'|'system'; ui_accent_color?: 'blue'|'green'|'purple' };
          if (prefs.ui_theme) applyTheme(prefs.ui_theme);
          if (prefs.ui_accent_color) applyAccent(prefs.ui_accent_color);
        }
      } catch { /* ignore */ }
      return nextUser;
    }
    return null;
  };

  const logout = async () => {
    // Clear local state first to avoid blocking the UI
    setUser(null);
    try { sessionStorage.removeItem('auth:user'); } catch { void 0 }
    // Clear cached queries so next user session starts clean
    try { queryClient.clear(); } catch { void 0 }
    // Fire-and-forget API call with short timeout and no toasts
    try {
      void apiFetch('/api/auth/logout', { method: 'POST', toast: { error: { enabled: false }, success: { enabled: false } } });
    } catch { void 0 }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const res = await apiFetch('/api/auth/me', { toast: { error: { enabled: false } } });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) {
            try {
              const text = await res.text();
              throw new Error(`Réponse non-JSON reçue depuis l'API (content-type: ${ct || 'inconnu'}). Début: ${text.slice(0, 80)}`);
            } catch {
              throw new Error(`Réponse non-JSON reçue depuis l'API (content-type: ${ct || 'inconnu'}).`);
            }
          }
          const me = (await res.json()) as User;
          setUser(me);
          try { sessionStorage.setItem('auth:user', JSON.stringify(me)); } catch { void 0 }
          // Load and apply enterprise UI preferences (theme & accent)
          try {
            const prefRes = await apiFetch('/api/ui-preferences', { toast: { error: { enabled: false } } });
            if (prefRes.ok) {
              const prefs = await prefRes.json() as { ui_theme?: 'light'|'dark'|'system'; ui_accent_color?: 'blue'|'green'|'purple' };
              if (prefs.ui_theme) applyTheme(prefs.ui_theme);
              if (prefs.ui_accent_color) applyAccent(prefs.ui_accent_color);
            }
          } catch { /* ignore */ }
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

function applyTheme(mode: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = mode === 'system' ? (mql ? mql.matches : false) : (mode === 'dark');
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function applyAccent(color: 'blue' | 'green' | 'purple') {
  const root = document.documentElement;
  const sets: Record<string, Record<string, string>> = {
    blue: {
      '--primary': '217 91% 60%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '217 91% 95%',
      '--accent-foreground': '217 91% 35%',
      '--ring': '217 91% 60%',
      '--sidebar-primary': '217 91% 60%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '217 91% 95%',
      '--sidebar-accent-foreground': '217 91% 35%',
      '--tab-active': '217 91% 60%',
      '--folder-hover': '217 91% 97%'
    },
    green: {
      '--primary': '142 70% 45%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '142 60% 92%',
      '--accent-foreground': '142 70% 30%',
      '--ring': '142 70% 45%',
      '--sidebar-primary': '142 70% 45%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '142 60% 20%',
      '--sidebar-accent-foreground': '142 70% 70%',
      '--tab-active': '142 70% 45%',
      '--folder-hover': '142 60% 96%'
    },
    purple: {
      '--primary': '262 83% 58%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '262 70% 94%',
      '--accent-foreground': '262 70% 40%',
      '--ring': '262 83% 58%',
      '--sidebar-primary': '262 83% 58%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '262 40% 22%',
      '--sidebar-accent-foreground': '262 83% 70%',
      '--tab-active': '262 83% 58%',
      '--folder-hover': '262 70% 96%'
    }
  };
  const set = sets[color];
  Object.entries(set).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });
}
