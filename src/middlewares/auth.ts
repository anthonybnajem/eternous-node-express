import type { NextFunction, Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import config from '../config/config.js';
import { roleRights, type Permission, type Role } from '../config/roles.js';
import { tokenTypes } from '../config/tokens.js';
import { Token } from '../models/index.js';
import User from '../models/user.model.js';
import type { AuthTokenPayload } from '../types/auth.js';
import type { UserDocument } from '../models/user.model.js';
import { syncFirebaseUser, verifyIdToken } from '../services/firebaseAuth.service.js';

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const permissionSet = new Set<Permission>([
  ...(roleRights.get('user') ?? []),
  ...(roleRights.get('admin') ?? []),
]);

const isPermissionCheck = (requiredRight: string): requiredRight is Permission => permissionSet.has(requiredRight as Permission);

const verifyLegacyAccessToken = async (token: string): Promise<UserDocument | null> => {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
    if (payload.type !== tokenTypes.ACCESS) {
      return null;
    }

    if (payload.sessionId) {
      const sessionToken = await Token.findOne({
        user: payload.sub,
        sessionId: payload.sessionId,
        type: tokenTypes.REFRESH,
        blacklisted: false,
      });

      if (!sessionToken) {
        return null;
      }
    }

    return User.findById(payload.sub);
  } catch {
    return null;
  }
};

const auth =
  (...requiredRights: string[]): RequestHandler =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      const legacyUser = await verifyLegacyAccessToken(token);
      const user = legacyUser ?? (await syncFirebaseUser(await verifyIdToken(token)));
      req.user = user;

      if (requiredRights.length > 0) {
        const [requiredRight] = requiredRights;

        if (requiredRights.length === 1 && (requiredRight === 'common' || requiredRight === 'user')) {
          next();
          return;
        }

        if (requiredRights.length === 1 && requiredRight === 'admin') {
          if ((user.role as Role | undefined) !== 'admin') {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
          }
          next();
          return;
        }

        if (!requiredRights.every((right) => isPermissionCheck(right))) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
        }

        const userRights = roleRights.get((user.role ?? 'user') as Role) ?? [];
        const hasRequiredRights = requiredRights.every((requiredRightValue) => userRights.includes(requiredRightValue));

        if (!hasRequiredRights) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;
