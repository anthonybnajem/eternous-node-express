import express from 'express';
import auth from '../../middlewares/auth.ts';
import homeController from '../../controllers/home.controller.ts';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Home
 *   description: Home dashboard endpoints
 */

router.route('/').get(auth(), homeController.getHome);

export default router;
