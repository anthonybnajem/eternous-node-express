import httpStatus from 'http-status';
import type { DecodedIdToken } from 'firebase-admin/auth';
import initializeFirebaseApp from '../config/firebase.ts';
import ApiError from '../utils/ApiError.ts';
import User, { type AuthProvider, type UserDocument } from '../models/user.model.ts';

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
    return existingUser;
  }

  return User.create({
    ...userData,
    role: 'user',
    address: '',
  });
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

export { verifyIdToken, syncFirebaseUser, deleteFirebaseUser, mapFirebaseProvider, upsertFirebaseSeedUser };
