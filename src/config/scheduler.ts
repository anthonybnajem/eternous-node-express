import cron, { type ScheduledTask } from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import config from './config.js';
import { sendBulkLogReports } from '../services/emailReport.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Schedule configurations for different report frequencies
 * Cron format: second minute hour day month day-of-week
 */
const SCHEDULE_PATTERNS = {
  // Daily at 9:00 AM
  daily: '0 9 * * *',

  // Weekly on Monday at 9:00 AM
  weekly: '0 9 * * 1',

  // Bi-weekly on Monday at 9:00 AM (every 2 weeks)
  biweekly: '0 9 */14 * 1',

  // Monthly on 1st day at 9:00 AM
  monthly: '0 9 1 * *',

  // Every 3 days at 9:00 AM
  every3days: '0 9 */3 * *',

  // Every 7 days at 9:00 AM
  every7days: '0 9 */7 * *',

  // Custom: every hour (for testing)
  hourly: '0 * * * *',

  // Custom: every 10 minutes (for testing)
  every10min: '*/10 * * * *',
};

/**
 * Days mapping for different schedules
 */
const REPORT_DAYS = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  every3days: 3,
  every7days: 7,
  hourly: 1,
  every10min: 1,
};

type ScheduleFrequency = keyof typeof SCHEDULE_PATTERNS;

interface ScheduledTaskInfo {
  name: string;
  frequency: ScheduleFrequency;
  cronPattern: string;
  task: ScheduledTask;
}

let scheduledTasks: ScheduledTaskInfo[] = [];

/**
 * Clean up old log files to prevent disk space issues
 * Removes log files older than 30 days
 */
const cleanupOldLogs = (): void => {
  const logsDir = path.join(__dirname, '../../logs');
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  try {
    if (!fs.existsSync(logsDir)) {
      logger.warn('Logs directory does not exist');
      return;
    }

    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    let deletedCount = 0;

    files.forEach((file: string) => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);

      // Delete files older than 30 days
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount += 1;
        logger.info(`Deleted old log file: ${file}`);
      }
    });

    if (deletedCount > 0) {
      logger.info(`Log cleanup completed: ${deletedCount} old log files deleted`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error during log cleanup: ${message}`);
  }
};

/**
 * Start log cleanup scheduler
 * Runs daily at 2:00 AM to clean up old log files
 */
const startLogCleanupScheduler = (): void => {
  logger.info('Starting log cleanup scheduler (daily at 2:00 AM)');

  const task = cron.schedule(
    '0 2 * * *', // Daily at 2:00 AM
    () => {
      logger.info('Executing scheduled log cleanup');
      cleanupOldLogs();
    },
    {
      scheduled: true,
      timezone: 'UTC',
    }
  );

  scheduledTasks.push({
    name: 'logCleanup',
    frequency: 'daily',
    cronPattern: '0 2 * * *',
    task,
  });

  logger.info('Log cleanup scheduler started successfully');
};

/**
 * Start log report scheduler
 */
const startLogReportScheduler = (): void => {
  // Check if log reporting is enabled
  if (!config.logReport.enabled) {
    logger.info('Log report scheduler is disabled');
    return;
  }

  let frequency = (config.logReport.frequency || 'weekly') as ScheduleFrequency;
  const recipients = config.logReport.recipients || [];
  const days = config.logReport.days || REPORT_DAYS[frequency];

  if (!recipients || recipients.length === 0) {
    logger.warn('No recipients configured for log reports. Scheduler not started.');
    return;
  }

  if (!SCHEDULE_PATTERNS[frequency]) {
    logger.error(`Invalid frequency "${frequency}". Using weekly as default.`);
    frequency = 'weekly';
  }

  const cronPattern = SCHEDULE_PATTERNS[frequency];

  logger.info(`Starting log report scheduler with frequency: ${frequency} (${cronPattern})`);
  logger.info(`Reports will be sent to: ${recipients.join(', ')}`);
  logger.info(`Report period: ${days} days`);

  // Validate cron pattern
  if (!cron.validate(cronPattern)) {
    logger.error(`Invalid cron pattern: ${cronPattern}`);
    return;
  }

  // Schedule the task
  const task = cron.schedule(
    cronPattern,
    async () => {
      logger.info(`Executing scheduled log report (${frequency})`);

      try {
        await sendBulkLogReports(recipients, days);
        logger.info('Scheduled log report completed successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Scheduled log report failed: ${message}`);
      }
    },
    {
      scheduled: true,
      timezone: config.logReport.timezone || 'UTC',
    }
  );

  scheduledTasks.push({
    name: 'logReport',
    frequency,
    cronPattern,
    task,
  });

  logger.info(`Log report scheduler started successfully`);
};

/**
 * Send immediate log report (manual trigger)
 * @param {string[]} recipients - Optional custom recipients
 * @param {number} days - Optional custom days
 */
const sendImmediateReport = async (recipients: string[] | null = null, days: number | null = null) => {
  const targetRecipients = recipients || config.logReport.recipients || [];
  const reportDays = days || config.logReport.days || 7;

  if (targetRecipients.length === 0) {
    throw new Error('No recipients specified for log report');
  }

  logger.info(`Sending immediate log report to ${targetRecipients.length} recipient(s)`);

  const result = await sendBulkLogReports(targetRecipients, reportDays);

  return result;
};

/**
 * Stop all scheduled tasks
 */
const stopAllSchedulers = (): void => {
  logger.info('Stopping all scheduled tasks');

  scheduledTasks.forEach((scheduledTask: ScheduledTaskInfo) => {
    if (scheduledTask.task) {
      scheduledTask.task.stop();
      logger.info(`Stopped scheduler: ${scheduledTask.name}`);
    }
  });

  scheduledTasks = [];
};

/**
 * Get status of all scheduled tasks
 */
const getSchedulerStatus = () => ({
  enabled: config.logReport.enabled,
  frequency: config.logReport.frequency,
  recipients: config.logReport.recipients,
  days: config.logReport.days,
  timezone: config.logReport.timezone || 'UTC',
  activeTasks: scheduledTasks.map((task) => ({
    name: task.name,
    frequency: task.frequency,
    cronPattern: task.cronPattern,
    isRunning: true,
  })),
});

/**
 * Get human-readable description of schedule
 * @param {string} frequency - Schedule frequency
 */
const getScheduleDescription = (frequency: ScheduleFrequency): string => {
  const descriptions = {
    daily: 'Every day at 9:00 AM',
    weekly: 'Every Monday at 9:00 AM',
    biweekly: 'Every 2 weeks on Monday at 9:00 AM',
    monthly: 'First day of each month at 9:00 AM',
    every3days: 'Every 3 days at 9:00 AM',
    every7days: 'Every 7 days at 9:00 AM',
    hourly: 'Every hour (testing)',
    every10min: 'Every 10 minutes (testing)',
  };

  return descriptions[frequency] || 'Unknown schedule';
};

/**
 * List all available schedule patterns
 */
const getAvailableSchedules = () =>
  (Object.keys(SCHEDULE_PATTERNS) as ScheduleFrequency[]).map((key) => ({
    name: key,
    pattern: SCHEDULE_PATTERNS[key],
    days: REPORT_DAYS[key],
    description: getScheduleDescription(key),
  }));

export {
  startLogReportScheduler,
  startLogCleanupScheduler,
  cleanupOldLogs,
  stopAllSchedulers,
  sendImmediateReport,
  getSchedulerStatus,
  getAvailableSchedules,
  SCHEDULE_PATTERNS,
  REPORT_DAYS,
};
