import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import twoFactorService from '../services/twoFactor.service.ts';

type EmptyParams = Record<string, never>;
type TwoFactorCodeBody = { code: string };

const requireAuthUser = (req: Request) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  return req.user;
};

type EmptyQuery = Record<string, string | undefined>;

const enableTwoFactor = catchAsync<EmptyParams, unknown, unknown, EmptyQuery>(async (req, res: Response) => {
  const user = requireAuthUser(req);
  const payload = await twoFactorService.enableTwoFactor(user.id);
  res.status(httpStatus.OK).json(response({ message: '2FA setup started', statusCode: httpStatus.OK, data: payload }));
});

const verifyTwoFactor = catchAsync<EmptyParams, unknown, TwoFactorCodeBody, EmptyQuery>(async (req, res: Response) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  const settings = await twoFactorService.verifyTwoFactor(req.user.id, req.body.code);
  res.status(httpStatus.OK).json(response({ message: '2FA enabled', statusCode: httpStatus.OK, data: { settings } }));
});

const disableTwoFactor = catchAsync<EmptyParams, unknown, TwoFactorCodeBody, EmptyQuery>(async (req, res: Response) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  const settings = await twoFactorService.disableTwoFactor(req.user.id, req.body.code);
  res.status(httpStatus.OK).json(response({ message: '2FA disabled', statusCode: httpStatus.OK, data: { settings } }));
});

export default { enableTwoFactor, verifyTwoFactor, disableTwoFactor };
