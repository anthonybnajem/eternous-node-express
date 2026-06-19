import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import { memberRelationTypeService } from '../services/index.ts';

const listRelationTypes = catchAsync(async (_req, res: Response): Promise<void> => {
  const relationTypes = await memberRelationTypeService.listActiveRelationTypes();

  res.status(httpStatus.OK).json(
    response({
      message: 'Member relation types retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: relationTypes,
    })
  );
});

export default {
  listRelationTypes,
};
