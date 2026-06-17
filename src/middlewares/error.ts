import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import httpStatus from 'http-status';
import config from '../config/config';
import logger from '../config/logger';
import ApiError from '../utils/ApiError';

interface ErrorWithStatus extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

const errorConverter = (err: ErrorWithStatus, _req: Request, _res: Response, next: NextFunction): void => {
  let error: ErrorWithStatus | ApiError = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error instanceof mongoose.Error ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || String(httpStatus[statusCode]);
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

const errorHandler: ErrorRequestHandler = (err: ErrorWithStatus, _req: Request, res: Response, _next: NextFunction): void => {
  let { statusCode = httpStatus.INTERNAL_SERVER_ERROR, message } = err;
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = String(httpStatus[httpStatus.INTERNAL_SERVER_ERROR]);
  }

  res.locals.errorMessage = err.message;

  const errorResponse = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  if (config.env === 'development') {
    logger.error(err);
  }

  res.status(statusCode).send(errorResponse);
};

export { errorConverter, errorHandler };
