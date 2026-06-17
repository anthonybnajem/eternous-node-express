import type { Request } from 'express';
import httpStatus from 'http-status';
import ApiError from './ApiError.js';
import type { UserDocument } from '../models/user.model.js';

const requireUser = (req: Request): UserDocument => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  return req.user;
};

export default requireUser;
export { requireUser };
