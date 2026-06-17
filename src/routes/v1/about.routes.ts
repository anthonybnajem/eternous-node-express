import express from 'express';
import { aboutController } from '../../controllers/index.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: About
 *   description: About page management endpoints
 */

/**
 * @swagger
 * /v1/about:
 *   post:
 *     summary: Create about content
 *     description: Only admins can create about page content.
 *     tags: [About]
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
 *                 description: About page content
 *               title:
 *                 type: string
 *                 description: About page title
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
 *     summary: Get about content
 *     description: Anyone can retrieve about page content.
 *     tags: [About]
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
 *                   type: array
 *                   items:
 *                     type: object
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.route('/').post(auth('admin'), aboutController.createAbout).get(aboutController.getAbouts);

export default router;
