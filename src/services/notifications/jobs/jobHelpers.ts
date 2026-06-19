import NotificationJobLog from '../../../models/notificationJobLog.model.ts';
import type { NotificationJobResult } from '../../notificationDispatch.service.ts';
import type { ObjectIdLike } from '../../../types/common.ts';

export const createJobDedupGuard = (jobName: string) => {
  const trySend = async (
    referenceKey: string,
    userId: ObjectIdLike | null,
    send: () => Promise<void>
  ): Promise<'sent' | 'skipped'> => {
    try {
      await NotificationJobLog.create({
        jobName,
        referenceKey,
        userId,
      });
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        return 'skipped';
      }
      throw error;
    }

    await send();
    return 'sent';
  };

  return { trySend };
};

export const emptyJobResult = (): NotificationJobResult => ({ sent: 0, skipped: 0, errors: 0 });

export const tally = (
  results: Array<'sent' | 'skipped' | 'error'>
): NotificationJobResult => ({
  sent: results.filter((value) => value === 'sent').length,
  skipped: results.filter((value) => value === 'skipped').length,
  errors: results.filter((value) => value === 'error').length,
});
