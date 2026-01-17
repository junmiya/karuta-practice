import type { Poem } from './poem';

export interface Question {
  poem: Poem; // The correct poem for this question
  choices: string[]; // 8 tori choices (1 correct + 7 decoys)
  choiceKanas: string[]; // 8 toriKana choices (hiragana-only versions)
  correctIndex: number; // Index of the correct answer in choices array
  startTime: number; // performance.now() timestamp when choices displayed
  answered: boolean;
  selectedIndex: number | null;
  elapsedMs: number | null; // Time taken to answer (ms)
  isCorrect: boolean | null;
}

export interface PracticeSession {
  questions: Question[];
  currentQuestionIndex: number;
  isComplete: boolean;
  totalElapsedMs: number;
  correctCount: number;
  avgMs: number;
}

export interface PracticeResult {
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
}
