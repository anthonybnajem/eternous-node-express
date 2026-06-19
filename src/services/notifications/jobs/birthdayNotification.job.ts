import config from '../../../config/config.ts';
import { Member, Settings } from '../../../models/index.ts';
import notificationService from '../../notification.service.ts';
import type { NotificationJobResult } from '../../notificationDispatch.service.ts';
import { createJobDedupGuard, emptyJobResult, tally } from './jobHelpers.ts';

const getZonedNow = (): Date => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.notifications.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '0');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0');
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  return new Date(year, month - 1, day);
};

export const runBirthdayNotifications = async (): Promise<NotificationJobResult> => {
  const today = getZonedNow();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const members = await Member.find({
    dateOfBirth: { $ne: null },
    $expr: {
      $and: [{ $eq: [{ $month: '$dateOfBirth' }, month] }, { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] }],
    },
  });

  if (members.length === 0) {
    return emptyJobResult();
  }

  const dedup = createJobDedupGuard('birthday');
  const outcomes: Array<'sent' | 'skipped' | 'error'> = [];

  for (const member of members) {
    try {
      const settings = await Settings.findOne({ userId: member.userId });
      if (settings && settings.birthdayNotificationsEnabled === false) {
        outcomes.push('skipped');
        continue;
      }

      const outcome = await dedup.trySend(
        `birthday:${member.userId}:${member.id}:${dateKey}`,
        member.userId,
        async () => {
          await notificationService.createNotification({
            receiverId: member.userId,
            title: 'Birthday reminder',
            message: `Today is ${member.name ?? 'a family member'}'s birthday`,
            type: 'birthday',
            metadata: {
              memberId: member.id,
              memberName: member.name,
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
