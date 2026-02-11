/**
 * 107: Stripe Webhook ハンドラー
 * HTTP Function（Callable ではない）— 署名検証のため raw body が必要
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/**
 * Stripe Customer の metadata.firebaseUid からユーザーを特定
 */
async function getUidFromCustomerId(customerId: string): Promise<string | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer.metadata?.firebaseUid) || null;
}

/**
 * Firestore で billing/subscription を更新
 */
async function updateSubscriptionStatus(
  uid: string,
  updates: Record<string, unknown>
): Promise<void> {
  await db.collection('users').doc(uid)
    .collection('billing').doc('subscription')
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * 冪等性チェック: 処理済みイベントIDを記録
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const doc = await db.collection('stripe_events').doc(eventId).get();
  return doc.exists;
}

async function markEventProcessed(eventId: string, type: string): Promise<void> {
  await db.collection('stripe_events').doc(eventId).set({
    type,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Stripe Webhook HTTP Function
 */
export const handleStripeWebhook = functions
  .region('asia-northeast1')
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
      console.error('Missing stripe-signature or webhook secret');
      res.status(400).send('Missing signature');
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).send('Signature verification failed');
      return;
    }

    // 冪等性チェック
    if (await isEventProcessed(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      res.status(200).json({ received: true, skipped: true });
      return;
    }

    try {
      switch (event.type) {
        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === 'string'
            ? invoice.customer : (invoice.customer as any)?.id || '';
          const uid = await getUidFromCustomerId(customerId);
          if (uid) {
            // Stripe v20: subscription is under parent.subscription_details
            const subDetails = invoice.parent?.subscription_details;
            const subRef = subDetails?.subscription;
            const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id || '';
            if (subscriptionId) {
              const sub = await getStripe().subscriptions.retrieve(subscriptionId);
              const periodEnd = (sub as any).current_period_end;
              await updateSubscriptionStatus(uid, {
                status: 'ACTIVE',
                stripeSubscriptionId: subscriptionId,
                ...(periodEnd ? {
                  currentPeriodEnd: admin.firestore.Timestamp.fromMillis(periodEnd * 1000),
                } : {}),
              });
            } else {
              await updateSubscriptionStatus(uid, { status: 'ACTIVE' });
            }
            console.log(`invoice.paid: ${uid} → ACTIVE`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === 'string'
            ? invoice.customer : invoice.customer?.id || '';
          const uid = await getUidFromCustomerId(customerId);
          if (uid) {
            await updateSubscriptionStatus(uid, { status: 'PAST_DUE' });
            console.log(`invoice.payment_failed: ${uid} → PAST_DUE`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer : subscription.customer?.id || '';
          const uid = await getUidFromCustomerId(customerId);
          if (uid) {
            await updateSubscriptionStatus(uid, {
              status: 'CANCELED',
              canceledAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`customer.subscription.deleted: ${uid} → CANCELED`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === 'string'
            ? subscription.customer : subscription.customer?.id || '';
          const uid = await getUidFromCustomerId(customerId);
          if (uid) {
            const periodEnd = (subscription as any).current_period_end;
            await updateSubscriptionStatus(uid, {
              ...(periodEnd ? {
                currentPeriodEnd: admin.firestore.Timestamp.fromMillis(periodEnd * 1000),
              } : {}),
            });
            console.log(`customer.subscription.updated: ${uid} → synced period`);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      await markEventProcessed(event.id, event.type);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error(`Error processing event ${event.id}:`, err);
      res.status(500).send('Internal error');
    }
  });
