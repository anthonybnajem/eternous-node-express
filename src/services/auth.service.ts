import httpStatus from 'http-status';
import config from '../config/config.ts';
import * as tokenService from './token.service.ts';
import * as sessionService from './session.service.ts';
import * as userService from './user.service.ts';
import Token from '../models/token.model.ts';
import type { UserDocument } from '../models/user.model.ts';
import ApiError from '../utils/ApiError.ts';
import { tokenTypes } from '../config/tokens.ts';
import type { AuthTokens, ChangePasswordBody, ResendVerificationBody, VerifyEmailBody } from '../types/auth.ts';
import type { ObjectIdLike } from '../types/common.ts';
import {
  assertFirebaseEmailVerified,
  isFirebaseConfigured,
  sendFirebaseEmailVerification,
  syncFirebasePasswordForUser,
  syncFirebaseUser,
  verifyIdToken,
} from './firebaseAuth.service.ts';

const applyPasswordChange = async (user: UserDocument, newPassword: string): Promise<UserDocument> => {
  if (await user.isPasswordMatch(newPassword)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password cannot be the same as old password');
  }

  if (isFirebaseConfigured()) {
    await syncFirebasePasswordForUser(user, newPassword, user.fullName);
  }

  user.password = newPassword;
  await user.save();
  await tokenService.revokeAllUserRefreshTokens(user.id);
  return user;
};

const loginUserWithEmailAndPassword = async (email: string, password: string): Promise<UserDocument> => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

const logout = async (refreshToken: string): Promise<UserDocument> => {
  const refreshTokenDoc = await Token.findOne({
    token: refreshToken,
    type: tokenTypes.REFRESH,
    blacklisted: false,
  });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  const user = await userService.getUserById(refreshTokenDoc.user);
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  if (refreshTokenDoc.sessionId) {
    await sessionService.revokeSession(refreshTokenDoc.sessionId, refreshTokenDoc.user);
  } else {
    await refreshTokenDoc.deleteOne();
  }

  return user;
};

const refreshAuth = async (
  refreshToken: string,
  activityId?: ObjectIdLike,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthTokens> => {
  return tokenService.refreshAuth(refreshToken, activityId, userAgent, ipAddress);
};

const resetPassword = async (newPassword: string, email: string): Promise<UserDocument> => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return applyPasswordChange(user, newPassword);
};

const changePassword = async (reqUser: UserDocument, reqBody: ChangePasswordBody): Promise<UserDocument> => {
  const { oldPassword, newPassword } = reqBody;
  const user = await userService.getUserByEmail(reqUser.email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (!(await user.isPasswordMatch(oldPassword))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect password');
  }
  return applyPasswordChange(user, newPassword);
};

const verifyEmailWithIdToken = async (idToken: string): Promise<UserDocument> => {
  const decoded = await verifyIdToken(idToken);

  if (!decoded.email_verified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not verified in Firebase yet');
  }

  const user = await syncFirebaseUser(decoded);
  user.isEmailVerified = true;
  user.oneTimeCode = null;
  user.oneTimeCodeExpiresAt = null;
  await user.save();
  return user;
};

const verifyEmailLegacy = async (reqBody: VerifyEmailBody): Promise<UserDocument> => {
  const { email, oneTimeCode } = reqBody;
  if (!email || oneTimeCode === undefined || oneTimeCode === null) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email and oneTimeCode are required for legacy verification');
  }

  const user = await userService.getUserByEmail(email);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }
  if (user.oneTimeCode === null || user.oneTimeCode === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP expired');
  }
  if (Number(oneTimeCode) !== user.oneTimeCode) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }
  if (user.isEmailVerified && !user.isResetPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already verified');
  }

  user.isEmailVerified = true;
  user.oneTimeCode = null;
  user.isResetPassword = false;
  await user.save();
  return user;
};

const verifyEmail = async (reqBody: VerifyEmailBody, _reqQuery?: Record<string, unknown>): Promise<UserDocument> => {
  if (reqBody.idToken) {
    return verifyEmailWithIdToken(reqBody.idToken);
  }

  return verifyEmailLegacy(reqBody);
};

const resendEmailVerification = async ({ email }: ResendVerificationBody): Promise<void> => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already verified');
  }
  if (!isFirebaseConfigured()) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Firebase auth is not configured');
  }

  if (user.emailVerificationSentAt) {
    const cooldownMs = config.auth.resendVerificationCooldownSeconds * 1000;
    const elapsed = Date.now() - user.emailVerificationSentAt.getTime();
    if (elapsed < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Please wait ${waitSeconds} seconds before resending verification email`);
    }
  }

  await sendFirebaseEmailVerification(email);
  user.emailVerificationSentAt = new Date();
  await user.save();
};

const loginUserWithIdToken = async (idToken: string): Promise<UserDocument> => {
  const decoded = await verifyIdToken(idToken);
  assertFirebaseEmailVerified(decoded);
  return syncFirebaseUser(decoded, { updateLastLogin: true });
};

const verifyNumber = async (phoneNumber: string, otpCode: number, email: string): Promise<UserDocument> => {
  const user = await userService.getUserByEmail(email);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }
  if (user.phoneNumberOTP === null || user.phoneNumberOTP === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP expired');
  }
  if (otpCode !== user.phoneNumberOTP) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }
  if (user.isPhoneNumberVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone Number already verified');
  }

  user.isPhoneNumberVerified = true;
  user.phoneNumberOTP = null;
  await user.save();
  return user;
};

const deleteMe = async (password: string, reqUser: UserDocument): Promise<UserDocument> => {
  const user = await userService.getUserByEmail(reqUser.email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (!(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect password');
  }
  user.isDeleted = true;
  await user.save();
  return user;
};

export default {
  loginUserWithEmailAndPassword,
  loginUserWithIdToken,
  logout,
  refreshAuth,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyEmailWithIdToken,
  resendEmailVerification,
  verifyNumber,
  deleteMe,
};

export {
  loginUserWithEmailAndPassword,
  loginUserWithIdToken,
  logout,
  refreshAuth,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyEmailWithIdToken,
  resendEmailVerification,
  verifyNumber,
  deleteMe,
};
