import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import ApiError from '../utils/ApiError.ts';
import response from '../config/response.ts';
import logger from '../config/logger.ts';
import { authService, userService, tokenService, emailService } from '../services/index.ts';
import { deleteFirebaseUser, syncFirebaseUser, verifyIdToken } from '../services/firebaseAuth.service.ts';
import { Activity } from '../models/index.ts';
import type { ActivityType } from '../models/activity.model.ts';
import type {
  ChangePasswordBody,
  DeleteMeBody,
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from '../types/auth.ts';

type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, never>;

const getClientMetadata = (req: Pick<Request, 'ip' | 'get'>): { userAgent?: string; ipAddress?: string } => ({
  userAgent: req.get('user-agent') ?? undefined,
  ipAddress: req.ip,
});

const isFirebaseAuth = (body: RegisterBody | LoginBody): body is RegisterBody & { idToken: string } => {
  return typeof body.idToken === 'string' && body.idToken.length > 0;
};

const syncFirebaseAuth = async (idToken: string, fullName?: string) => {
  const decoded = await verifyIdToken(idToken);
  const user = await syncFirebaseUser(decoded, { updateLastLogin: true });

  if (fullName && fullName.trim() && !user.fullName?.trim()) {
    user.fullName = fullName.trim();
    await user.save();
  }

  return user;
};

const recordActivity = async (
  req: Pick<Request, 'ip' | 'get'>,
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

const handleLegacyRegister = async (body: RegisterBody) => {
  if (!body.email || !body.password || !body.fullName) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email, password and full name are required');
  }

  const isUser = await userService.getUserByEmail(body.email);

  if (isUser && isUser.isEmailVerified === false) {
    await userService.isUpdateUser(isUser.id, body);
  } else if (isUser && isUser.isDeleted === false) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  } else if (isUser && isUser.isDeleted === true) {
    await userService.isUpdateUser(isUser.id, body);
  } else {
    await userService.createUser({
      email: body.email,
      fullName: body.fullName,
      password: body.password,
      role: body.role,
      phoneNumber: body.phoneNumber,
      address: body.address,
      dateOfBirth: body.dateOfBirth,
      authProvider: 'email',
    });
  }

  const user = await userService.getUserByEmail(body.email);
  if (!user) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create user');
  }

  return user;
};

const register = catchAsync<EmptyParams, unknown, RegisterBody, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = isFirebaseAuth(req.body)
    ? await syncFirebaseAuth(req.body.idToken, req.body.fullName)
    : await handleLegacyRegister(req.body);
  const { userAgent, ipAddress } = getClientMetadata(req);
  const tokens = await tokenService.generateAuthTokens(user, undefined, undefined, userAgent, ipAddress);

  await recordActivity(
    req,
    user.id,
    'register',
    `${user.email} registered successfully`,
    { authProvider: user.authProvider }
  );

  res.status(httpStatus.CREATED).json(
    response({
      message: 'Authentication successful',
      status: 'OK',
      statusCode: httpStatus.CREATED,
      data: { user, tokens },
    })
  );
});

const login = catchAsync<EmptyParams, unknown, LoginBody, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = isFirebaseAuth(req.body)
    ? await syncFirebaseAuth(req.body.idToken)
    : await authService.loginUserWithEmailAndPassword(req.body.email ?? '', req.body.password ?? '');

  if (user.isDeleted === true) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This Account is Deleted');
  }
  if (user.isEmailVerified === false) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not verified');
  }

  user.lastLogin = new Date();
  await user.save();

  const { userAgent, ipAddress } = getClientMetadata(req);
  const tokens = await tokenService.generateAuthTokens(user, undefined, undefined, userAgent, ipAddress);

  await recordActivity(
    req,
    user.id,
    'login',
    `${user.email} logged in successfully`,
    { authProvider: user.authProvider }
  );

  res.status(httpStatus.OK).json(
    response({
      message: 'Login Successful',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { user, tokens },
    })
  );
});

const logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
  }

  const user = await authService.logout(refreshToken);

  await recordActivity(req, String(user.id), 'logout', `${user.email} logged out successfully`, {
    authProvider: user.authProvider,
  });

  res.status(httpStatus.OK).json(
    response({
      message: 'Logout Successful',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { user },
    })
  );
});

const refreshTokens = catchAsync<EmptyParams, unknown, { refreshToken: string }, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const tokens = await authService.refreshAuth(
      req.body.refreshToken,
      undefined,
      req.get('user-agent') ?? undefined,
      req.ip
    );

    res.status(httpStatus.OK).json(
      response({
        message: 'Tokens Refreshed',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { tokens },
      })
    );
  }
);

const forgotPassword = catchAsync<EmptyParams, unknown, ForgotPasswordBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = await userService.getUserByEmail(req.body.email);
    if (!user) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No users found with this email');
    }

    const oneTimeCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    user.oneTimeCode = oneTimeCode;
    user.isResetPassword = true;
    await user.save();

    await emailService.sendResetPasswordEmail(req.body.email, oneTimeCode);
    res.status(httpStatus.OK).json(
      response({
        message: 'Email Sent',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: {},
      })
    );
  }
);

const resetPassword = catchAsync<EmptyParams, unknown, ResetPasswordBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    await authService.resetPassword(req.body.password, req.body.email);
    res.status(httpStatus.OK).json(
      response({
        message: 'Password Reset Successful',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: {},
      })
    );
  }
);

const changePassword = catchAsync<EmptyParams, unknown, ChangePasswordBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }
    const user = await authService.changePassword(req.user, req.body);
    await recordActivity(
      req,
      user.id,
      'password_change',
      `${user.email} changed password successfully`,
      { authProvider: user.authProvider }
    );
    res.status(httpStatus.OK).json(
      response({
        message: 'Password Change Successful',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: {},
      })
    );
  }
);

const sendVerificationEmail = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  res.status(httpStatus.NOT_IMPLEMENTED).send({ message: 'Verification email endpoint not implemented' });
});

const verifyEmail = catchAsync<EmptyParams, unknown, VerifyEmailBody, Record<string, unknown>>(
  async (req, res: Response): Promise<void> => {
    const user = await authService.verifyEmail(req.body, req.query);
    const { userAgent, ipAddress } = getClientMetadata(req);
    const tokens = await tokenService.generateAuthTokens(user, undefined, undefined, userAgent, ipAddress);

    await recordActivity(
      req,
      user.id,
      'other',
      `${user.email} verified email successfully`,
      { authProvider: user.authProvider }
    );

    res.status(httpStatus.OK).json(
      response({
        message: 'Email Verified',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { user, tokens },
      })
    );
  }
);

const deleteMe = catchAsync<EmptyParams, unknown, DeleteMeBody, EmptyQuery>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  if (req.user.authProvider !== 'firebase') {
    if (!req.body.password) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Password is required');
    }
    const passwordMatches = await req.user.isPasswordMatch(req.body.password);
    if (!passwordMatches) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect password');
    }
  }

  if (req.user.firebaseUid) {
    await deleteFirebaseUser(req.user.firebaseUid);
  }

  const user = await userService.updateUserById(req.user.id, {
    isDeleted: true,
    isActive: false,
    isSuspended: true,
  });

  await recordActivity(req, user.id, 'other', `${user.email} deleted account`, {
    authProvider: user.authProvider,
  });

  res.status(httpStatus.OK).json(
    response({
      message: 'Account Deleted',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { user },
    })
  );
});

export default {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  deleteMe,
  changePassword,
};

export {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  deleteMe,
  changePassword,
};
