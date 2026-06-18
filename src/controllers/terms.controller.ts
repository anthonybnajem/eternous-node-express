import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import { termsService, activityService } from '../services/index.ts';
import type { TermsAttrs } from '../models/terms.model.ts';

const createTerms = catchAsync<Record<string, never>, unknown, TermsAttrs>(async (req, res: Response): Promise<void> => {
  const terms = await termsService.createTerms(req.body);
  await activityService.recordAdminAction(req, 'cms_terms_create', 'Created terms and conditions content', {
    termsId: terms.id,
  });
  res
    .status(httpStatus.CREATED)
    .json(response({ message: 'Terms Created', status: 'OK', statusCode: httpStatus.CREATED, data: terms }));
});

const getTerms = catchAsync(async (_req, res: Response): Promise<void> => {
  const result = await termsService.queryTerms();
  res.status(httpStatus.OK).json(response({ message: 'Terms', status: 'OK', statusCode: httpStatus.OK, data: result }));
});

export default { createTerms, getTerms };
export { createTerms, getTerms };
