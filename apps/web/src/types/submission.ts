export interface Submission {
  id: string;
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
  clientSubmittedAt: Date;
  serverSubmittedAt: Date;
}

export interface SubmitPayload {
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
  clientSubmittedAt: number;
}

export interface SubmitResponse {
  success: boolean;
  submissionId: string;
  score: number;
  official: boolean;
  invalidReasons: string[];
  dayKeyJst: string;
}
