import express from 'express';
import auth from '../../middlewares/auth.ts';
import adminController from '../../controllers/admin.controller.ts';

const router = express.Router();

router.route('/analytics').get(auth('manageUsers'), adminController.getAnalytics);

export default router;
