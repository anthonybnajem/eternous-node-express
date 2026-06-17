import express from 'express';
import { termsController } from '../../controllers/index.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Terms
 *   description: Terms and conditions management endpoints
 */

/**
 * @swagger
 * /v1/terms:
 *   post:
 *     summary: Create terms and conditions
 *     description: Only admins can create terms and conditions content.
 *     tags: [Terms]
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
 *                 description: Terms and conditions content
 *               title:
 *                 type: string
 *                 description: Terms and conditions title
 *               version:
 *                 type: string
 *                 description: Terms version number
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
 *     summary: Get terms and conditions
 *     description: Anyone can retrieve terms and conditions content.
 *     tags: [Terms]
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
router.route('/').post(auth('admin'), termsController.createTerms).get(termsController.getTerms);

export default router;
