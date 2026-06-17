import type { Job } from 'bull';
import { notificationQueue, processWithMetrics, type NotificationJobData } from '../index.js';
import { sendPushNotification } from '../../services/notifications/fcm.service.js';
import logger from '../../config/logger.js';

const processNotificationJob = async (job: Job<NotificationJobData>): Promise<void> => {
  const { token, title, body, data } = job.data;

  logger.info(`Processing notification job ${job.id}`);

  try {
    await sendPushNotification(token, { title, body, data });
    logger.info(`Notification job ${job.id} completed successfully`);
  } catch (error) {
    logger.error(`Notification job ${job.id} failed:`, error);
    throw error;
  }
};

processWithMetrics(notificationQueue, processNotificationJob);

export default processNotificationJob;
