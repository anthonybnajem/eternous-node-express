import type { Server } from 'http';
import app from './app';
import config from './config/config';
import logger from './config/logger';
import { connectDB, closeDB } from './config/database';
import { closeRedis } from './config/redis';
import { closeQueues } from './queues/index';
import { startLogReportScheduler, startLogCleanupScheduler, stopAllSchedulers } from './config/scheduler';

import './queues/processors/email.processor';
import './queues/processors/notification.processor';

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
