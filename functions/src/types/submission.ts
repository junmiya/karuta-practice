import { Timestamp } from 'firebase-admin/firestore';

export interface SubmitPayload {
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
  clientSubmittedAt: number; // Unix timestamp ms
}

export interface SubmitResponse {
  success: boolean;
  submissionId: string;
  score: number;
  official: boolean;
  invalidReasons: string[];
  dayKeyJst: string;
}

export interface SubmissionDocument {
  uid: string;
  nickname: string;
  dayKeyJst: string; // YYYY-MM-DD in JST
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
  score: number;
  official: boolean;
  invalidReasons: string[];
  clientSubmittedAt: Timestamp;
  serverSubmittedAt: Timestamp;
}
