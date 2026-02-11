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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetUserBillingStatuses = exports.adminSetMaxGroups = exports.setUchideshiFree = exports.createPortalSession = exports.createCheckoutSession = exports.ensureBillingOnJoin = void 0;
exports.ensureBillingOnJoinInternal = ensureBillingOnJoinInternal;
/**
 * 107: 課金MVP - Cloud Functions
 * ensureBillingOnJoin, createCheckoutSession, createPortalSession,
 * setUchideshiFree, adminSetMaxGroups, adminGetUserBillingStatuses
 */
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const adminAuth_1 = require("./lib/adminAuth");
const db = admin.firestore();
// Stripe 初期化（lazy）
let _stripe = null;
function getStripe() {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key)
            throw new functions.https.HttpsError('internal', 'Stripe secret key not configured');
        _stripe = new stripe_1.default(key);
    }
    return _stripe;
}
const PLAN_PRICE_YEN = 300;
const TRIAL_DAYS = 30;
/**
 * 課金レコード初期化（冪等）
 * 既存レコードがあればスキップ
 */
async function ensureBillingOnJoinInternal(uid) {
    const billingRef = db.collection('users').doc(uid).collection('billing');
    const subDoc = await billingRef.doc('subscription').get();
    if (subDoc.exists)
        return; // 既存なら何もしない
    const now = admin.firestore.FieldValue.serverTimestamp();
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    // entitlement を先にチェック（内弟子かどうか）
    const entDoc = await billingRef.doc('entitlement').get();
    const isUchideshiFree = entDoc.exists && entDoc.data()?.isUchideshiFree === true;
    const batch = db.batch();
    batch.set(billingRef.doc('subscription'), {
        planPriceYen: PLAN_PRICE_YEN,
        status: isUchideshiFree ? 'FREE' : 'TRIAL',
        joinedAt: now,
        trialEndsAt: admin.firestore.Timestamp.fromDate(trialEndsAt),
        updatedAt: now,
    });
    if (!entDoc.exists) {
        batch.set(billingRef.doc('entitlement'), {
            isUchideshiFree: false,
            updatedAt: now,
        });
    }
    // limits/groupCreation 初期化
    const limitsRef = db.collection('users').doc(uid).collection('limits');
    const limitDoc = await limitsRef.doc('groupCreation').get();
    if (!limitDoc.exists) {
        batch.set(limitsRef.doc('groupCreation'), {
            maxGroups: 2,
            updatedAt: now,
        });
    }
    await batch.commit();
}
/**
 * 課金レコード初期化（Callable）
 */
exports.ensureBillingOnJoin = functions
    .region('asia-northeast1')
    .https.onCall(async (_data, context) => {
    const uid = (0, adminAuth_1.requireAuth)(context);
    await ensureBillingOnJoinInternal(uid);
    return { success: true };
});
/**
 * Stripe Checkout Session 作成
 */
exports.createCheckoutSession = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = (0, adminAuth_1.requireAuth)(context);
    const stripe = getStripe();
    const billingRef = db.collection('users').doc(uid).collection('billing');
    const subDoc = await billingRef.doc('subscription').get();
    const subData = subDoc.data();
    // Stripe Customer 取得 or 作成
    let customerId = subData?.stripeCustomerId;
    if (!customerId) {
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const customer = await stripe.customers.create({
            metadata: { firebaseUid: uid },
            email: userData?.email || undefined,
            name: userData?.nickname || undefined,
        });
        customerId = customer.id;
        await billingRef.doc('subscription').update({
            stripeCustomerId: customerId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId)
        throw new functions.https.HttpsError('internal', 'Stripe price ID not configured');
    const baseUrl = data.successUrl?.replace(/\/[^/]*$/, '') || 'https://karuta-banzuke.web.app';
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/profile?billing=success`,
        cancel_url: `${baseUrl}/enrollment?billing=canceled`,
        metadata: { firebaseUid: uid },
    });
    return { url: session.url };
});
/**
 * Stripe Customer Portal Session 作成
 */
exports.createPortalSession = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    const uid = (0, adminAuth_1.requireAuth)(context);
    const stripe = getStripe();
    const subDoc = await db.collection('users').doc(uid)
        .collection('billing').doc('subscription').get();
    const customerId = subDoc.data()?.stripeCustomerId;
    if (!customerId) {
        throw new functions.https.HttpsError('failed-precondition', 'Stripe顧客情報がありません');
    }
    const returnUrl = data.returnUrl || 'https://karuta-banzuke.web.app/profile';
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
    return { url: session.url };
});
/**
 * 内弟子割の設定（管理者のみ）
 */
exports.setUchideshiFree = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    const { uid, isUchideshiFree } = data;
    if (!uid || typeof isUchideshiFree !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', 'uid と isUchideshiFree が必要です');
    }
    const billingRef = db.collection('users').doc(uid).collection('billing');
    const now = admin.firestore.FieldValue.serverTimestamp();
    await billingRef.doc('entitlement').set({
        isUchideshiFree,
        updatedAt: now,
    }, { merge: true });
    // FREE ステータスへ更新
    if (isUchideshiFree) {
        await billingRef.doc('subscription').update({
            status: 'FREE',
            updatedAt: now,
        });
    }
    return { success: true };
});
/**
 * 団体作成上限の設定（管理者のみ）
 */
exports.adminSetMaxGroups = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    const { uid, maxGroups } = data;
    if (!uid || typeof maxGroups !== 'number' || maxGroups < 0) {
        throw new functions.https.HttpsError('invalid-argument', 'uid と maxGroups（0以上）が必要です');
    }
    await db.collection('users').doc(uid).collection('limits').doc('groupCreation').set({
        maxGroups,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true };
});
/**
 * 管理者用：ユーザーの課金ステータス一括取得
 */
exports.adminGetUserBillingStatuses = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    await (0, adminAuth_1.requireAdmin)(context);
    const { uids } = data;
    if (!Array.isArray(uids) || uids.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'uids 配列が必要です');
    }
    // 最大50件
    const targetUids = uids.slice(0, 50);
    const results = {};
    await Promise.all(targetUids.map(async (uid) => {
        const billingRef = db.collection('users').doc(uid).collection('billing');
        const [subDoc, entDoc] = await Promise.all([
            billingRef.doc('subscription').get(),
            billingRef.doc('entitlement').get(),
        ]);
        const sub = subDoc.data();
        const ent = entDoc.data();
        const isUchideshiFree = ent?.isUchideshiFree === true;
        let status = 'NONE';
        if (sub) {
            if (isUchideshiFree) {
                status = 'FREE';
            }
            else if (sub.status === 'ACTIVE') {
                status = 'ACTIVE';
            }
            else if (sub.status === 'CANCELED') {
                status = 'CANCELED';
            }
            else if (sub.trialEndsAt && sub.trialEndsAt.toDate() > new Date()) {
                status = 'TRIAL';
            }
            else {
                status = 'PAST_DUE';
            }
        }
        results[uid] = {
            status,
            trialEndsAt: sub?.trialEndsAt?.toDate()?.toISOString(),
            isUchideshiFree,
            stripeCustomerId: sub?.stripeCustomerId,
        };
    }));
    return { statuses: results };
});
//# sourceMappingURL=billingFunctions.js.map