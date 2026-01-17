import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { SubmitPayload, SubmitResponse } from '@/types/submission';

const submitOfficialRecordFn = httpsCallable<SubmitPayload, SubmitResponse>(
  functions,
  'submitOfficialRecord'
);

/**
 * Submit practice results as official record
 */
export async function submitOfficialRecord(
  payload: SubmitPayload
): Promise<SubmitResponse> {
  const result = await submitOfficialRecordFn(payload);
  return result.data;
}
