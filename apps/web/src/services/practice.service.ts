import type { Poem } from '@/types/poem';
import type { Question, PracticeSession, PracticeResult } from '@/types/practice';
import { getRandomPoems, getAllPoemsSync } from './poems.service';

export interface PracticeFilter {
  kimarijiCounts?: number[]; // e.g., [1, 2] for 1字決まり and 2字決まり
}

/**
 * Generate 8 tori choices: 1 correct + 7 random decoys
 */
function generateChoices(correctPoem: Poem, allPoems: Poem[]): {
  choices: string[];
  choiceKanas: string[];
  correctIndex: number;
} {
  const choices: string[] = [correctPoem.tori];
  const choiceKanas: string[] = [correctPoem.toriKana];

  const decoyPoems = allPoems
    .filter(p => p.poemId !== correctPoem.poemId)
    .sort(() => Math.random() - 0.5)
    .slice(0, 7);

  choices.push(...decoyPoems.map(p => p.tori));
  choiceKanas.push(...decoyPoems.map(p => p.toriKana));

  // Shuffle choices (keeping tori and toriKana in sync)
  const shuffled = choices
    .map((choice, index) => ({
      choice,
      choiceKana: choiceKanas[index],
      originalIndex: index
    }))
    .sort(() => Math.random() - 0.5);

  const correctIndex = shuffled.findIndex(item => item.originalIndex === 0);

  return {
    choices: shuffled.map(item => item.choice),
    choiceKanas: shuffled.map(item => item.choiceKana),
    correctIndex,
  };
}

/**
 * Create a new practice session with N questions and optional filter
 */
export function createPracticeSession(
  questionCount: number = 10,
  filter?: PracticeFilter
): PracticeSession {
  const selectedPoems = getRandomPoems(questionCount, filter);
  const allPoems = getAllPoemsSync(); // Use all poems for decoys

  const questions: Question[] = selectedPoems.map(poem => {
    const { choices, choiceKanas, correctIndex } = generateChoices(poem, allPoems);

    return {
      poem,
      choices,
      choiceKanas,
      correctIndex,
      startTime: 0,
      answered: false,
      selectedIndex: null,
      elapsedMs: null,
      isCorrect: null,
    };
  });

  return {
    questions,
    currentQuestionIndex: 0,
    isComplete: false,
    totalElapsedMs: 0,
    correctCount: 0,
    avgMs: 0,
  };
}

/**
 * Calculate final results from completed session
 */
export function calculateResults(session: PracticeSession): PracticeResult {
  const answeredQuestions = session.questions.filter(q => q.answered);
  const correctCount = answeredQuestions.filter(q => q.isCorrect).length;
  const totalElapsedMs = answeredQuestions.reduce((sum, q) => sum + (q.elapsedMs || 0), 0);
  const avgMs = answeredQuestions.length > 0
    ? Math.round(totalElapsedMs / answeredQuestions.length)
    : 0;

  return {
    questionCount: session.questions.length,
    correctCount,
    totalElapsedMs,
    avgMs,
  };
}
