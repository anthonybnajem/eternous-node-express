import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import response from '../config/response.js';
import { aboutService } from '../services/index.js';
import type { AboutAttrs } from '../models/about.model.js';

const createAbout = catchAsync<Record<string, never>, unknown, AboutAttrs>(async (req, res: Response): Promise<void> => {
  const about = await aboutService.createAbout(req.body);
  res
    .status(httpStatus.CREATED)
    .json(response({ message: 'About Created', status: 'OK', statusCode: httpStatus.CREATED, data: about }));
});

const getAbouts = catchAsync(async (_req, res: Response): Promise<void> => {
  const result = await aboutService.queryAbouts();
  res.status(httpStatus.OK).json(response({ message: 'About', status: 'OK', statusCode: httpStatus.OK, data: result }));
});

export default { createAbout, getAbouts };
export { createAbout, getAbouts };
