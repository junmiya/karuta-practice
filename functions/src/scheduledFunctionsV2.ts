/**
 * 102: スケジュール関数V2
 * checkSeasonBoundary: 毎日00:01 JST、節気境界チェック→自動freeze
 */
import * as functions from 'firebase-functions';
import { getCurrentSeasonInfo } from './services/seasonCalendarService';
import { freezeSeason } from './services/pipelineService';
import * as admin from 'firebase-admin';
import { UTAAWASE_COLLECTIONS } from './types/utaawase';

const db = admin.firestore();

/**
 * 毎日00:01 JST に実行
 * 現在日時が新しい節気に入った場合、前の節気の戦をfreezeする
 */
export const checkSeasonBoundary = functions
  .region('asia-northeast1')
  .pubsub.schedule('1 0 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    try {
      const now = new Date();
      const currentInfo = await getCurrentSeasonInfo(now);

      if (!currentInfo) {
        console.log('No active season calendar found');
        return;
      }

      console.log(`Current season: ${currentInfo.seasonKey}`);

      // Check if the previous season needs freezing
      // We need to check if any season_snapshot for any prior season is still in 'draft'
      const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
      const currentSeasonIndex = seasonOrder.indexOf(currentInfo.seasonId);

      // Check previous season (could be previous year's winter)
      let prevYear = currentInfo.seasonYear;
      let prevSeasonIndex = currentSeasonIndex - 1;
      if (prevSeasonIndex < 0) {
        prevSeasonIndex = 3; // winter
        prevYear -= 1;
      }
      const prevSeasonKey = `${prevYear}_${seasonOrder[prevSeasonIndex]}`;

      // Check if previous season snapshot exists and is draft
      const snapshotRef = db.collection(UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(prevSeasonKey);
      const snapshotDoc = await snapshotRef.get();

      if (!snapshotDoc.exists) {
        // Check if there are any events for this season
        const eventsSnapshot = await db.collection(UTAAWASE_COLLECTIONS.EVENTS)
          .where('seasonKey', '==', prevSeasonKey)
          .limit(1)
          .get();

        if (!eventsSnapshot.empty) {
          console.log(`Auto-freezing season: ${prevSeasonKey}`);
          await freezeSeason(prevSeasonKey, 'system');
        }
      } else {
        const data = snapshotDoc.data();
        if (data?.pipeline?.status === 'draft') {
          console.log(`Auto-freezing season: ${prevSeasonKey}`);
          await freezeSeason(prevSeasonKey, 'system');
        }
      }
    } catch (error) {
      console.error('checkSeasonBoundary error:', error);
    }
  });
