import admin from 'firebase-admin';
import config from './config';
import logger from './logger';

let firebaseApp: admin.app.App | null = null;

const initializeFirebaseApp = (): admin.app.App | null => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    logger.warn('Firebase configuration is incomplete. Firebase auth features will be unavailable.');
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    return firebaseApp;
  } catch (error) {
    logger.error('Firebase initialization failed:', error);
    return null;
  }
};

export default initializeFirebaseApp;
