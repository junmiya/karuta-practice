/**
 * Seed script for seasons collection
 * Run with: npx ts-node scripts/seed-seasons.ts
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin (requires service account)
// For local development, use environment variable or local file
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccount) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  console.log('Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json npx ts-node scripts/seed-seasons.ts');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount as string),
});

const db = getFirestore();

// Stage 1 compatible season status
type SeasonStatus = 'open' | 'frozen' | 'finalized' | 'archived';

interface Season {
  seasonId: string;
  name: string;
  startDate: Timestamp;
  status: SeasonStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 2026年のシーズン定義
const now = Timestamp.now();
const seasons: Season[] = [
  {
    seasonId: '2026_winter',
    name: '2026年冬場所',
    startDate: Timestamp.fromDate(new Date('2026-01-01T00:00:00+09:00')),
    status: 'open', // 現在アクティブ（Stage 1形式）
    createdAt: now,
    updatedAt: now,
  },
];

async function seedSeasons() {
  console.log('Seeding seasons collection...');

  for (const season of seasons) {
    const docRef = db.collection('seasons').doc(season.seasonId);
    await docRef.set(season);
    console.log(`  ✓ Created season: ${season.name} (${season.seasonId})`);
  }

  console.log('\nSeeding complete!');
  console.log(`Total seasons created: ${seasons.length}`);
}

seedSeasons()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding seasons:', error);
    process.exit(1);
  });
