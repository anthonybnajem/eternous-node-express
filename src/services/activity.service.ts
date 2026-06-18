import type { Request } from 'express';
import logger from '../config/logger.ts';
import { Activity } from '../models/index.ts';
import type { ActivityType } from '../models/activity.model.ts';

export type ActivityRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

export type SubscriptionActivityType =
  | 'subscription_checkout'
  | 'subscription_created'
  | 'subscription_canceled'
  | 'subscription_activated'
  | 'subscription_updated';

export type UserProductActivityType = 'tree' | 'member' | 'voice' | 'chat' | 'credit' | 'settings' | 'notification';

const getRequestMeta = (req: Pick<Request, 'ip' | 'get'>): ActivityRequestMeta => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent') ?? undefined,
});

export interface RecordActivityOptions {
  userId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const recordActivity = async (options: RecordActivityOptions): Promise<void> => {
  const { userId, type, description, metadata = {}, ipAddress, userAgent } = options;

  try {
    await Activity.create({
      user: userId,
      type,
      description,
      ipAddress,
      userAgent,
      metadata,
    });

    logger.info(`Activity [${type}] user=${userId}: ${description}`, {
      ...(metadata.actorId ? { actorId: metadata.actorId } : {}),
      ...(metadata.action ? { action: metadata.action } : {}),
      ...(metadata.subscriptionId ? { subscriptionId: metadata.subscriptionId } : {}),
    });
  } catch (error) {
    logger.error('Failed to record activity:', error);
  }
};

const recordActivityFromRequest = async (
  req: Pick<Request, 'ip' | 'get'>,
  userId: string,
  type: ActivityType,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  const { ipAddress, userAgent } = getRequestMeta(req);
  await recordActivity({ userId, type, description, metadata, ipAddress, userAgent });
};

const recordAdminAction = async (
  req: Pick<Request, 'ip' | 'get' | 'user'>,
  action: string,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  if (!req.user) {
    return;
  }

  const actorId = String(req.user.id);
  await recordActivityFromRequest(req, actorId, 'admin_action', description, {
    action,
    actorId,
    actorEmail: req.user.email,
    ...metadata,
  });
};

const recordSubscriptionActivity = async (
  userId: string,
  type: SubscriptionActivityType,
  description: string,
  metadata: Record<string, unknown> = {},
  req?: Pick<Request, 'ip' | 'get'> | null
): Promise<void> => {
  if (req) {
    await recordActivityFromRequest(req, userId, type, description, metadata);
    return;
  }

  await recordActivity({ userId, type, description, metadata });
};

const recordUserProductAction = async (
  req: Pick<Request, 'ip' | 'get' | 'user'>,
  type: UserProductActivityType,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  if (!req.user) {
    return;
  }

  await recordActivityFromRequest(req, String(req.user.id), type, description, metadata);
};

export default {
  recordActivity,
  recordActivityFromRequest,
  recordAdminAction,
  recordSubscriptionActivity,
  recordUserProductAction,
  getRequestMeta,
};

export {
  recordActivity,
  recordActivityFromRequest,
  recordAdminAction,
  recordSubscriptionActivity,
  recordUserProductAction,
  getRequestMeta,
};
