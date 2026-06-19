import httpStatus from 'http-status';
import logger from '../config/logger.ts';
import notificationService from './notification.service.ts';
import { runBirthdayNotifications } from './notifications/jobs/birthdayNotification.job.ts';
import { runAnniversaryNotifications } from './notifications/jobs/anniversaryNotification.job.ts';
import {
  runCreditsLowNotifications,
  runPaymentFailedNotifications,
  runSubscriptionReminderNotifications,
} from './notifications/jobs/paymentNotification.job.ts';
import { runBackupReadyNotifications } from './notifications/jobs/backupNotification.job.ts';
import ApiError from '../utils/ApiError.ts';

export type NotificationJobName =
  | 'birthday'
  | 'anniversary'
  | 'subscription-reminder'
  | 'credits-low'
  | 'payment-failed'
  | 'backup-ready';

export interface NotificationJobResult {
  sent: number;
  skipped: number;
  errors: number;
}

const JOB_RUNNERS: Record<NotificationJobName, () => Promise<NotificationJobResult>> = {
  birthday: runBirthdayNotifications,
  anniversary: runAnniversaryNotifications,
  'subscription-reminder': runSubscriptionReminderNotifications,
  'credits-low': runCreditsLowNotifications,
  'payment-failed': runPaymentFailedNotifications,
  'backup-ready': runBackupReadyNotifications,
};

const isNotificationJobName = (value: string): value is NotificationJobName => value in JOB_RUNNERS;

const runNotificationJob = async (jobName: string): Promise<NotificationJobResult> => {
  if (!isNotificationJobName(jobName)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unknown notification job: ${jobName}`);
  }

  logger.info(`Running notification job: ${jobName}`);
  const result = await JOB_RUNNERS[jobName]();
  logger.info(`Notification job ${jobName} finished`, result);
  return result;
};

const listNotificationJobs = (): NotificationJobName[] => Object.keys(JOB_RUNNERS) as NotificationJobName[];

export default {
  runNotificationJob,
  listNotificationJobs,
  notificationService,
};

export { runNotificationJob, listNotificationJobs };
