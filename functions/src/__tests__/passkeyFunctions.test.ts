/**
 * パスキー: origin / rpID の判定とラベル整形のテスト
 * （WebAuthn の登録・認証そのものはエミュレーター＋仮想認証器で E2E 確認）
 */
import { resolveRelyingParty, sanitizeLabel, PRODUCTION_ORIGINS } from '../passkeyFunctions';

describe('resolveRelyingParty', () => {
  test.each(PRODUCTION_ORIGINS)('本番の origin %s を許可し、ホスト名を rpID にする', origin => {
    expect(resolveRelyingParty(origin, false)).toEqual({ origin, rpID: new URL(origin).hostname });
  });

  test('origin が無ければ拒否', () => {
    expect(() => resolveRelyingParty(undefined, false)).toThrow('このページからはパスキーを使えません');
  });

  test('知らない origin は拒否', () => {
    expect(() => resolveRelyingParty('https://evil.example.com', false)).toThrow();
    expect(() => resolveRelyingParty('https://karuta-banzuke.web.app.evil.com', false)).toThrow();
    expect(() => resolveRelyingParty('http://karuta-banzuke.web.app', false)).toThrow();
  });

  test('localhost は本番では拒否、エミュレーターでは許可', () => {
    expect(() => resolveRelyingParty('http://localhost:5174', false)).toThrow();
    expect(resolveRelyingParty('http://localhost:5174', true)).toEqual({ origin: 'http://localhost:5174', rpID: 'localhost' });
    expect(() => resolveRelyingParty('http://localhost.evil.com', true)).toThrow();
  });
});

describe('sanitizeLabel', () => {
  test('文字列以外や空は既定のラベル', () => {
    expect(sanitizeLabel(undefined)).toBe('パスキー');
    expect(sanitizeLabel(123)).toBe('パスキー');
    expect(sanitizeLabel('   ')).toBe('パスキー');
  });

  test('制御文字を除き、40文字に切る', () => {
    expect(sanitizeLabel('iPhone\n\t(Safari)')).toBe('iPhone(Safari)');
    expect(sanitizeLabel('あ'.repeat(50))).toHaveLength(40);
  });
});
