import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import { privacyService } from '../services/index.ts';
import type { PrivacyAttrs } from '../models/privacy.model.ts';

const createPrivacy = catchAsync<Record<string, never>, unknown, PrivacyAttrs>(async (req, res: Response): Promise<void> => {
  const privacy = await privacyService.createPrivacy(req.body);
  res
    .status(httpStatus.CREATED)
    .json(response({ message: 'Privacy Created', status: 'OK', statusCode: httpStatus.CREATED, data: privacy }));
});

const getPrivacy = catchAsync(async (_req, res: Response): Promise<void> => {
  const result = await privacyService.queryPrivacy();
  res
    .status(httpStatus.OK)
    .json(response({ message: 'Privacy', status: 'OK', statusCode: httpStatus.OK, data: result }));
});

export default { createPrivacy, getPrivacy };
export { createPrivacy, getPrivacy };
