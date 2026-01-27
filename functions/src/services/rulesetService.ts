/**
 * 102: ルールセット Firestore CRUD
 * Document: rulesets/current
 */
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Ruleset, UTAAWASE_COLLECTIONS } from '../types/utaawase';
import { validateRuleset } from '../lib/ruleEngine';

const db = admin.firestore();

export async function getRuleset(): Promise<Ruleset | null> {
  const doc = await db.collection(UTAAWASE_COLLECTIONS.RULESETS).doc('current').get();
  if (!doc.exists) return null;
  return doc.data() as Ruleset;
}

export async function saveRuleset(ruleset: Omit<Ruleset, 'createdAt' | 'updatedAt'>): Promise<Ruleset> {
  const errors = validateRuleset(ruleset);
  if (errors.length > 0) {
    throw new Error(`Invalid ruleset: ${errors.join(', ')}`);
  }

  const ref = db.collection(UTAAWASE_COLLECTIONS.RULESETS).doc('current');
  const existing = await ref.get();

  const data = {
    ...ruleset,
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };

  await ref.set(data, { merge: true });

  const saved = await ref.get();
  return saved.data() as Ruleset;
}
