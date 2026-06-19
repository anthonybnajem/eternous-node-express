import express from 'express';
import auth from '../../middlewares/auth.ts';
import validate from '../../middlewares/validate.ts';
import { billingController } from '../../controllers/index.ts';
import { billingValidation } from '../../validations/index.ts';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Billing overview, payment methods, and history
 */

router.route('/overview').get(auth(), billingController.getBillingOverview);
router.route('/payment-methods').get(auth(), billingController.listPaymentMethods);
router.route('/payment-methods').post(auth(), billingController.createPaymentMethodSetup);
router
  .route('/payment-methods/:id/default')
  .patch(auth(), validate(billingValidation.paymentMethodId), billingController.setDefaultPaymentMethod);
router
  .route('/payment-methods/:id')
  .delete(auth(), validate(billingValidation.paymentMethodId), billingController.removePaymentMethod);
router
  .route('/history')
  .get(auth(), validate(billingValidation.getBillingHistory), billingController.getBillingHistory);

export default router;
