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
exports.joinAsUchideshi = void 0;
/**
 * 107: 内弟子QR入口 - joinAsUchideshi
 */
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const adminAuth_1 = require("./lib/adminAuth");
const billingFunctions_1 = require("./billingFunctions");
const db = admin.firestore();
/**
 * 内弟子として参加（トークン検証 → siteRole='tester' + isUchideshiFree=true + status='FREE'）
 */
exports.joinAsUchideshi = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = (0, adminAuth_1.requireAuth)(context);
    const { token } = data;
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'トークンが必要です');
    }
    // トークン検証
    const expectedToken = process.env.UCHIDESHI_TOKEN;
    if (!expectedToken || token !== expectedToken) {
        throw new functions.https.HttpsError('permission-denied', '無効なトークンです');
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    const userRef = db.collection('users').doc(uid);
    const billingRef = userRef.collection('billing');
    // siteRole='tester' を設定
    batch.update(userRef, {
        siteRole: 'tester',
        updatedAt: now,
    });
    // entitlement: isUchideshiFree=true を設定
    batch.set(billingRef.doc('entitlement'), {
        isUchideshiFree: true,
        updatedAt: now,
    }, { merge: true });
    await batch.commit();
    // billing レコード初期化（status='FREE' になる）
    await (0, billingFunctions_1.ensureBillingOnJoinInternal)(uid);
    return { success: true };
});
//# sourceMappingURL=joinFunctions.js.map