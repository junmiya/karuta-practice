/**
 * 107: 内弟子QR入口 - joinAsUchideshi
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireAuth } from './lib/adminAuth';
import { ensureBillingOnJoinInternal } from './billingFunctions';

const db = admin.firestore();

/**
 * 内弟子として参加（トークン検証 → siteRole='tester' + isUchideshiFree=true + status='FREE'）
 */
export const joinAsUchideshi = functions
  .region('asia-northeast1')
  .https.onCall(async (data: { token: string }, context) => {
    const uid = requireAuth(context);

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
    await ensureBillingOnJoinInternal(uid);

    return { success: true };
  });
