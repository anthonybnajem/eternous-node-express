import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import response from '../config/response';

const imageVerification = (req: Request, res: Response, next: NextFunction): void => {
  const files = Array.isArray(req.files) ? req.files : [];

  if (files.length === 0) {
    logger.error('Images not found');
    res.status(403).json(
      response({
        code: '403',
        message: 'Images not found',
      })
    );
    return;
  }
  next();
};

export default imageVerification;
