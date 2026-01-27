import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  signInWithGoogle,
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
    let isSubscribed = true;

    // タイムアウト: 3秒経っても認証状態が確定しない場合はloading: falseに
    const timeout = setTimeout(() => {
      if (isSubscribed) {
        setState((prev) => {
          if (prev.loading) {
            console.warn('Auth state timeout - setting loading to false');
            return { ...prev, loading: false };
          }
          return prev;
        });
      }
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isSubscribed) return;

      if (firebaseUser) {
        try {
          // Get or create user profile
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            await createUserProfile(firebaseUser.uid);
            profile = await getUserProfile(firebaseUser.uid);
          }
          if (isSubscribed) {
            setState({
              firebaseUser,
              userProfile: profile,
              loading: false,
              error: null,
            });
          }
        } catch (err) {
          console.error('Failed to load user profile:', err);
          if (isSubscribed) {
            setState({
              firebaseUser,
              userProfile: null,
              loading: false,
              error: 'Failed to load user profile',
            });
          }
        }
      } else {
        if (isSubscribed) {
          setState({
            firebaseUser: null,
            userProfile: null,
            loading: false,
            error: null,
          });
        }
      }
    });

    return () => {
      isSubscribed = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error('Google login error:', err);
      const errorCode = (err as { code?: string })?.code;
      const errorMessage = (err as { message?: string })?.message;
      let displayError = 'Googleログインに失敗しました';
      if (errorMessage === 'Sign-in already in progress') {
        displayError = 'ログイン処理中です。しばらくお待ちください';
      } else if (errorCode === 'auth/popup-closed-by-user') {
        displayError = 'ログインがキャンセルされました';
      } else if (errorCode === 'auth/popup-blocked') {
        displayError = 'ポップアップがブロックされました。ポップアップを許可してください';
      } else if (errorCode === 'auth/cancelled-popup-request') {
        displayError = 'ログインがキャンセルされました';
      } else if (errorCode === 'auth/network-request-failed') {
        displayError = 'ネットワークエラーです。接続を確認してください';
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        error: displayError,
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
    loginWithEmail,
    registerWithEmail,
    logout,
    refreshProfile,
  };
}
