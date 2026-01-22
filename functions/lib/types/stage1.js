"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TITLE_REQUIREMENTS = exports.COLLECTIONS = void 0;
exports.rankingDocId = rankingDocId;
exports.banzukeDocId = banzukeDocId;
exports.dailyReflectionDocId = dailyReflectionDocId;
// =============================================================================
// コレクションID定数
// =============================================================================
exports.COLLECTIONS = {
    SEASONS: 'seasons',
    RANKINGS: 'rankings',
    BANZUKE_SNAPSHOTS: 'banzukeSnapshots',
    DAILY_REFLECTIONS: 'dailyReflections',
    TITLES: 'titles',
    AUDIT_LOGS: 'auditLogs',
};
// =============================================================================
// ドキュメントID生成ヘルパー
// =============================================================================
function rankingDocId(seasonId, division) {
    return `${seasonId}_${division}`;
}
function banzukeDocId(seasonId, division) {
    return `${seasonId}_${division}`;
}
function dailyReflectionDocId(seasonId, division, dayKeyJst) {
    // dayKeyJst: "2026-01-18" -> "20260118"
    const yyyymmdd = dayKeyJst.replace(/-/g, '');
    return `${seasonId}_${division}_${yyyymmdd}`;
}
// =============================================================================
// 称号判定定数
// =============================================================================
exports.TITLE_REQUIREMENTS = {
    MIN_PARTICIPANTS: 24, // 最低参加者数
    MEIJIN_COUNT: 4, // 名人達成回数
    EISEI_COUNT: 8, // 永世達成回数
};
//# sourceMappingURL=stage1.js.map