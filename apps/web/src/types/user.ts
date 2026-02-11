// User types for Phase 2+ (Auth & Profile)

export type SiteRole = 'admin' | 'tester' | 'user' | 'banned';

export interface User {
  uid: string;
  nickname: string;
  banzukeConsent: boolean;
  siteRole?: SiteRole;
  createdAt: Date;
  updatedAt: Date;
}
