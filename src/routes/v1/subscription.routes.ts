import express from 'express';
import auth from '../../middlewares/auth.ts';
import validate from '../../middlewares/validate.ts';
import { subscriptionController } from '../../controllers/index.ts';
import { subscriptionValidation } from '../../validations/index.ts';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management
 */

/**
 * @swagger
 * /subscriptions/me:
 *   get:
 *     summary: Get my subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.get('/me', auth(), subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create a subscription snapshot for the current user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               provider:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       "201":
 *         description: Created
 */
router.post('/', auth(), validate(subscriptionValidation.createSubscription), subscriptionController.createSubscription);

/**
 * @swagger
 * /subscriptions/checkout-session:
 *   post:
 *     summary: Create a Stripe subscription checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - successUrl
 *               - cancelUrl
 *             properties:
 *               planId:
 *                 type: string
 *               priceId:
 *                 type: string
 *               successUrl:
 *                 type: string
 *               cancelUrl:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               customerName:
 *                 type: string
 *               name:
 *                 type: string
 *               quantity:
 *                 type: number
 *               metadata:
 *                 type: object
 *     responses:
 *       "201":
 *         description: Created
 */
router.post(
  '/checkout-session',
  auth(),
  validate(subscriptionValidation.createCheckoutSession),
  subscriptionController.createCheckoutSession
);

/**
 * @swagger
 * /subscriptions/upgrade:
 *   post:
 *     summary: Upgrade the current user's subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.post(
  '/upgrade',
  auth(),
  validate(subscriptionValidation.upgradeSubscription),
  subscriptionController.upgradeSubscription
);

/**
 * @swagger
 * /subscriptions/{subscriptionId}:
 *   get:
 *     summary: Get a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */
router.get(
  '/:subscriptionId',
  auth(),
  validate(subscriptionValidation.subscriptionIdParams),
  subscriptionController.getSubscription
);

/**
 * @swagger
 * /subscriptions/{subscriptionId}/cancel:
 *   patch:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */
router.patch(
  '/:subscriptionId/cancel',
  auth(),
  validate(subscriptionValidation.cancelSubscription),
  subscriptionController.cancelSubscription
);

/**
 * @swagger
 * /subscriptions/{subscriptionId}/activate:
 *   patch:
 *     summary: Activate a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */
router.patch(
  '/:subscriptionId/activate',
  auth('manageUsers'),
  validate(subscriptionValidation.subscriptionIdParams),
  subscriptionController.activateSubscription
);

export default router;
