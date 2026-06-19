import type { Server } from 'http';
import app from './app.ts';
import config from './config/config.ts';
import logger from './config/logger.ts';
import { connectDB, closeDB } from './config/database.ts';
import { closeRedis } from './config/redis.ts';
import { closeQueues } from './queues/index.ts';
import { startLogReportScheduler, startLogCleanupScheduler, stopAllSchedulers } from './config/scheduler.ts';
import { startNotificationSchedulers, stopNotificationSchedulers } from './config/notificationScheduler.ts';

import './queues/processors/email.processor.js';
import './queues/processors/notification.processor.js';

let server: Server | undefined;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API Documentation available at http://localhost:${config.port}/api-docs`);
      logger.info(`Health check available at http://localhost:${config.port}/health`);
      logger.info(`Metrics available at http://localhost:${config.port}/metrics`);

      startLogReportScheduler();
      startLogCleanupScheduler();
      startNotificationSchedulers();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const exitHandler = async (): Promise<void> => {
  if (server) {
    logger.info('Shutting down server gracefully...');

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        stopAllSchedulers();
        stopNotificationSchedulers();
        await closeQueues();
        await closeRedis();
        await closeDB();
        logger.info('All connections closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

const unexpectedErrorHandler = (error: unknown): void => {
  logger.error('Unexpected error:', error);
  void exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  void exitHandler();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received');
  void exitHandler();
});

void startServer();

export default app;
