import express from 'express';
import * as paymentController from '../../controllers/payment.controller.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing with Stripe
 */

/**
 * @swagger
 * /payments/create-intent:
 *   post:
 *     summary: Create a payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       "201":
 *         description: Created
 */
router.route('/create-intent').post(auth(), paymentController.createPaymentIntent);

/**
 * @swagger
 * /payments/:paymentIntentId:
 *   get:
 *     summary: Get payment intent details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/:paymentIntentId').get(auth(), paymentController.getPaymentIntent);

/**
 * @swagger
 * /payments/:paymentIntentId/refund:
 *   post:
 *     summary: Create a refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/:paymentIntentId/refund').post(auth('manageOrders'), paymentController.createRefund);

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Handle Stripe webhook
 *     tags: [Payments]
 *     responses:
 *       "200":
 *         description: OK
 */
router.route('/webhook').post(express.raw({ type: 'application/json' }), paymentController.handleWebhook);

export default router;
