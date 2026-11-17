/**
 * パスキー（WebAuthn）ログイン
 *
 * 登録・認証の検証は Cloud Functions（functions/src/passkeyFunctions.ts）で行い、
 * ログイン成功時はカスタムトークンで Firebase Auth にサインインする。
 */
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import { auth, functions } from './firebase';

export interface PasskeyItem {
  id: string;
  label: string;
  rpID: string;
  backedUp: boolean;
  createdAt: number | null;
  lastUsedAt: number | null;
}

/** ユーザーが端末のダイアログを閉じた・キャンセルした */
export class PasskeyCancelledError extends Error {
  constructor() {
    super('パスキーの操作がキャンセルされました');
    this.name = 'PasskeyCancelledError';
  }
}

export function isPasskeySupported(): boolean {
  return browserSupportsWebAuthn();
}

const call = <Req, Res>(name: string) => httpsCallable<Req, Res>(functions, name);

/** WebAuthn のブラウザ側エラーを、キャンセルとそれ以外に分ける */
function rethrowBrowserError(err: unknown): never {
  const name = (err as { name?: string })?.name;
  // NotAllowedError: ユーザーがキャンセル、またはタイムアウト
  if (name === 'NotAllowedError' || name === 'AbortError') throw new PasskeyCancelledError();
  throw err;
}

/** この端末の名前（パスキー一覧の表示用） */
export function guessDeviceLabel(): string {
  const ua = navigator.userAgent;
  const device =
    /iPhone/.test(ua) ? 'iPhone'
      : /iPad/.test(ua) ? 'iPad'
        : /Android/.test(ua) ? 'Android'
          : /Macintosh|Mac OS X/.test(ua) ? 'Mac'
            : /Windows/.test(ua) ? 'Windows'
              : /CrOS/.test(ua) ? 'Chromebook'
                : /Linux/.test(ua) ? 'Linux'
                  : 'この端末';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
      : /Firefox\//.test(ua) ? 'Firefox'
        : /Chrome\//.test(ua) ? 'Chrome'
          : /Safari\//.test(ua) ? 'Safari'
            : '';
  return browser ? `${device}（${browser}）` : device;
}

/** パスキーでログイン（未ログイン時） */
export async function signInWithPasskey(): Promise<void> {
  const { data } = await call<void, { challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>(
    'passkeyLoginOptions'
  )();
  let response: AuthenticationResponseJSON;
  try {
    response = await startAuthentication({ optionsJSON: data.options });
  } catch (err) {
    rethrowBrowserError(err);
  }
  const { data: result } = await call<
    { challengeId: string; response: AuthenticationResponseJSON },
    { token: string }
  >('passkeyLoginVerify')({ challengeId: data.challengeId, response });
  await signInWithCustomToken(auth, result.token);
}

/** ログイン中のアカウントにこの端末のパスキーを登録 */
export async function registerPasskey(label = guessDeviceLabel()): Promise<void> {
  const { data } = await call<void, { challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>(
    'passkeyRegisterOptions'
  )();
  let response: RegistrationResponseJSON;
  try {
    response = await startRegistration({ optionsJSON: data.options });
  } catch (err) {
    // InvalidStateError: この端末には既に登録済み（excludeCredentials に一致）
    if ((err as { name?: string })?.name === 'InvalidStateError') {
      throw new Error('この端末のパスキーは登録済みです');
    }
    rethrowBrowserError(err);
  }
  await call<{ challengeId: string; response: RegistrationResponseJSON; label: string }, { id: string }>(
    'passkeyRegisterVerify'
  )({ challengeId: data.challengeId, response, label });
}

export async function listPasskeys(): Promise<PasskeyItem[]> {
  const { data } = await call<void, { items: PasskeyItem[] }>('passkeyList')();
  return data.items;
}

export async function deletePasskey(id: string): Promise<void> {
  await call<{ id: string }, { ok: boolean }>('passkeyDelete')({ id });
}

/** Cloud Functions / ブラウザのエラーを画面向けのメッセージにする */
export function passkeyErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { message?: string })?.message;
  const code = (err as { code?: string })?.code;
  // HttpsError のメッセージは日本語で返している（SDK が末尾に付ける「 [404]」などは除く）
  if (code?.startsWith('functions/') && message && code !== 'functions/internal') {
    return message.replace(/\s*\[\d{3}\]$/, '');
  }
  if (err instanceof Error && /登録済み/.test(err.message)) return err.message;
  return fallback;
}
