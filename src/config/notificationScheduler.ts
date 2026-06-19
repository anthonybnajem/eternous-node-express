import cron, { type ScheduledTask } from 'node-cron';
import logger from './logger.ts';
import config from './config.ts';
import notificationDispatchService from '../services/notificationDispatch.service.ts';

interface NotificationScheduledTask {
  name: string;
  cronPattern: string;
  task: ScheduledTask;
}

let notificationTasks: NotificationScheduledTask[] = [];

const NOTIFICATION_CRON_PATTERNS: Record<string, string> = {
  birthday: '0 8 * * *',
  anniversary: '5 8 * * *',
  'subscription-reminder': '0 9 * * *',
  'credits-low': '10 9 * * *',
  'payment-failed': '15 9 * * *',
  'backup-ready': '0 10 1 * *',
};

const startNotificationSchedulers = (): void => {
  if (!config.notifications.cronsEnabled) {
    logger.info('Notification schedulers disabled (NOTIFICATION_CRONS_ENABLED=false)');
    return;
  }

  const timezone = config.notifications.timezone;

  for (const [jobName, cronPattern] of Object.entries(NOTIFICATION_CRON_PATTERNS)) {
    if (!cron.validate(cronPattern)) {
      logger.error(`Invalid notification cron pattern for ${jobName}: ${cronPattern}`);
      continue;
    }

    const task = cron.schedule(
      cronPattern,
      async () => {
        try {
          await notificationDispatchService.runNotificationJob(jobName);
        } catch (error) {
          logger.error(`Notification cron ${jobName} failed`, error);
        }
      },
      {
        scheduled: true,
        timezone,
      }
    );

    notificationTasks.push({ name: jobName, cronPattern, task });
  }

  logger.info('Notification schedulers started', {
    timezone,
    jobs: notificationTasks.map((entry) => entry.name),
  });
};

const stopNotificationSchedulers = (): void => {
  notificationTasks.forEach((entry) => entry.task.stop());
  notificationTasks = [];
};

export { startNotificationSchedulers, stopNotificationSchedulers, NOTIFICATION_CRON_PATTERNS };
