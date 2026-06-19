import config from '../../../config/config.ts';
import { Subscription, User } from '../../../models/index.ts';
import notificationService from '../../notification.service.ts';
import type { NotificationJobResult } from '../../notificationDispatch.service.ts';
import { createJobDedupGuard, emptyJobResult, tally } from './jobHelpers.ts';

const getDateKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const runSubscriptionReminderNotifications = async (): Promise<NotificationJobResult> => {
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 3);
  const start = new Date(reminderDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const subscriptions = await Subscription.find({
    status: 'active',
    endsAt: { $gte: start, $lt: end },
  });

  if (subscriptions.length === 0) {
    return emptyJobResult();
  }

  const dedup = createJobDedupGuard('subscription-reminder');
  const dateKey = getDateKey();
  const outcomes: Array<'sent' | 'skipped' | 'error'> = [];

  for (const subscription of subscriptions) {
    try {
      const outcome = await dedup.trySend(
        `subscription-reminder:${subscription.user}:${subscription.id}:${dateKey}`,
        subscription.user,
        async () => {
          await notificationService.createNotification({
            receiverId: subscription.user,
            title: 'Subscription renewal reminder',
            message: `Your "${subscription.name}" plan renews soon`,
            type: 'subscription',
            metadata: {
              subscriptionId: subscription.id,
              endsAt: subscription.endsAt,
            },
          });
        }
      );
      outcomes.push(outcome);
    } catch {
      outcomes.push('error');
    }
  }

  return tally(outcomes);
};

export const runCreditsLowNotifications = async (): Promise<NotificationJobResult> => {
  const threshold = config.notifications.creditsLowThreshold;
  const users = await User.find({
    creditBalance: { $lt: threshold },
    isDeleted: { $ne: true },
  });

  if (users.length === 0) {
    return emptyJobResult();
  }

  const dedup = createJobDedupGuard('credits-low');
  const dateKey = getDateKey();
  const outcomes: Array<'sent' | 'skipped' | 'error'> = [];

  for (const user of users) {
    try {
      const outcome = await dedup.trySend(`credits-low:${user.id}:${dateKey}`, user.id, async () => {
        await notificationService.createNotification({
          receiverId: user.id,
          title: 'Credits running low',
          message: `Your credit balance is ${user.creditBalance ?? 0}. Top up to keep chatting.`,
          type: 'billing',
          metadata: {
            creditBalance: user.creditBalance ?? 0,
            threshold,
          },
        });
      });
      outcomes.push(outcome);
    } catch {
      outcomes.push('error');
    }
  }

  return tally(outcomes);
};

export const runPaymentFailedNotifications = async (): Promise<NotificationJobResult> => {
  const subscriptions = await Subscription.find({ status: 'past_due' });
  if (subscriptions.length === 0) {
    return emptyJobResult();
  }

  const dedup = createJobDedupGuard('payment-failed');
  const dateKey = getDateKey();
  const outcomes: Array<'sent' | 'skipped' | 'error'> = [];

  for (const subscription of subscriptions) {
    try {
      const outcome = await dedup.trySend(
        `payment-failed:${subscription.user}:${subscription.id}:${dateKey}`,
        subscription.user,
        async () => {
          await notificationService.createNotification({
            receiverId: subscription.user,
            title: 'Payment failed',
            message: `We could not process payment for "${subscription.name}". Update your billing details.`,
            type: 'billing',
            metadata: {
              subscriptionId: subscription.id,
              status: subscription.status,
            },
          });
        }
      );
      outcomes.push(outcome);
    } catch {
      outcomes.push('error');
    }
  }

  return tally(outcomes);
};
