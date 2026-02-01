/**
 * 102: 歌合・節気別歌位確定 - Admin V2 service (callable functions)
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Ruleset
export async function adminGetRuleset() {
  const fn = httpsCallable(functions, 'adminGetRuleset');
  const result = await fn();
  return result.data as { success: boolean; ruleset: any };
}

export async function adminSaveRuleset(ruleset: any) {
  const fn = httpsCallable(functions, 'adminSaveRuleset');
  const result = await fn({ ruleset });
  return result.data as { success: boolean; ruleset: any };
}

export async function adminSeedDefaultRuleset() {
  const fn = httpsCallable(functions, 'adminSeedDefaultRuleset');
  const result = await fn();
  return result.data as { success: boolean; ruleset: any };
}

// Season Calendar
export async function adminGetSeasonCalendar(year: number) {
  const fn = httpsCallable(functions, 'adminGetSeasonCalendar');
  const result = await fn({ year });
  return result.data as { success: boolean; calendar: any };
}

export async function adminSaveSeasonCalendar(calendar: any) {
  const fn = httpsCallable(functions, 'adminSaveSeasonCalendar');
  const result = await fn({ calendar });
  return result.data as { success: boolean; calendar: any };
}

export async function adminSeedDefaultCalendar() {
  const fn = httpsCallable(functions, 'adminSeedDefaultCalendar');
  const result = await fn();
  return result.data as { success: boolean; calendar: any };
}

// Pipeline controls (M3)
export async function adminFreezeSeason2(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminFreezeSeasonV2');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean };
}

export async function adminFinalizeSeason2(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminFinalizeSeasonV2');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean };
}

export async function adminPublishSeason(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminPublishSeasonV2');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean };
}

export async function adminGetJobRuns(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminGetJobRuns');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean; jobRuns: any[] };
}
