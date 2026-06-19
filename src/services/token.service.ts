import jwt from 'jsonwebtoken';
import moment, { type Moment } from 'moment';
import httpStatus from 'http-status';
import config from '../config/config.ts';
import * as userService from './user.service.ts';
import * as sessionService from './session.service.ts';
import { Token } from '../models/index.ts';
import type { TokenDocument, TokenType } from '../models/token.model.ts';
import type { UserDocument } from '../models/user.model.ts';
import ApiError from '../utils/ApiError.ts';
import { tokenTypes } from '../config/tokens.ts';
import type { AuthTokenPayload, AuthTokens } from '../types/auth.ts';
import type { ObjectIdLike } from '../types/common.ts';

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
  sessionId?: ObjectIdLike,
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
  sessionId?: ObjectIdLike,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthTokens> => {
  let resolvedSessionId = sessionId;

  if (resolvedSessionId) {
    const activeSession = await sessionService.getActiveSession(resolvedSessionId, user.id);
    if (!activeSession) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    }
    await sessionService.touchSession(resolvedSessionId);
  } else {
    const session = await sessionService.createLoginSession(user.id, { userAgent, ipAddress });
    resolvedSessionId = session.id;
  }

  const sessionIdStr = String(resolvedSessionId);
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const accessToken = generateToken(activityId, user.id, accessTokenExpires, tokenTypes.ACCESS, sessionIdStr);
  const refreshToken = generateToken(activityId, user.id, refreshTokenExpires, tokenTypes.REFRESH, sessionIdStr);
  await saveToken(
    refreshToken,
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH,
    resolvedSessionId,
    userAgent,
    ipAddress
  );

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
  if (tokenDoc.sessionId) {
    await sessionService.revokeSession(tokenDoc.sessionId, tokenDoc.user);
    return tokenDoc;
  }
  await tokenDoc.deleteOne();
  return tokenDoc;
};

const revokeAllUserRefreshTokens = async (userId: ObjectIdLike): Promise<void> => {
  await sessionService.revokeAllUserSessions(userId);
  await Token.deleteMany({ user: userId, type: tokenTypes.REFRESH, blacklisted: false });
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

    if (refreshTokenDoc.sessionId) {
      const activeSession = await sessionService.getActiveSession(refreshTokenDoc.sessionId, user.id);
      if (!activeSession) {
        throw new Error('Session revoked');
      }
    }

    const sessionId = refreshTokenDoc.sessionId;
    await refreshTokenDoc.deleteOne();
    return generateAuthTokens(user, activityId, sessionId, userAgent, ipAddress);
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
  revokeAllUserRefreshTokens,
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
  revokeAllUserRefreshTokens,
  refreshAuth,
};
