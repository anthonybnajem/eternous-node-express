import httpStatus from 'http-status';
import Settings from '../models/settings.model.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike } from '../types/common.ts';

const DEV_TOTP_CODE = '123456';

const enableTwoFactor = async (userId: ObjectIdLike) => {
  const settings = await Settings.findOne({ userId });
  if (!settings) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Settings not found');
  }

  settings.metadata = {
    ...(settings.metadata ?? {}),
    twoFactorSecret: `dev-secret-${userId}`,
    twoFactorPending: true,
  };
  await settings.save();

  return {
    secret: `dev-secret-${userId}`,
    qrCodeUrl: `otpauth://totp/Eternous:${userId}?secret=DEVSECRET&issuer=Eternous`,
    devCode: DEV_TOTP_CODE,
  };
};

const verifyTwoFactor = async (userId: ObjectIdLike, code: string) => {
  if (code !== DEV_TOTP_CODE) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid verification code');
  }

  const settings = await Settings.findOne({ userId });
  if (!settings) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Settings not found');
  }

  settings.twoFactorEnabled = true;
  settings.verified = true;
  settings.metadata = {
    ...(settings.metadata ?? {}),
    twoFactorPending: false,
  };
  await settings.save();
  return settings;
};

const disableTwoFactor = async (userId: ObjectIdLike, code: string) => {
  if (code !== DEV_TOTP_CODE) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid verification code');
  }

  const settings = await Settings.findOne({ userId });
  if (!settings) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Settings not found');
  }

  settings.twoFactorEnabled = false;
  settings.verified = false;
  await settings.save();
  return settings;
};

export default { enableTwoFactor, verifyTwoFactor, disableTwoFactor };
export { enableTwoFactor, verifyTwoFactor, disableTwoFactor };
