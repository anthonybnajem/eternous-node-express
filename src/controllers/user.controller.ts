import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import * as userService from '../services/user.service.ts';
import pick from '../utils/pick.ts';
import logger from '../config/logger.ts';
import { Activity } from '../models/index.ts';
import type { ActivityType } from '../models/activity.model.ts';

type UserIdParams = { userId: string };
type NidBody = { nidNumber: string };
type UserIdBody = { userId: string };
type UserQuery = Record<string, string | undefined>;

const recordActivity = async (
  req: Parameters<typeof catchAsync>[0] extends (...args: infer Args) => unknown ? Args[0] : never,
  userId: string,
  type: ActivityType,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  try {
    await Activity.create({
      user: userId,
      type,
      description,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata,
    });
  } catch (error) {
    logger.error('Failed to record activity:', error);
  }
};

const interestList = catchAsync(async (_req, res: Response): Promise<void> => {
  const interests = await userService.interestList();
  res.status(httpStatus.OK).send({
    message: 'Interests retrieved successfully',
    data: interests,
  });
});

const getUsers = catchAsync<Record<string, never>, unknown, unknown, UserQuery>(async (req, res: Response): Promise<void> => {
  const filter = pick(req.query, ['fullName', 'email', 'role', 'isEmailVerified', 'isDeleted', 'isSuspended']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync<UserIdParams>(async (req, res: Response): Promise<void> => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    res.status(httpStatus.NOT_FOUND).send({ message: 'User not found' });
    return;
  }
  res.send(user);
});

const updateUser = catchAsync<UserIdParams, unknown, userService.UserUpdateBody>(async (req, res: Response): Promise<void> => {
  const files = Array.isArray(req.files) ? req.files : undefined;
  const user = await userService.updateUserById(req.params.userId, req.body, files);
  if (req.user) {
    await recordActivity(req, req.user.id, 'update_profile', `${req.user.email} updated profile`, {
      targetUserId: user.id,
    });
  }
  res.send({
    message: 'User updated successfully',
    data: user,
  });
});

const verifyNid = catchAsync<Record<string, never>, unknown, NidBody>(async (req, res: Response): Promise<void> => {
  const { nidNumber } = req.body;
  if (!req.user) {
    throw new Error('Unauthorized');
  }
  const user = await userService.verifyNid(req.user.id, nidNumber);
  res.status(httpStatus.OK).send({
    message: 'NID verification submitted successfully',
    data: user,
  });
});

const nidVerifyApproval = catchAsync<Record<string, never>, unknown, UserIdBody>(async (req, res: Response): Promise<void> => {
  const { userId } = req.body;
  const user = await userService.nidVerifyApproval(userId);
  res.status(httpStatus.OK).send({
    message: 'NID verification approved successfully',
    data: user,
  });
});

const nidVerifyReject = catchAsync<Record<string, never>, unknown, UserIdBody>(async (req, res: Response): Promise<void> => {
  const { userId } = req.body;
  const user = await userService.nidVerifyReject(userId);
  res.status(httpStatus.OK).send({
    message: 'NID verification rejected',
    data: user,
  });
});

const nidVerifySubmitList = catchAsync(async (_req, res: Response): Promise<void> => {
  const users = await userService.nidVerifySubmitList();
  res.status(httpStatus.OK).send({
    message: 'NID verification list retrieved successfully',
    data: users,
  });
});

export default {
  interestList,
  getUsers,
  getUser,
  updateUser,
  verifyNid,
  nidVerifyApproval,
  nidVerifyReject,
  nidVerifySubmitList,
};
