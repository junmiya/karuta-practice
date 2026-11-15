/**
 * パスキー（WebAuthn）ログイン
 *
 * Firebase Auth にはパスキーの標準機能がないため、WebAuthn の登録・認証を
 * ここで行い、成功したら Firebase のカスタムトークンを返してログインさせる。
 *
 * - 登録: ログイン中のユーザーが自分のアカウントにパスキーを追加する
 * - ログイン: 登録済みパスキー（discoverable credential）で認証 → カスタムトークン
 *
 * Firestore（クライアントからは読み書き不可。Admin SDK のみ）:
 * - passkey_credentials/{credentialID}: 公開鍵・カウンター・所有者 uid など
 * - passkey_challenges/{challengeId}: 発行したチャレンジ（5分で失効、使用時に削除）
 *
 * 本番でカスタムトークンを発行するには、Functions の実行サービスアカウントに
 * 「サービス アカウント トークン作成者」(roles/iam.serviceAccountTokenCreator) が必要。
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';

const REGION = 'asia-northeast1';
const RP_NAME = '百人一首 カルタ番付';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_PASSKEYS_PER_USER = 10;

const CREDENTIALS = 'passkey_credentials';
const CHALLENGES = 'passkey_challenges';

/** パスキーを使ってよいページの origin（rpID はこのホスト名） */
export const PRODUCTION_ORIGINS = [
  'https://karuta-banzuke.web.app',
  'https://karuta-banzuke.firebaseapp.com',
];

const db = () => getFirestore();

// =============================================================================
// ヘルパー（テスト用に export）
// =============================================================================

/**
 * リクエスト元の origin を検証し、WebAuthn の origin と rpID を返す。
 * エミュレーター実行時のみ localhost を許可する。
 */
export function resolveRelyingParty(
  origin: string | undefined,
  isEmulator: boolean
): { origin: string; rpID: string } {
  if (!origin) {
    throw new functions.https.HttpsError('failed-precondition', 'このページからはパスキーを使えません');
  }
  if (PRODUCTION_ORIGINS.includes(origin)) {
    return { origin, rpID: new URL(origin).hostname };
  }
  if (isEmulator && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return { origin, rpID: 'localhost' };
  }
  throw new functions.https.HttpsError('failed-precondition', 'このページからはパスキーを使えません');
}

/** 端末名ラベルを整える（最大40文字、制御文字なし） */
export function sanitizeLabel(label: unknown): string {
  if (typeof label !== 'string') return 'パスキー';
  // eslint-disable-next-line no-control-regex
  const cleaned = label.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
  return cleaned || 'パスキー';
}

function originOf(context: functions.https.CallableContext): string | undefined {
  const header = context.rawRequest?.headers?.origin;
  return Array.isArray(header) ? header[0] : header;
}

function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === 'true';
}

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
  }
  return context.auth.uid;
}

interface StoredChallenge {
  challenge: string;
  type: 'register' | 'login';
  uid: string | null;
  rpID: string;
  origin: string;
  expireAt: Timestamp;
}

async function saveChallenge(data: Omit<StoredChallenge, 'expireAt'>): Promise<string> {
  const ref = db().collection(CHALLENGES).doc();
  await ref.set({
    ...data,
    // Firestore の TTL ポリシーを expireAt に設定すると未使用分も自動削除される
    expireAt: Timestamp.fromMillis(Date.now() + CHALLENGE_TTL_MS),
  });
  return ref.id;
}

/** チャレンジを取り出して削除（1回限り）。期限切れ・種類違いはエラー */
async function consumeChallenge(
  challengeId: unknown,
  type: StoredChallenge['type'],
  uid: string | null
): Promise<StoredChallenge> {
  if (typeof challengeId !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(challengeId)) {
    throw new functions.https.HttpsError('invalid-argument', '不正なリクエストです');
  }
  const ref = db().collection(CHALLENGES).doc(challengeId);
  const stored = await db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    tx.delete(ref);
    return snap.data() as StoredChallenge;
  });
  if (!stored || stored.type !== type || stored.uid !== uid) {
    throw new functions.https.HttpsError('failed-precondition', '時間切れです。もう一度お試しください');
  }
  if (stored.expireAt.toMillis() < Date.now()) {
    throw new functions.https.HttpsError('deadline-exceeded', '時間切れです。もう一度お試しください');
  }
  return stored;
}

// =============================================================================
// 登録（ログイン中のみ）
// =============================================================================

