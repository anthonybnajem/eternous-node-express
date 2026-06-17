import jwt from 'jsonwebtoken';
import moment, { type Moment } from 'moment';
import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import config from '../config/config';
import * as userService from './user.service';
import { Token } from '../models/index';
import type { TokenDocument, TokenType } from '../models/token.model';
import type { UserDocument } from '../models/user.model';
import ApiError from '../utils/ApiError';
import { tokenTypes } from '../config/tokens';
import type { AuthTokenPayload, AuthTokens } from '../types/auth';
import type { ObjectIdLike } from '../types/common';

const generateToken = (
  activityId: ObjectIdLike | undefined,
  userId: ObjectIdLike,
  expires: Moment,
  type: TokenType,
  sessionId?: string,
  secret = config.jwt.secret
): string => {
  const payload: AuthTokenPayload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    activity: activityId,
    sessionId,
    type,
  };

  return jwt.sign(payload, secret);
};

const saveToken = async (
  token: string,
  userId: ObjectIdLike,
  expires: Moment,
  type: TokenType,
  sessionId?: string,
  userAgent?: string,
  ipAddress?: string,
  blacklisted = false
): Promise<TokenDocument> => {
  return Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
    sessionId,
    userAgent,
    ipAddress,
  });
};

const verifyToken = async (token: string, type: TokenType): Promise<TokenDocument> => {
  const payload = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
  const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

const generateAuthTokens = async (
  user: UserDocument,
  activityId?: ObjectIdLike,
  sessionId?: string,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthTokens> => {
  const session = sessionId ?? randomUUID();
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const accessToken = generateToken(activityId, user.id, accessTokenExpires, tokenTypes.ACCESS, session);
  const refreshToken = generateToken(activityId, user.id, refreshTokenExpires, tokenTypes.REFRESH, session);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH, session, userAgent, ipAddress);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

const generateResetPasswordToken = async (email: string): Promise<string> => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(undefined, user.id, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  return resetPasswordToken;
};

const generateVerifyEmailToken = async (user: UserDocument): Promise<string> => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(undefined, user.id, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};

const revokeRefreshToken = async (refreshToken: string): Promise<TokenDocument> => {
  const tokenDoc = await verifyToken(refreshToken, tokenTypes.REFRESH);
  await tokenDoc.deleteOne();
  return tokenDoc;
};

const refreshAuth = async (
  refreshToken: string,
  activityId?: ObjectIdLike,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthTokens> => {
  try {
    const refreshTokenDoc = await verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error('User not found');
    }

    await refreshTokenDoc.deleteOne();
    return generateAuthTokens(user, activityId, refreshTokenDoc.sessionId ?? randomUUID(), userAgent, ipAddress);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

export default {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  revokeRefreshToken,
  refreshAuth,
};

export {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  revokeRefreshToken,
  refreshAuth,
};
