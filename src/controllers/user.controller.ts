import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import * as userService from '../services/user.service.ts';
import { activityService, sessionService } from '../services/index.ts';
import response from '../config/response.ts';
import pick from '../utils/pick.ts';

type UserIdParams = { userId: string };
type NidBody = { nidNumber: string };
type UserIdBody = { userId: string };
type UserQuery = Record<string, string | undefined>;

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
    await activityService.recordActivityFromRequest(req, req.user.id, 'update_profile', `${req.user.email} updated profile`, {
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
  await activityService.recordActivityFromRequest(req, req.user.id, 'other', `${req.user.email} submitted NID verification`, {
    action: 'nid_submit',
    nidNumber,
  });
  res.status(httpStatus.OK).send({
    message: 'NID verification submitted successfully',
    data: user,
  });
});

const nidVerifyApproval = catchAsync<Record<string, never>, unknown, UserIdBody>(async (req, res: Response): Promise<void> => {
  const { userId } = req.body;
  const user = await userService.nidVerifyApproval(userId);
  await activityService.recordAdminAction(req, 'nid_approve', `Approved NID verification for user ${userId}`, {
    targetUserId: userId,
    targetEmail: user.email,
  });
  res.status(httpStatus.OK).send({
    message: 'NID verification approved successfully',
    data: user,
  });
});

const nidVerifyReject = catchAsync<Record<string, never>, unknown, UserIdBody>(async (req, res: Response): Promise<void> => {
  const { userId } = req.body;
  const user = await userService.nidVerifyReject(userId);
  await activityService.recordAdminAction(req, 'nid_reject', `Rejected NID verification for user ${userId}`, {
    targetUserId: userId,
    targetEmail: user.email,
  });
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

type SessionIdParams = { sessionId: string };
type MyProfileBody = { fullName?: string; username?: string; phoneNumber?: string; address?: string };

const getMyProfile = catchAsync(async (req, res: Response): Promise<void> => {
  if (!req.user) throw new Error('Unauthorized');
  const profile = await userService.getMyProfile(req.user.id);
  res.status(httpStatus.OK).json(
    response({
      message: 'Profile retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: profile,
    })
  );
});

const updateMyProfile = catchAsync<Record<string, never>, unknown, MyProfileBody>(async (req, res: Response): Promise<void> => {
  if (!req.user) throw new Error('Unauthorized');
  const user = await userService.updateMyProfile(req.user.id, req.body);
  res.status(httpStatus.OK).json(
    response({
      message: 'Profile updated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { user, creditBalance: user.creditBalance ?? 0 },
    })
  );
});

const revokeMyDevice = catchAsync<SessionIdParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) throw new Error('Unauthorized');
  await sessionService.revokeSession(req.params.sessionId, req.user.id);
  res.status(httpStatus.OK).json(
    response({
      message: 'Device revoked successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const revokeAllMyDevices = catchAsync(async (req, res: Response): Promise<void> => {
  if (!req.user) throw new Error('Unauthorized');
  await sessionService.revokeAllUserSessions(req.user.id);
  res.status(httpStatus.OK).json(
    response({
      message: 'All devices revoked successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const listMyDevices = catchAsync(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new Error('Unauthorized');
  }
  const devices = await sessionService.listActiveSessions(req.user.id);
  res.status(httpStatus.OK).json(
    response({
      message: 'Devices retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { devices },
    })
  );
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
  getMyProfile,
  updateMyProfile,
  listMyDevices,
  revokeMyDevice,
  revokeAllMyDevices,
};
