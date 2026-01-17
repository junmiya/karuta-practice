import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export Firestore instance for use in other modules
export const db = admin.firestore();

// Re-export callable functions
export { submitOfficialSession } from './submitOfficialSession';