/** パスキー登録の開始: WebAuthn の登録オプションを返す */
export const passkeyRegisterOptions = functions
  .region(REGION)
  .https.onCall(async (_data: unknown, context) => {
    const uid = requireAuth(context);
    const { origin, rpID } = resolveRelyingParty(originOf(context), isEmulator());

    const existing = await db().collection(CREDENTIALS).where('uid', '==', uid).get();
    if (existing.size >= MAX_PASSKEYS_PER_USER) {
      throw new functions.https.HttpsError('resource-exhausted', `パスキーは${MAX_PASSKEYS_PER_USER}個まで登録できます`);
    }

    const user = await admin.auth().getUser(uid);
    const profile = (await db().collection('users').doc(uid).get()).data();
    const displayName = (profile?.nickname as string | undefined) || user.displayName || user.email || 'ユーザー';

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: isoUint8Array.fromUTF8String(uid),
      userName: user.email || displayName,
      userDisplayName: displayName,
      attestationType: 'none',
      // 同じ端末に二重登録しない
      excludeCredentials: existing.docs
        .filter(d => d.data().rpID === rpID)
        .map(d => ({ id: d.id, transports: d.data().transports as AuthenticatorTransportFuture[] | undefined })),
      authenticatorSelection: {
        // ユーザー名入力なしでログインできるよう discoverable credential にする
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    const challengeId = await saveChallenge({ challenge: options.challenge, type: 'register', uid, rpID, origin });
    return { challengeId, options };
  });

/** パスキー登録の完了: 端末の応答を検証して保存 */
export const passkeyRegisterVerify = functions
  .region(REGION)
  .https.onCall(async (data: { challengeId?: unknown; response?: RegistrationResponseJSON; label?: unknown }, context) => {
    const uid = requireAuth(context);
    const stored = await consumeChallenge(data?.challengeId, 'register', uid);
    const { origin, rpID } = resolveRelyingParty(originOf(context), isEmulator());
    if (origin !== stored.origin || rpID !== stored.rpID) {
      throw new functions.https.HttpsError('failed-precondition', '不正なリクエストです');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: data.response as RegistrationResponseJSON,
        expectedChallenge: stored.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
    } catch (e) {
      functions.logger.warn('passkey register verify failed', { uid, error: String(e) });
      throw new functions.https.HttpsError('invalid-argument', 'パスキーを確認できませんでした');
    }
    if (!verification.verified || !verification.registrationInfo) {
      throw new functions.https.HttpsError('invalid-argument', 'パスキーを確認できませんでした');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const ref = db().collection(CREDENTIALS).doc(credential.id);
    const now = FieldValue.serverTimestamp();
    await db().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        throw new functions.https.HttpsError('already-exists', 'このパスキーは登録済みです');
      }
      tx.set(ref, {
        uid,
        rpID,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        label: sanitizeLabel(data.label),
        createdAt: now,
        lastUsedAt: null,
      });
    });

    return { id: credential.id };
  });

// =============================================================================
// ログイン（未ログインで呼ぶ）
// =============================================================================

/** パスキーログインの開始: 認証オプションを返す（端末に保存されたパスキーから選んでもらう） */
export const passkeyLoginOptions = functions
  .region(REGION)
  .https.onCall(async (_data: unknown, context) => {
    const { origin, rpID } = resolveRelyingParty(originOf(context), isEmulator());
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: [],
    });
    const challengeId = await saveChallenge({ challenge: options.challenge, type: 'login', uid: null, rpID, origin });
    return { challengeId, options };
  });

/** パスキーログインの完了: 検証に成功したらカスタムトークンを返す */
export const passkeyLoginVerify = functions
  .region(REGION)
  .https.onCall(async (data: { challengeId?: unknown; response?: AuthenticationResponseJSON }, context) => {
    const stored = await consumeChallenge(data?.challengeId, 'login', null);
    const { origin, rpID } = resolveRelyingParty(originOf(context), isEmulator());
    if (origin !== stored.origin || rpID !== stored.rpID) {
      throw new functions.https.HttpsError('failed-precondition', '不正なリクエストです');
    }

    const credentialId = data?.response?.id;
    if (typeof credentialId !== 'string' || !/^[A-Za-z0-9_-]{16,1023}$/.test(credentialId)) {
      throw new functions.https.HttpsError('invalid-argument', '不正なリクエストです');
    }
    const ref = db().collection(CREDENTIALS).doc(credentialId);
    const snap = await ref.get();
    const cred = snap.data();
    if (!snap.exists || !cred || cred.rpID !== rpID) {
      // 端末にはあるがサーバーで削除済みのパスキーなど
      throw new functions.https.HttpsError('not-found', 'このパスキーは登録されていません。別の方法でログインしてください');
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: data.response as AuthenticationResponseJSON,
        expectedChallenge: stored.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credentialId,
          publicKey: isoBase64URL.toBuffer(cred.publicKey as string),
          counter: cred.counter as number,
          transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
        },
        requireUserVerification: false,
      });
    } catch (e) {
      functions.logger.warn('passkey login verify failed', { credentialId, error: String(e) });
      throw new functions.https.HttpsError('permission-denied', 'パスキーを確認できませんでした');
    }
    if (!verification.verified) {
      throw new functions.https.HttpsError('permission-denied', 'パスキーを確認できませんでした');
    }

    const uid = cred.uid as string;
    const user = await admin.auth().getUser(uid).catch(() => null);
    if (!user || user.disabled) {
      throw new functions.https.HttpsError('permission-denied', 'このアカウントではログインできません');
    }

    await ref.update({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: FieldValue.serverTimestamp(),
    });

    const token = await admin.auth().createCustomToken(uid, { signInMethod: 'passkey' });
    return { token };
  });

// =============================================================================
// 管理（ログイン中のみ）
// =============================================================================

/** 自分のパスキー一覧 */
export const passkeyList = functions
  .region(REGION)
  .https.onCall(async (_data: unknown, context) => {
    const uid = requireAuth(context);
    const snap = await db().collection(CREDENTIALS).where('uid', '==', uid).get();
    const toMillis = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : null);
    const items = snap.docs.map(d => {
      const c = d.data();
      return {
        id: d.id,
        label: c.label as string,
        rpID: c.rpID as string,
        backedUp: !!c.backedUp,
        createdAt: toMillis(c.createdAt),
        lastUsedAt: toMillis(c.lastUsedAt),
      };
    });
    items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return { items };
  });

/** 自分のパスキーを削除 */
export const passkeyDelete = functions
  .region(REGION)
  .https.onCall(async (data: { id?: unknown }, context) => {
    const uid = requireAuth(context);
    if (typeof data?.id !== 'string' || !data.id) {
      throw new functions.https.HttpsError('invalid-argument', '不正なリクエストです');
    }
    const ref = db().collection(CREDENTIALS).doc(data.id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.uid !== uid) {
      throw new functions.https.HttpsError('not-found', 'パスキーが見つかりません');
    }
    await ref.delete();
    return { ok: true };
  });
