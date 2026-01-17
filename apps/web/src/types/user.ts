// User types for Phase 2+ (Auth & Profile)
// Not used in MVP (Practice-only mode)

export interface User {
  uid: string;
  nickname: string;
  banzukeConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}
