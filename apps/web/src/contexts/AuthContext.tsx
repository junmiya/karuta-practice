import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/types/user';

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
