"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPromotions = runPromotions;
const rulesetService_1 = require("./rulesetService");
const userProgressService_1 = require("./userProgressService");
const eventService_1 = require("./eventService");
const ruleEngine_1 = require("../lib/ruleEngine");
/**
 * Run all promotions for a finalized season snapshot
 * Only official events count for dan/den/utakurai promotions
 */
async function runPromotions(snapshot) {
    const ruleset = await (0, rulesetService_1.getRuleset)();
    if (!ruleset) {
        console.warn('No ruleset found, skipping promotions');
        return [];
    }
    const promotions = [];
    const { rankings, totalParticipants, seasonKey } = snapshot;
    // Get official events for this season
    const officialEvents = await (0, eventService_1.getSeasonEvents)(seasonKey, 'match');
    const officialOnly = officialEvents.filter((e) => e.tier === 'official');
    // Track official wins (top 1/3) and champions (rank 1) per user
    for (const entry of rankings) {
        const userOfficialEvents = officialOnly.filter((e) => e.uid === entry.uid);
        if (userOfficialEvents.length === 0)
            continue;
        // Check if user used all cards in at least one official match
        const hasAllCardsMatch = userOfficialEvents.some((e) => e.matchData?.allCards);
        // If rank is in top 1/3 of official participants, count as win
        const topThirdThreshold = Math.ceil(totalParticipants / 3);
        if (entry.rank <= topThirdThreshold) {
            await (0, userProgressService_1.incrementOfficialWinCount)(entry.uid);
        }
        // If rank 1, count as champion
        if (entry.rank === 1) {
            await (0, userProgressService_1.incrementChampionCount)(entry.uid);
        }
        // Get latest user progress for promotion evaluation
        const progress = await (0, userProgressService_1.getUserProgress)(entry.uid);
        // Dan promotion
        const danResult = (0, ruleEngine_1.evaluateDanPromotion)(progress, entry.rank, totalParticipants, hasAllCardsMatch, ruleset);
        if (danResult?.promoted) {
            await (0, userProgressService_1.updateDanLevel)(entry.uid, danResult.newLevel);
            promotions.push({
                uid: entry.uid,
                nickname: entry.nickname,
                promotionType: 'dan',
                fromLevel: progress.danLevel || 'none',
                toLevel: danResult.newLevel,
            });
        }
        // Den promotion (re-fetch progress as dan may have changed denEligible)
        const progressAfterDan = await (0, userProgressService_1.getUserProgress)(entry.uid);
        const denResult = (0, ruleEngine_1.evaluateDenPromotion)(progressAfterDan, ruleset);
        if (denResult?.promoted) {
            await (0, userProgressService_1.updateDenLevel)(entry.uid, denResult.newLevel);
            promotions.push({
                uid: entry.uid,
                nickname: entry.nickname,
                promotionType: 'den',
                fromLevel: progressAfterDan.denLevel || 'none',
                toLevel: denResult.newLevel,
            });
        }
        // Utakurai promotion
        const progressAfterDen = await (0, userProgressService_1.getUserProgress)(entry.uid);
        const utakuraiResult = (0, ruleEngine_1.evaluateUtakuraiPromotion)(progressAfterDen, ruleset);
        if (utakuraiResult?.promoted) {
            await (0, userProgressService_1.updateUtakuraiLevel)(entry.uid, utakuraiResult.newLevel);
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
//# sourceMappingURL=promotionService.js.map