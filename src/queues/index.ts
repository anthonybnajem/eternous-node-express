import Queue, { type Job } from 'bull';
import config from '../config/config.js';
import logger from '../config/logger.js';
import { jobProcessingDuration } from '../config/metrics.js';

export interface EmailJobData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  priority?: number;
}

export interface NotificationJobData {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: number;
}

type QueueProcessor<T> = (job: Job<T>) => Promise<void>;

const emailQueue = new Queue<EmailJobData>('email', {
  redis: config.redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const notificationQueue = new Queue<NotificationJobData>('notification', {
  redis: config.redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const setupQueueEventHandlers = <T>(queue: Queue.Queue<T>, name: string): void => {
  queue.on('completed', (job: Job<T>) => {
    logger.info(`${name} job ${job.id} completed`);
  });

  queue.on('failed', (job: Job<T> | undefined, err: Error) => {
    logger.error(`${name} job ${job?.id ?? 'unknown'} failed:`, err);
  });

  queue.on('stalled', (job: Job<T>) => {
    logger.warn(`${name} job ${job.id} stalled`);
  });

  queue.on('error', (error: Error) => {
    logger.error(`${name} queue error:`, error);
  });
};

setupQueueEventHandlers(emailQueue, 'Email');
setupQueueEventHandlers(notificationQueue, 'Notification');

const processWithMetrics = <T>(queue: Queue.Queue<T>, processor: QueueProcessor<T>): void => {
  queue.process(async (job: Job<T>) => {
    const startTime = Date.now();
    let status = 'success';

    try {
      await processor(job);
    } catch (error) {
      status = 'failed';
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      jobProcessingDuration.observe(
        {
          job_name: queue.name,
          status,
        },
        duration
      );
    }
  });
};

const addEmailJob = async (emailData: EmailJobData): Promise<Job<EmailJobData>> =>
  emailQueue.add(emailData, {
    priority: emailData.priority || 5,
  });

const addNotificationJob = async (notificationData: NotificationJobData): Promise<Job<NotificationJobData>> =>
  notificationQueue.add(notificationData, {
    priority: notificationData.priority || 5,
  });

const closeQueues = async (): Promise<void> => {
  await Promise.all([emailQueue.close(), notificationQueue.close()]);
  logger.info('All queues closed');
};

export { emailQueue, notificationQueue, processWithMetrics, addEmailJob, addNotificationJob, closeQueues };
