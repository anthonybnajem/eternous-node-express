import admin from 'firebase-admin';
import initializeFirebaseApp from '../../config/firebase.js';
import logger from '../../config/logger.js';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const getFirebaseApp = (): admin.app.App | null => initializeFirebaseApp();

const sendPushNotification = async (token: string, { title, body, data = {} }: PushNotificationPayload) => {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    logger.warn('Firebase not initialized. Push notification skipped.');
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const message: admin.messaging.Message = {
      notification: { title, body },
      data,
      token,
    };

    const response = await firebaseApp.messaging().send(message);
    logger.info('Push notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('Error sending push notification:', error);
    throw error;
  }
};

const sendMulticastNotification = async (tokens: string[], { title, body, data = {} }: PushNotificationPayload) => {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    logger.warn('Firebase not initialized. Multicast notification skipped.');
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      data,
      tokens,
    };

    const response = await firebaseApp.messaging().sendEachForMulticast(message);
    logger.info(`Multicast notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    logger.error('Error sending multicast notification:', error);
    throw error;
  }
};

const sendTopicNotification = async (topic: string, { title, body, data = {} }: PushNotificationPayload) => {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    logger.warn('Firebase not initialized. Topic notification skipped.');
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const message: admin.messaging.Message = {
      notification: { title, body },
      data,
      topic,
    };

    const response = await firebaseApp.messaging().send(message);
    logger.info('Topic notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('Error sending topic notification:', error);
    throw error;
  }
};

const subscribeToTopic = async (tokens: string[], topic: string) => {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    logger.warn('Firebase not initialized. Topic subscription skipped.');
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const response = await firebaseApp.messaging().subscribeToTopic(tokens, topic);
    logger.info(`Subscribed to topic ${topic}:`, response);
    return { success: true, response };
  } catch (error) {
    logger.error('Error subscribing to topic:', error);
    throw error;
  }
};

const unsubscribeFromTopic = async (tokens: string[], topic: string) => {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    logger.warn('Firebase not initialized. Topic unsubscription skipped.');
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const response = await firebaseApp.messaging().unsubscribeFromTopic(tokens, topic);
    logger.info(`Unsubscribed from topic ${topic}:`, response);
    return { success: true, response };
  } catch (error) {
    logger.error('Error unsubscribing from topic:', error);
    throw error;
  }
};

export {
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
};
