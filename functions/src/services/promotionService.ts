/**
 * 102: 段位・伝位・歌位 昇格判定
 * finalize時に実行
 */
import {
  SeasonSnapshot,
  PromotionRecord,
} from '../types/utaawase';
import { getRuleset } from './rulesetService';
import { getUserProgress, updateDanLevel, updateDenLevel, updateUtakuraiLevel, incrementOfficialWinCount, incrementChampionCount } from './userProgressService';
import { getSeasonEvents } from './eventService';
import { evaluateDanPromotion, evaluateDenPromotion, evaluateUtakuraiPromotion } from '../lib/ruleEngine';

/**
 * Run all promotions for a finalized season snapshot
 * Only official events count for dan/den/utakurai promotions
 */
export async function runPromotions(snapshot: SeasonSnapshot): Promise<PromotionRecord[]> {
  const ruleset = await getRuleset();
  if (!ruleset) {
    console.warn('No ruleset found, skipping promotions');
    return [];
  }

  const promotions: PromotionRecord[] = [];
  const { rankings, totalParticipants, seasonKey } = snapshot;

  // Get official events for this season
  const officialEvents = await getSeasonEvents(seasonKey, 'match');
  const officialOnly = officialEvents.filter((e) => e.tier === 'official');

  // Track official wins (top 1/3) and champions (rank 1) per user
  for (const entry of rankings) {
    const userOfficialEvents = officialOnly.filter((e) => e.uid === entry.uid);
    if (userOfficialEvents.length === 0) continue;

    // Check if user used all cards in at least one official match
    const hasAllCardsMatch = userOfficialEvents.some((e) => e.matchData?.allCards);

    // If rank is in top 1/3 of official participants, count as win
    const topThirdThreshold = Math.ceil(totalParticipants / 3);
    if (entry.rank <= topThirdThreshold) {
      await incrementOfficialWinCount(entry.uid);
    }

    // If rank 1, count as champion
    if (entry.rank === 1) {
      await incrementChampionCount(entry.uid);
    }

    // Get latest user progress for promotion evaluation
    const progress = await getUserProgress(entry.uid);

    // Dan promotion
    const danResult = evaluateDanPromotion(
      progress,
      entry.rank,
      totalParticipants,
      hasAllCardsMatch,
      ruleset
    );
    if (danResult?.promoted) {
      await updateDanLevel(entry.uid, danResult.newLevel);
      promotions.push({
        uid: entry.uid,
        nickname: entry.nickname,
        promotionType: 'dan',
        fromLevel: progress.danLevel || 'none',
        toLevel: danResult.newLevel,
      });
    }

    // Den promotion (re-fetch progress as dan may have changed denEligible)
    const progressAfterDan = await getUserProgress(entry.uid);
    const denResult = evaluateDenPromotion(progressAfterDan, ruleset);
    if (denResult?.promoted) {
      await updateDenLevel(entry.uid, denResult.newLevel);
      promotions.push({
        uid: entry.uid,
        nickname: entry.nickname,
        promotionType: 'den',
        fromLevel: progressAfterDan.denLevel || 'none',
        toLevel: denResult.newLevel,
      });
    }

    // Utakurai promotion
    const progressAfterDen = await getUserProgress(entry.uid);
    const utakuraiResult = evaluateUtakuraiPromotion(progressAfterDen, ruleset);
    if (utakuraiResult?.promoted) {
      await updateUtakuraiLevel(entry.uid, utakuraiResult.newLevel);
      promotions.push({
        uid: entry.uid,
        nickname: entry.nickname,
        promotionType: 'utakurai',
        fromLevel: progressAfterDen.utakuraiLevel || 'none',
        toLevel: utakuraiResult.newLevel,
      });
    }
  }

  return promotions;
}
