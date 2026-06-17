import mongoose from 'mongoose';
import config from '../src/config/config';
import logger from '../src/config/logger';
import User from '../src/models/user.model';
import { upsertFirebaseSeedUser } from '../src/services/firebaseAuth.service';

const toFirebasePhotoURL = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    return null;
  }
};

/**
 * Seed users
 */
const seedUsers = async () => {
  const users = [
    {
      _id: new mongoose.Types.ObjectId('6a2756f1288f0c27ab02af1a'),
      fullName: 'Admin User',
      email: 'admin@example.com',
      image: {
        url: '/uploads/users/user.png',
        path: 'null',
      },
      password: '$2a$08$nxTJsCIlURAumf9XXFn/MuFV1N52I572xFyEJo1aXncQVrIQPV2cO',
      role: 'admin',
      address: '',
      isEmailVerified: true,
      isPhoneNumberVerified: false,
      isResetPassword: false,
      isActive: true,
      isDeleted: false,
      isSuspended: false,
      oneTimeCode: null,
      phoneNumberOTP: null,
      nidStatus: 'unverified',
      authProvider: 'email',
      authProviderId: 'firebase_admin_uid',
      firebaseUid: 'firebase_admin_uid',
      subscriptions: [],
      lastLogin: new Date('2026-06-08T23:57:37.035Z'),
      __v: 0,
      createdAt: new Date('2026-06-08T23:57:37.035Z'),
      updatedAt: new Date('2026-06-08T23:57:37.035Z'),
    },
    {
      fullName: 'Firebase User',
      email: 'firebase.user@example.com',
      image: {
        url: '/uploads/users/user.png',
        path: 'null',
      },
      authProvider: 'firebase',
      authProviderId: 'firebase_uid_001',
      firebaseUid: 'firebase_uid_001',
      role: 'user',
      address: '',
      isEmailVerified: true,
      isPhoneNumberVerified: false,
      isResetPassword: false,
      isActive: true,
      isDeleted: false,
      isSuspended: false,
      oneTimeCode: null,
      phoneNumberOTP: null,
      nidStatus: 'unverified',
      subscriptions: [],
      lastLogin: new Date(),
    },
    {
      fullName: 'Google User',
      email: 'google.user@example.com',
      image: {
        url: '/uploads/users/user.png',
        path: 'null',
      },
      authProvider: 'google',
      authProviderId: 'google_sub_001',
      firebaseUid: 'google_sub_001',
      role: 'user',
      address: '',
      isEmailVerified: true,
      isPhoneNumberVerified: false,
      isResetPassword: false,
      isActive: true,
      isDeleted: false,
      isSuspended: false,
      oneTimeCode: null,
      phoneNumberOTP: null,
      nidStatus: 'unverified',
      subscriptions: [],
      lastLogin: new Date(),
    },
    {
      fullName: 'Facebook User',
      email: 'facebook.user@example.com',
      image: {
        url: '/uploads/users/user.png',
        path: 'null',
      },
      authProvider: 'facebook',
      authProviderId: 'facebook_id_001',
      firebaseUid: 'facebook_id_001',
      role: 'user',
      address: '',
      isEmailVerified: true,
      isPhoneNumberVerified: false,
      isResetPassword: false,
      isActive: true,
      isDeleted: false,
      isSuspended: false,
      oneTimeCode: null,
      phoneNumberOTP: null,
      nidStatus: 'unverified',
      subscriptions: [],
      lastLogin: new Date(),
    },
    {
      fullName: 'Apple User',
      email: 'apple.user@example.com',
      image: {
        url: '/uploads/users/user.png',
        path: 'null',
      },
      authProvider: 'apple',
      authProviderId: 'apple_sub_001',
      firebaseUid: 'apple_sub_001',
      role: 'user',
      address: '',
      isEmailVerified: true,
      isPhoneNumberVerified: false,
      isResetPassword: false,
      isActive: true,
      isDeleted: false,
      isSuspended: false,
      oneTimeCode: null,
      phoneNumberOTP: null,
      nidStatus: 'unverified',
      subscriptions: [],
      lastLogin: new Date(),
    },
  ];

  const firebaseSeedUsers = users.filter((user) => user.authProvider !== 'email');

  for (const firebaseUser of firebaseSeedUsers) {
    await upsertFirebaseSeedUser({
      uid: firebaseUser.firebaseUid,
      email: firebaseUser.email,
      fullName: firebaseUser.fullName,
      photoURL: toFirebasePhotoURL(firebaseUser.image?.url),
      emailVerified: firebaseUser.isEmailVerified,
    });
  }

  await User.insertMany(users);
  logger.info(`Seeded ${users.length} users`);
  return users;
};

/**
 * Main seed function
 */
const seed = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    await User.deleteMany({});
    logger.info('Cleared existing data');

    await seedUsers();

    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();
