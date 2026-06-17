import type { Job } from 'bull';
import { emailQueue, processWithMetrics, type EmailJobData } from '../index';
import { sendEmail } from '../../services/notifications/email.service';
import logger from '../../config/logger';

const processEmailJob = async (job: Job<EmailJobData>): Promise<void> => {
  const { to, subject, text, html } = job.data;

  logger.info(`Processing email job ${job.id} to ${to}`);

  try {
    await sendEmail(to, subject, text, html);
    logger.info(`Email job ${job.id} completed successfully`);
  } catch (error) {
    logger.error(`Email job ${job.id} failed:`, error);
    throw error;
  }
};

processWithMetrics(emailQueue, processEmailJob);

export default processEmailJob;
