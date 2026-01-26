import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

// Prevent multiple sign-in attempts
let isSigningIn = false;

/**
 * Sign in with Google account using popup
 */
export async function signInWithGoogle(): Promise<User> {
  if (isSigningIn) {
    throw new Error('Sign-in already in progress');
  }

  isSigningIn = true;

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } finally {
    setTimeout(() => {
      isSigningIn = false;
    }, 1000);
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
