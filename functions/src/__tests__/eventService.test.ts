/**
 * 102: eventService テスト仕様
 *
 * NOTE: These tests require firebase-admin mock or emulator setup.
 */

describe('eventService', () => {
  describe('createMatchEvent', () => {
    test.todo('creates match event with correct seasonId/seasonYear');
    test.todo('sets tier=official when participants >= 24');
    test.todo('sets tier=provisional when participants < 24');
    test.todo('returns null when no calendar found');
    test.todo('handles winter spanning year boundary');
  });

  describe('createKyuiExamEvent', () => {
    test.todo('creates kyui_exam event with tier=null');
    test.todo('calculates passRate correctly');
    test.todo('returns null when no calendar found');
  });

  describe('getSeasonEvents', () => {
    test.todo('returns all events for season');
    test.todo('filters by eventType');
  });

  describe('getUserSeasonEvents', () => {
    test.todo('returns events for specific user and season');
  });
});
