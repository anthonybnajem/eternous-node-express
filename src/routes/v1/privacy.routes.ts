import express from 'express';
import { privacyController } from '../../controllers/index.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Privacy
 *   description: Privacy policy management endpoints
 */

/**
 * @swagger
 * /v1/privacy:
 *   post:
 *     summary: Create privacy policy
 *     description: Only admins can create privacy policy content.
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Privacy policy content
 *               title:
 *                 type: string
 *                 description: Privacy policy title
 *               version:
 *                 type: string
 *                 description: Policy version number
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *   get:
 *     summary: Get privacy policy
 *     description: Anyone can retrieve privacy policy content.
 *     tags: [Privacy]
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                     title:
 *                       type: string
 *                     version:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.route('/').post(auth('admin'), privacyController.createPrivacy).get(privacyController.getPrivacy);

export default router;
