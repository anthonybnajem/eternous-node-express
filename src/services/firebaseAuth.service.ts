import httpStatus from 'http-status';
import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import initializeFirebaseApp from '../config/firebase.ts';
import config from '../config/config.ts';
import ApiError from '../utils/ApiError.ts';
import User, { type AuthProvider, type UserDocument } from '../models/user.model.ts';
import { ensureDefaultSettings } from './settings.service.ts';
import emailService from './email.service.ts';
import logger from '../config/logger.ts';

const mapFirebaseProvider = (provider?: string): AuthProvider => {
  switch (provider) {
    case 'password':
      return 'email';
    case 'google.com':
      return 'google';
    case 'facebook.com':
      return 'facebook';
    case 'apple.com':
      return 'apple';
    default:
      return 'firebase';
  }
};

const getFirebaseApp = () => {
  const app = initializeFirebaseApp();
  if (!app) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Firebase auth is not configured');
  }
  return app;
};

const getFirebaseAuth = () => getFirebaseApp().auth();

const isFirebaseConfigured = (): boolean => {
  try {
    return Boolean(getFirebaseApp());
  } catch {
    return false;
  }
};

const getFirebaseUserByEmail = async (email: string): Promise<UserRecord | null> => {
  try {
    return await getFirebaseAuth().getUserByEmail(email.toLowerCase());
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
    if (errorCode === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
};

const createFirebaseEmailUser = async ({
  email,
  password,
  displayName,
  emailVerified = false,
}: {
  email: string;
  password: string;
  displayName?: string;
  emailVerified?: boolean;
}): Promise<UserRecord> => {
  const normalizedEmail = email.toLowerCase();
  const auth = getFirebaseAuth();
  const existing = await getFirebaseUserByEmail(normalizedEmail);

  if (existing) {
    await auth.updateUser(existing.uid, {
      password,
      displayName: displayName || existing.displayName || '',
      emailVerified: emailVerified || existing.emailVerified,
    });
    return auth.getUser(existing.uid);
  }

  return auth.createUser({
    email: normalizedEmail,
    password,
    displayName: displayName || '',
    emailVerified,
  });
};

const generateEmailVerificationLink = async (email: string): Promise<string> => {
  const continueUrl = config.clientUrl || 'http://localhost:3000';
  return getFirebaseAuth().generateEmailVerificationLink(email.toLowerCase(), {
    url: continueUrl,
    handleCodeInApp: true,
  });
};

const sendFirebaseEmailVerification = async (email: string): Promise<void> => {
  const link = await generateEmailVerificationLink(email);
  await emailService.sendFirebaseEmailVerificationLink(email, link);
};

const assertFirebaseEmailVerified = (decoded: DecodedIdToken): void => {
  const provider = decoded.firebase?.sign_in_provider;
  if (provider === 'password' && !decoded.email_verified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email not verified');
  }
};

const updateFirebasePassword = async (uid: string, password: string): Promise<void> => {
  await getFirebaseAuth().updateUser(uid, { password });
};

const syncFirebasePasswordForUser = async (
  user: UserDocument,
  password: string,
  displayName?: string
): Promise<UserDocument> => {
  if (!isFirebaseConfigured()) {
    return user;
  }

  if (user.firebaseUid) {
    await updateFirebasePassword(user.firebaseUid, password);
    return user;
  }

  const firebaseUser = await getFirebaseUserByEmail(user.email);
  if (firebaseUser) {
    await updateFirebasePassword(firebaseUser.uid, password);
    user.firebaseUid = firebaseUser.uid;
    await user.save();
    return user;
  }

  const created = await createFirebaseEmailUser({
    email: user.email,
    password,
    displayName: displayName ?? user.fullName,
    emailVerified: user.isEmailVerified ?? false,
  });
  user.firebaseUid = created.uid;
  user.authProvider = user.authProvider ?? 'email';
  await user.save();
  return user;
};

const verifyIdToken = async (idToken: string): Promise<DecodedIdToken> => {
  const app = getFirebaseApp();
  return app.auth().verifyIdToken(idToken);
};

const syncFirebaseUser = async (
  decoded: DecodedIdToken,
  options: { updateLastLogin?: boolean } = {}
): Promise<UserDocument> => {
  if (!decoded.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Firebase token does not contain an email address');
  }

  const email = decoded.email.toLowerCase();
  const authProvider = mapFirebaseProvider(decoded.firebase?.sign_in_provider);
  const now = new Date();
  const shouldTouchLastLogin = options.updateLastLogin ?? false;

  const existingUser = await User.findOne({
    $or: [{ firebaseUid: decoded.uid }, { email }],
  });

  const userData = {
    fullName: decoded.name || existingUser?.fullName || '',
    email,
    image: decoded.picture
      ? {
          url: decoded.picture,
          path: 'null',
        }
      : existingUser?.image,
    firebaseUid: decoded.uid,
    authProvider,
    authProviderId: decoded.uid,
    isEmailVerified: decoded.email_verified ?? existingUser?.isEmailVerified ?? false,
    isActive: true,
    isDeleted: false,
    isSuspended: false,
  };

  if (shouldTouchLastLogin) {
    Object.assign(userData, { lastLogin: now });
  }

  if (existingUser) {
    Object.assign(existingUser, userData);
    await existingUser.save();
    await ensureDefaultSettings(existingUser.id, existingUser.email);
    return existingUser;
  }

  const user = await User.create({
    ...userData,
    role: 'user',
    address: '',
  });
  await ensureDefaultSettings(user.id, user.email);
  return user;
};

const deleteFirebaseUser = async (uid: string): Promise<void> => {
  const app = getFirebaseApp();
  await app.auth().deleteUser(uid);
};

type FirebaseSeedUser = {
  uid: string;
  email: string;
  fullName?: string;
  photoURL?: string | null;
  emailVerified?: boolean;
  password?: string;
};

const upsertFirebaseSeedUser = async (user: FirebaseSeedUser): Promise<void> => {
  const app = getFirebaseApp();
  const auth = app.auth();
  const firebaseUserData = {
    email: user.email,
    displayName: user.fullName || '',
    emailVerified: user.emailVerified ?? true,
    password: user.password,
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
  };

  try {
    await auth.getUser(user.uid);
    await auth.updateUser(user.uid, firebaseUserData);
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';

    if (errorCode !== 'auth/user-not-found') {
      throw error;
    }

    await auth.createUser({
      uid: user.uid,
      ...firebaseUserData,
    });
  }
};

export {
  verifyIdToken,
  syncFirebaseUser,
  deleteFirebaseUser,
  mapFirebaseProvider,
  upsertFirebaseSeedUser,
  isFirebaseConfigured,
  getFirebaseUserByEmail,
  createFirebaseEmailUser,
  updateFirebasePassword,
  syncFirebasePasswordForUser,
  generateEmailVerificationLink,
  sendFirebaseEmailVerification,
  assertFirebaseEmailVerified,
  getFirebaseAuth,
};
