export type SessionStatus =
  | 'created'
  | 'in_progress'
  | 'submitted'
  | 'confirmed'
  | 'invalid'
  | 'expired';

export interface Session {
  uid: string;
  seasonId: string;
  entryId: string;
  roundCount: number;
  status: SessionStatus;
  startedAt: Date;
  submittedAt?: Date;
  confirmedAt?: Date;
  score?: number;
  correctCount?: number;
  totalElapsedMs?: number;
  invalidReasons?: string[];
  dayKeyJst?: string;
}

export interface Round {
  roundIndex: number;
  correctPoemId: string;
  choices: string[];
  selectedPoemId: string;
  isCorrect: boolean;
  clientElapsedMs: number;
}
