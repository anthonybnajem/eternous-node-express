import express from 'express';
import auth from '../../middlewares/auth.ts';
import validate from '../../middlewares/validate.ts';
import { subscriptionPlanController } from '../../controllers/index.ts';
import { subscriptionPlanValidation } from '../../validations/index.ts';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscription Price Plans
 *   description: Manage subscription price plans
 */

/**
 * @swagger
 * /subscriptions/price-plans:
 *   get:
 *     summary: Get active subscription price plans
 *     tags: [Subscription Price Plans]
 *     responses:
 *       "200":
 *         description: OK
 */
router.get('/', subscriptionPlanController.getPricePlans);

/**
 * @swagger
 * /subscriptions/price-plans:
 *   post:
 *     summary: Create a subscription price plan
 *     tags: [Subscription Price Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "201":
 *         description: Created
 */
router.post('/', auth('manageUsers'), validate(subscriptionPlanValidation.createPricePlan), subscriptionPlanController.createPricePlan);

/**
 * @swagger
 * /subscriptions/price-plans/{planId}:
 *   patch:
 *     summary: Update a subscription price plan
 *     tags: [Subscription Price Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */
router.patch(
  '/:planId',
  auth('manageUsers'),
  validate(subscriptionPlanValidation.updatePricePlan),
  subscriptionPlanController.updatePricePlan
);

export default router;
