import {
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google account using redirect (more reliable on mobile/some browsers)
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Handle redirect result after returning from Google login
 * Call this on app initialization
 */
export async function handleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error('Redirect result error:', error);
    return null;
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Get current user (null if not authenticated)
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
