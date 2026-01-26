import {
  signInWithPopup,
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

// Prevent multiple sign-in attempts
let isSigningIn = false;

/**
 * Check for redirect result on page load
 */
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err) {
    console.error('Redirect result error:', err);
    return null;
  }
}

/**
 * Sign in with Google account
 * Uses redirect on mobile, popup on desktop
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (isSigningIn) {
    console.warn('Sign-in already in progress');
    throw new Error('Sign-in already in progress');
  }

  isSigningIn = true;

  try {
    // Check if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Use redirect for mobile (more reliable)
      await signInWithRedirect(auth, googleProvider);
      return null; // Will be handled by checkRedirectResult
    } else {
      // Use popup for desktop
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } finally {
    // Reset after a short delay to prevent rapid re-clicks
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
