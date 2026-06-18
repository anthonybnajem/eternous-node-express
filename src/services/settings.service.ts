import Settings, { type SettingsDocument } from '../models/settings.model.ts';
import type { ObjectIdLike } from '../types/common.ts';

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

export default {
  ensureDefaultSettings,
};

export { ensureDefaultSettings };
