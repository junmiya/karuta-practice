"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UTAKURAI_LEVELS_ORDERED = exports.DEN_LEVELS_ORDERED = exports.DAN_LEVELS_ORDERED = exports.KYUI_LEVELS_ORDERED = exports.UTAAWASE_COLLECTIONS = void 0;
exports.seasonKey = seasonKey;
// =============================================================================
// コレクションID定数
// =============================================================================
exports.UTAAWASE_COLLECTIONS = {
    RULESETS: 'rulesets',
    SEASON_CALENDARS: 'season_calendars',
    EVENTS: 'events',
    USER_PROGRESS: 'user_progress',
    SEASON_SNAPSHOTS: 'season_snapshots',
    JOB_RUNS: 'job_runs',
};
// =============================================================================
// ヘルパー定数
// =============================================================================
exports.KYUI_LEVELS_ORDERED = [
    'minarai', 'shokkyu', 'nikyu', 'sankyu', 'yonkyu', 'gokyu', 'rokkyu',
];
exports.DAN_LEVELS_ORDERED = [
    'shodan', 'nidan', 'sandan', 'yondan', 'godan', 'rokudan',
];
exports.DEN_LEVELS_ORDERED = [
    'shoden', 'chuden', 'okuden', 'kaiden',
];
exports.UTAKURAI_LEVELS_ORDERED = [
    'meijin', 'eisei_meijin',
];
function seasonKey(year, seasonId) {
    return `${year}_${seasonId}`;
}
//# sourceMappingURL=utaawase.js.map