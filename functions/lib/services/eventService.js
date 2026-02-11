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
exports.createMatchEvent = createMatchEvent;
exports.createKyuiExamEvent = createKyuiExamEvent;
exports.getSeasonEvents = getSeasonEvents;
exports.getUserSeasonEvents = getUserSeasonEvents;
/**
 * 102: 歌合イベント Firestore CRUD
 * Collection: events/{eventId}
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const utaawase_1 = require("../types/utaawase");
const ruleEngine_1 = require("../lib/ruleEngine");
const seasonCalendarService_1 = require("./seasonCalendarService");
const rulesetService_1 = require("./rulesetService");
const db = admin.firestore();
/**
 * 公式競技セッション確定時にmatchイベントを自動生成
 */
async function createMatchEvent(input) {
    const { uid, sessionId, score, correctCount, totalElapsedMs, allCards, participantCount, startedAt } = input;
    // Determine season from calendar
    const year = startedAt.getFullYear();
    // Try current year, then previous year (winter spanning)
    let seasonInfo = null;
    for (const y of [year, year - 1]) {
        const calendar = await (0, seasonCalendarService_1.getSeasonCalendar)(y);
        if (calendar) {
            const { determineSeason: ds } = await Promise.resolve().then(() => __importStar(require('../lib/ruleEngine')));
            seasonInfo = ds(calendar, startedAt);
            if (seasonInfo)
                break;
        }
    }
    if (!seasonInfo) {
        console.warn(`No season calendar found for event at ${startedAt.toISOString()}`);
        return null;
    }
    // Determine tier
    const ruleset = await (0, rulesetService_1.getRuleset)();
    const officialMin = ruleset?.officialMinParticipants || 24;
    const tier = (0, ruleEngine_1.determineTier)(participantCount, officialMin);
    const seasonKey = `${seasonInfo.seasonYear}_${seasonInfo.seasonId}`;
    const eventRef = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.EVENTS).doc();
    const matchData = {
        sessionId,
        score,
        correctCount,
        totalElapsedMs,
        allCards,
    };
    const event = {
        eventId: eventRef.id,
        uid,
        eventType: 'match',
        seasonId: seasonInfo.seasonId,
        seasonYear: seasonInfo.seasonYear,
        seasonKey,
        tier,
        participantCount,
        matchData,
        startedAt: firestore_1.Timestamp.fromDate(startedAt),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await eventRef.set(event);
    return event;
}
/**
 * 級位検定イベントを記録
 */
async function createKyuiExamEvent(input) {
    const { uid, kimarijiFuda, questionCount, correctCount, totalElapsedMs, allCards, passed, startedAt } = input;
    // Determine season
    const year = startedAt.getFullYear();
    let seasonInfo = null;
    for (const y of [year, year - 1]) {
        const calendar = await (0, seasonCalendarService_1.getSeasonCalendar)(y);
        if (calendar) {
            const { determineSeason: ds } = await Promise.resolve().then(() => __importStar(require('../lib/ruleEngine')));
            seasonInfo = ds(calendar, startedAt);
            if (seasonInfo)
                break;
        }
    }
    if (!seasonInfo) {
        console.warn(`No season calendar found for exam at ${startedAt.toISOString()}`);
        return null;
    }
    const seasonKey = `${seasonInfo.seasonYear}_${seasonInfo.seasonId}`;
    const eventRef = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.EVENTS).doc();
    const passRate = questionCount > 0 ? (correctCount / questionCount) * 100 : 0;
    const examData = {
        kimarijiFuda,
        questionCount,
        correctCount,
        totalElapsedMs,
        allCards,
        passRate,
        passed,
    };
    const event = {
        eventId: eventRef.id,
        uid,
        eventType: 'kyui_exam',
        seasonId: seasonInfo.seasonId,
        seasonYear: seasonInfo.seasonYear,
        seasonKey,
        tier: null, // exams have no tier
        participantCount: null,
        examData,
        startedAt: firestore_1.Timestamp.fromDate(startedAt),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await eventRef.set(event);
    return event;
}
/**
 * シーズンのイベント一覧を取得
 */
async function getSeasonEvents(seasonKey, eventType) {
    let q = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.EVENTS)
        .where('seasonKey', '==', seasonKey);
    if (eventType) {
        q = q.where('eventType', '==', eventType);
    }
    const snapshot = await q.get();
    return snapshot.docs.map((doc) => doc.data());
}
/**
 * ユーザーのシーズンイベントを取得
 */
async function getUserSeasonEvents(uid, seasonKey) {
    const snapshot = await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.EVENTS)
        .where('uid', '==', uid)
        .where('seasonKey', '==', seasonKey)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
//# sourceMappingURL=eventService.js.map