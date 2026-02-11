export type Division = 'kyu' | 'dan';

export interface Entry {
  uid: string;
  seasonId: string;
  division: Division;
  consentAt: Date;
  createdAt: Date;
}

// 段階0用（レガシー）
export interface SeasonLegacy {
  seasonId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'ended';
}

// 段階1用（新しい状態遷移）
export type SeasonStatus = 'open' | 'frozen' | 'finalized' | 'archived';

export interface Season {
  seasonId: string;
  name: string;
  status: SeasonStatus;
  startDate: Date;
  freezeDate?: Date;
  finalizeDate?: Date;
  archiveDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
