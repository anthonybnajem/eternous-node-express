import httpStatus from 'http-status';
import * as tokenService from './token.service.ts';
import * as userService from './user.service.ts';
import Token from '../models/token.model.ts';
import type { UserDocument } from '../models/user.model.ts';
import ApiError from '../utils/ApiError.ts';
import { tokenTypes } from '../config/tokens.ts';
import type { AuthTokens, ChangePasswordBody, VerifyEmailBody } from '../types/auth.ts';
import type { ObjectIdLike } from '../types/common.ts';

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

  await refreshTokenDoc.deleteOne();
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
  if (await user.isPasswordMatch(newPassword)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password cannot be the same as old password');
  }
  await userService.updateUserById(user.id, { password: newPassword });

  return user;
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
  if (await user.isPasswordMatch(newPassword)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password cannot be the same as old password');
  }
  user.password = newPassword;
  await user.save();
  return user;
};

const verifyEmail = async (reqBody: VerifyEmailBody, _reqQuery?: Record<string, unknown>): Promise<UserDocument> => {
  const { email, oneTimeCode } = reqBody;
  const user = await userService.getUserByEmail(email);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User does not exist');
  }
  if (user.oneTimeCode === null || user.oneTimeCode === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP expired');
  }
  if (oneTimeCode !== user.oneTimeCode) {
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
  logout,
  refreshAuth,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyNumber,
  deleteMe,
};

export {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyNumber,
  deleteMe,
};
