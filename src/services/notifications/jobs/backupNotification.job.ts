import config from '../../../config/config.ts';
import { Tree, User } from '../../../models/index.ts';
import notificationService from '../../notification.service.ts';
import type { NotificationJobResult } from '../../notificationDispatch.service.ts';
import { createJobDedupGuard, emptyJobResult, tally } from './jobHelpers.ts';

const getMonthKey = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.notifications.timezone,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const year = parts.find((part) => part.type === 'year')?.value ?? String(now.getFullYear());
  return `${year}-${month}`;
};

export const runBackupReadyNotifications = async (): Promise<NotificationJobResult> => {
  const users = await User.find({ isDeleted: { $ne: true }, isSuspended: { $ne: true } });
  if (users.length === 0) {
    return emptyJobResult();
  }

  const dedup = createJobDedupGuard('backup-ready');
  const monthKey = getMonthKey();
  const outcomes: Array<'sent' | 'skipped' | 'error'> = [];

  for (const user of users) {
    try {
      const treeCount = await Tree.countDocuments({ userId: user.id, isDeleted: false });
      if (treeCount === 0) {
        continue;
      }

      const outcome = await dedup.trySend(`backup:${user.id}:${monthKey}`, user.id, async () => {
        await notificationService.createNotification({
          receiverId: user.id,
          title: 'Your monthly backup is ready',
          message: 'Your monthly family tree backup is ready to download.',
          type: 'backup',
          metadata: {
            monthKey,
            treeCount,
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
