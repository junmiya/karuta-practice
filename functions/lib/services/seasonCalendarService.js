"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeasonCalendar = getSeasonCalendar;
exports.saveSeasonCalendar = saveSeasonCalendar;
exports.getCurrentSeasonInfo = getCurrentSeasonInfo;
exports.generate2026DefaultCalendar = generate2026DefaultCalendar;
/**
 * 102: 節気カレンダー Firestore CRUD
 * Document: season_calendars/{year}
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const utaawase_1 = require("../types/utaawase");
const ruleEngine_1 = require("../lib/ruleEngine");
const db = admin.firestore();
async function getSeasonCalendar(year) {
    const doc = await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_CALENDARS).doc(String(year)).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
async function saveSeasonCalendar(calendar) {
    const errors = (0, ruleEngine_1.validateSeasonCalendar)(calendar);
    if (errors.length > 0) {
        throw new Error(`Invalid calendar: ${errors.join(', ')}`);
    }
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_CALENDARS).doc(String(calendar.year));
    const existing = await ref.get();
    const data = {
        ...calendar,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: firestore_1.FieldValue.serverTimestamp() }),
    };
    await ref.set(data, { merge: true });
    const saved = await ref.get();
    return saved.data();
}
/**
 * 現在日時に対応するカレンダーと四季区分を取得
 */
async function getCurrentSeasonInfo(now) {
    const year = now.getFullYear();
    // Try current year calendar, then previous year (for winter spanning years)
    for (const y of [year, year - 1]) {
        const calendar = await getSeasonCalendar(y);
        if (!calendar)
            continue;
        const nowMs = now.getTime();
        for (const period of calendar.periods) {
            const startMs = period.start_at.toMillis();
            const endMs = period.end_at.toMillis();
            if (nowMs >= startMs && nowMs < endMs) {
                return {
                    calendar,
                    seasonId: period.seasonId,
                    seasonYear: y,
                    seasonKey: `${y}_${period.seasonId}`,
                };
            }
        }
    }
    return null;
}
/**
 * 2026年のデフォルト節気カレンダーを生成
 * 実際の天文データに基づく近似値
 */
function generate2026DefaultCalendar() {
    const toTs = (dateStr) => firestore_1.Timestamp.fromDate(new Date(dateStr));
    const boundaries = [
        { marker: 'risshun', datetime: toTs('2026-02-04T00:00:00+09:00') },
        { marker: 'rikka', datetime: toTs('2026-05-05T00:00:00+09:00') },
        { marker: 'risshuu', datetime: toTs('2026-08-07T00:00:00+09:00') },
        { marker: 'rittou', datetime: toTs('2026-11-07T00:00:00+09:00') },
        { marker: 'risshun_next', datetime: toTs('2027-02-03T00:00:00+09:00') },
    ];
    const periods = [
        { seasonId: 'spring', label: '春戦', start_at: toTs('2026-02-04T00:00:00+09:00'), end_at: toTs('2026-05-05T00:00:00+09:00') },
        { seasonId: 'summer', label: '夏戦', start_at: toTs('2026-05-05T00:00:00+09:00'), end_at: toTs('2026-08-07T00:00:00+09:00') },
        { seasonId: 'autumn', label: '秋戦', start_at: toTs('2026-08-07T00:00:00+09:00'), end_at: toTs('2026-11-07T00:00:00+09:00') },
        { seasonId: 'winter', label: '冬戦', start_at: toTs('2026-11-07T00:00:00+09:00'), end_at: toTs('2027-02-03T00:00:00+09:00') },
    ];
    return { year: 2026, boundaries, periods };
}
//# sourceMappingURL=seasonCalendarService.js.map