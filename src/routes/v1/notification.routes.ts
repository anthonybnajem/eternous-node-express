import express from 'express';
import * as notificationController from '../../controllers/notification.controller.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Email and push notifications
 */

/**
 * @swagger
 * /notifications/email:
 *   post:
 *     summary: Send an email
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - text
 *             properties:
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *               text:
 *                 type: string
 *               html:
 *                 type: string
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/email').post(auth('manageUsers'), notificationController.sendEmail);

/**
 * @swagger
 * /notifications/push:
 *   post:
 *     summary: Send a push notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - title
 *               - body
 *             properties:
 *               token:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/push').post(auth('manageUsers'), notificationController.sendPushNotification);

/**
 * @swagger
 * /notifications/push/multicast:
 *   post:
 *     summary: Send push notification to multiple devices
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/push/multicast').post(auth('manageUsers'), notificationController.sendMulticastNotification);

/**
 * @swagger
 * /notifications/push/topic:
 *   post:
 *     summary: Send push notification to a topic
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/push/topic').post(auth('manageUsers'), notificationController.sendTopicNotification);

/**
 * @swagger
 * /notifications/topic/subscribe:
 *   post:
 *     summary: Subscribe to a topic
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/topic/subscribe').post(auth(), notificationController.subscribeToTopic);

/**
 * @swagger
 * /notifications/topic/unsubscribe:
 *   post:
 *     summary: Unsubscribe from a topic
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/topic/unsubscribe').post(auth(), notificationController.unsubscribeFromTopic);

export default router;
