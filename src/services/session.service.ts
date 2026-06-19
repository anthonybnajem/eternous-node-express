import mongoose from 'mongoose';
import Session, { type SessionDeviceType, type SessionDocument } from '../models/session.model.ts';
import Token from '../models/token.model.ts';
import { tokenTypes } from '../config/tokens.ts';
import type { ObjectIdLike } from '../types/common.ts';

const inferDeviceType = (userAgent?: string): SessionDeviceType => {
  const ua = (userAgent ?? '').toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    return 'ios';
  }
  if (ua.includes('android')) {
    return 'android';
  }
  if (ua.includes('electron') || ua.includes('windows nt') || ua.includes('macintosh')) {
    return 'desktop';
  }
  if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) {
    return 'web';
  }
  return 'unknown';
};

const inferDeviceName = (userAgent?: string): string => {
  if (!userAgent?.trim()) {
    return 'Unknown device';
  }
  if (userAgent.includes('FlowTest/Chrome')) {
    return 'Chrome (FlowTest)';
  }
  if (userAgent.includes('FlowTest/Safari')) {
    return 'Safari (FlowTest)';
  }
  if (userAgent.includes('Chrome')) {
    return 'Chrome';
  }
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox';
  }
  return userAgent.slice(0, 120);
};

const createLoginSession = async (
  userId: ObjectIdLike,
  options: { userAgent?: string; ipAddress?: string; deviceName?: string } = {}
): Promise<SessionDocument> => {
  const { userAgent, ipAddress, deviceName } = options;
  const now = new Date();

  return Session.create({
    userId,
    deviceName: deviceName ?? inferDeviceName(userAgent),
    deviceType: inferDeviceType(userAgent),
    userAgent,
    ipAddress,
    loggedInAt: now,
    lastActiveAt: now,
    isActive: true,
    revokedAt: null,
  });
};

const getActiveSession = async (
  sessionId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<SessionDocument | null> => Session.findOne({ _id: sessionId, userId, isActive: true });

const touchSession = async (sessionId: ObjectIdLike): Promise<void> => {
  await Session.updateOne({ _id: sessionId, isActive: true }, { lastActiveAt: new Date() });
};

const listActiveSessions = async (userId: ObjectIdLike): Promise<SessionDocument[]> => {
  return Session.find({ userId, isActive: true }).sort({ lastActiveAt: -1 });
};

const revokeSession = async (sessionId: ObjectIdLike, userId: ObjectIdLike): Promise<void> => {
  await Session.updateOne({ _id: sessionId, userId }, { isActive: false, revokedAt: new Date() });
  await Token.deleteMany({
    sessionId,
    user: userId,
    type: tokenTypes.REFRESH,
    blacklisted: false,
  });
};

const revokeAllUserSessions = async (userId: ObjectIdLike): Promise<void> => {
  await Session.updateMany({ userId, isActive: true }, { isActive: false, revokedAt: new Date() });
};

const isMongoObjectId = (value: string): boolean => mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);

export default {
  createLoginSession,
  getActiveSession,
  touchSession,
  listActiveSessions,
  revokeSession,
  revokeAllUserSessions,
  isMongoObjectId,
};

export {
  createLoginSession,
  getActiveSession,
  touchSession,
  listActiveSessions,
  revokeSession,
  revokeAllUserSessions,
  isMongoObjectId,
};
