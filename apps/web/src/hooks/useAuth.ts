import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  signInWithGoogle,
  signInAnonymous,
  signUpWithEmail,
  signInWithEmail,
  signOut,
} from '@/services/auth.service';
import {
  getUserProfile,
  createUserProfile,
} from '@/services/users.service';
import type { User } from '@/types/user';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    loading: true,
    error: null,
  });

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get or create user profile
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            await createUserProfile(firebaseUser.uid);
            profile = await getUserProfile(firebaseUser.uid);
          }
          setState({
            firebaseUser,
            userProfile: profile,
            loading: false,
            error: null,
          });
        } catch (err) {
          setState({
            firebaseUser,
            userProfile: null,
            loading: false,
            error: 'Failed to load user profile',
          });
        }
      } else {
        setState({
          firebaseUser: null,
          userProfile: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithGoogle();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Google login failed',
      }));
    }
  }, []);

  const loginAnonymously = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInAnonymous();
    } catch (err) {
      console.error('Anonymous login error:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: '匿名ログインに失敗しました',
      }));
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code;
      let errorMessage = 'メールログインに失敗しました';
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = '無効なメールアドレスです';
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signUpWithEmail(email, password);
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code;
      let errorMessage = '登録に失敗しました';
      if (errorCode === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = '無効なメールアドレスです';
      } else if (errorCode === 'auth/weak-password') {
        errorMessage = 'パスワードは6文字以上で入力してください';
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signOut();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Logout failed',
      }));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.firebaseUser) return;
    try {
      const profile = await getUserProfile(state.firebaseUser.uid);
      setState((prev) => ({ ...prev, userProfile: profile }));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, [state.firebaseUser]);

  return {
    user: state.firebaseUser,
    profile: state.userProfile,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.firebaseUser,
    isProfileComplete:
      !!state.userProfile?.nickname && state.userProfile?.banzukeConsent,
    loginWithGoogle,
    loginAnonymously,
    loginWithEmail,
    registerWithEmail,
    logout,
    refreshProfile,
  };
}
