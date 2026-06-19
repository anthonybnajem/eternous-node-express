import httpStatus from 'http-status';
import Settings, { type SettingsDocument } from '../models/settings.model.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike } from '../types/common.ts';

export interface UpdateNotificationSettingsBody {
  notificationsEnabled?: boolean;
  birthdayNotificationsEnabled?: boolean;
  paymentNotificationsEnabled?: boolean;
}

export interface UpdateSettingsBody {
  applicationLock?: boolean;
  newMessagesLock?: boolean;
  billingEmail?: string;
}

const ensureDefaultSettings = async (
  userId: ObjectIdLike,
  billingEmail?: string
): Promise<SettingsDocument> => {
  const settings = await Settings.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        billingEmail: billingEmail?.trim().toLowerCase() ?? '',
        applicationLock: false,
        newMessagesLock: false,
        twoFactorEnabled: false,
        verified: false,
        notificationsEnabled: true,
        birthdayNotificationsEnabled: true,
        paymentNotificationsEnabled: true,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  return settings;
};

const getSettings = async (userId: ObjectIdLike): Promise<SettingsDocument> => ensureDefaultSettings(userId);

const updateSettings = async (userId: ObjectIdLike, body: UpdateSettingsBody): Promise<SettingsDocument> => {
  const settings = await ensureDefaultSettings(userId);
  if (body.billingEmail !== undefined) {
    settings.billingEmail = body.billingEmail.trim().toLowerCase();
  }
  if (body.applicationLock !== undefined) {
    settings.applicationLock = body.applicationLock;
  }
  if (body.newMessagesLock !== undefined) {
    settings.newMessagesLock = body.newMessagesLock;
  }
  await settings.save();
  return settings;
};

const updateNotificationSettings = async (
  userId: ObjectIdLike,
  body: UpdateNotificationSettingsBody
): Promise<SettingsDocument> => {
  const settings = await ensureDefaultSettings(userId);
  if (body.notificationsEnabled !== undefined) {
    settings.notificationsEnabled = body.notificationsEnabled;
  }
  if (body.birthdayNotificationsEnabled !== undefined) {
    settings.birthdayNotificationsEnabled = body.birthdayNotificationsEnabled;
  }
  if (body.paymentNotificationsEnabled !== undefined) {
    settings.paymentNotificationsEnabled = body.paymentNotificationsEnabled;
  }
  await settings.save();
  return settings;
};

export default {
  ensureDefaultSettings,
  getSettings,
  updateSettings,
  updateNotificationSettings,
};

export { ensureDefaultSettings, getSettings, updateSettings, updateNotificationSettings };
