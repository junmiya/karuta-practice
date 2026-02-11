/**
 * 103: 団体機能 - 招待コード暗号化ユーティリティ
 *
 * 招待コードはハッシュ形式でのみ保存（平文保存禁止）
 * - SHA-256 + ソルト
 * - タイミング安全比較
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * 招待コードを生成し、ハッシュ値を返す
 * @returns code: 平文コード（API応答用）, hash: 保存用ハッシュ（salt:hash形式）
 */
export function generateInviteCode(): { code: string; hash: string } {
  // 12バイトのランダム値をbase64urlエンコード（16文字）
  const code = randomBytes(12).toString('base64url');
  // 16バイトのソルト
  const salt = randomBytes(16).toString('hex');
  // SHA-256ハッシュ
  const hash = createHash('sha256').update(salt + code).digest('hex');
  return { code, hash: `${salt}:${hash}` };
}

/**
 * 招待コードを検証する
 * @param code 入力された平文コード
 * @param storedHash 保存されているハッシュ（salt:hash形式）
 * @returns 一致する場合true
 */
export function verifyInviteCode(code: string, storedHash: string): boolean {
  if (!code || !storedHash) return false;

  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const [salt, expectedHash] = parts;
  if (!salt || !expectedHash) return false;

  const computedHash = createHash('sha256').update(salt + code).digest('hex');

  // タイミング安全比較（タイミング攻撃防止）
  try {
    return timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * 監査ログ用のイベントIDを生成
 */
export function generateAuditEventId(prefix: string = 'audit'): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}
