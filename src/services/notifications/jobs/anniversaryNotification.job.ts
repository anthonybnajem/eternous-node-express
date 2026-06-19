import config from '../../../config/config.ts';
import { Member } from '../../../models/index.ts';
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

export const runAnniversaryNotifications = async (): Promise<NotificationJobResult> => {
  const today = getZonedNow();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const start = new Date(year - 1, month - 1, day);
  const end = new Date(year - 1, month - 1, day + 1);

  const members = await Member.find({
    createdAt: { $gte: start, $lt: end },
  });

  if (members.length === 0) {
    return emptyJobResult();
  }

  const dedup = createJobDedupGuard('anniversary');
  const outcomes: Array<'sent' | 'skipped' | 'error'> = [];

  for (const member of members) {
    try {
      const outcome = await dedup.trySend(
        `anniversary:${member.userId}:${member.id}:${dateKey}`,
        member.userId,
        async () => {
          await notificationService.createNotification({
            receiverId: member.userId,
            title: 'Member anniversary',
            message: `It's been 1 year since "${member.name ?? 'a member'}" was added`,
            type: 'anniversary',
            metadata: {
              memberId: member.id,
              memberName: member.name,
              years: 1,
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
