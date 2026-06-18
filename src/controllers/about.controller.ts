import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import { aboutService, activityService } from '../services/index.ts';
import type { AboutAttrs } from '../models/about.model.ts';

const createAbout = catchAsync<Record<string, never>, unknown, AboutAttrs>(async (req, res: Response): Promise<void> => {
  const about = await aboutService.createAbout(req.body);
  await activityService.recordAdminAction(req, 'cms_about_create', 'Created about page content', { aboutId: about.id });
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
