import type Stripe from 'stripe';
import logger from '../../config/logger.ts';
import creditService from '../credit.service.ts';
import subscriptionPlanService from '../subscriptionPlan.service.ts';
import subscriptionService from '../subscription.service.ts';
import * as stripeService from './stripe.service.ts';

const resolveInvoicePriceId = async (invoice: Stripe.Invoice): Promise<string | null> => {
  const linePrice = invoice.lines?.data?.[0]?.price?.id;
  if (linePrice) {
    return linePrice;
  }

  if (typeof invoice.subscription === 'string' && invoice.subscription.length > 0) {
    const stripeSubscription = await stripeService.retrieveSubscription(invoice.subscription);
    return stripeSubscription.items.data[0]?.price?.id ?? null;
  }

  return null;
};

const grantPlanCreditsFromInvoice = async (invoice: Stripe.Invoice): Promise<void> => {
  if (!invoice.id || invoice.amount_paid <= 0) {
    return;
  }

  const idempotencyKey = `stripe:invoice:${invoice.id}`;
  const alreadyGranted = await creditService.findByIdempotencyKey(idempotencyKey);
  if (alreadyGranted) {
    logger.info(`invoice.payment_succeeded ${invoice.id}: credits already granted (idempotent skip)`);
    return;
  }

  const priceId = await resolveInvoicePriceId(invoice);
  if (!priceId) {
    logger.warn(`invoice.payment_succeeded ${invoice.id}: no price id found`);
    return;
  }

  const plan = await subscriptionPlanService.getSubscriptionPlanByPriceId(priceId);
  const credits = plan?.credits ?? 0;
  if (!plan || credits <= 0) {
    logger.info(`invoice.payment_succeeded ${invoice.id}: no credits configured for price ${priceId}`);
    return;
  }

  let userId =
    invoice.metadata?.userId ??
    invoice.metadata?.user_id ??
    invoice.subscription_details?.metadata?.userId ??
    null;

  if (!userId && typeof invoice.subscription === 'string') {
    const stripeSubscription = await stripeService.retrieveSubscription(invoice.subscription);
    userId =
      stripeSubscription.metadata?.userId ??
      stripeSubscription.metadata?.user_id ??
      null;
    await subscriptionService.syncSubscriptionFromStripe(stripeSubscription, userId ?? undefined);
  }

  if (!userId) {
    logger.warn(`invoice.payment_succeeded ${invoice.id}: userId not found`);
    return;
  }

  const localSubscription =
    typeof invoice.subscription === 'string'
      ? await subscriptionService.getSubscriptionByExternalId(invoice.subscription)
      : null;

  const transaction = await creditService.grantCredits({
    userId,
    amount: credits,
    type: 'subscription_grant',
    idempotencyKey,
    description: `Subscription credits from invoice ${invoice.id}`,
    subscriptionId: localSubscription?.id,
    subscriptionPlanId: plan.id,
    invoiceId: invoice.id,
    metadata: {
      stripeInvoiceId: invoice.id,
      stripePriceId: priceId,
      planName: plan.name,
      billingReason: invoice.billing_reason,
    },
  });

  if (transaction) {
    logger.info(
      `Granted ${credits} credits to user ${userId} for invoice ${invoice.id} (balance=${transaction.balanceAfter})`
    );
  }
};

export { grantPlanCreditsFromInvoice };
