export type Division = 'kyu' | 'dan';

export interface Entry {
  uid: string;
  seasonId: string;
  division: Division;
  consentAt: Date;
  createdAt: Date;
}

export interface Season {
  seasonId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'ended';
}
