import express from 'express';
import validate from '../../middlewares/validate.ts';
import { authValidation } from '../../validations/index.ts';
import { authController } from '../../controllers/index.ts';
import auth from '../../middlewares/auth.ts';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and authorization endpoints
 */

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Register or sync a user
 *     description: Supports Firebase ID tokens and legacy email/password signup. Both sync the MongoDB profile.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Firebase ID token from the client SDK
 *               fullName:
 *                 type: string
 *                 description: Optional fallback full name
 *     responses:
 *       "201":
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 tokens:
 *                   type: object
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/register', validate(authValidation.register), authController.register);

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Login with Firebase or email/password
 *     description: Supports Firebase ID tokens and legacy email/password login. Both return the same response shape.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Firebase ID token from the client SDK
 *     responses:
 *       "200":
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 tokens:
 *                   type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/login', validate(authValidation.login), authController.login);

/**
 * @swagger
 * /v1/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     description: Verify user's email address with verification token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       "200":
 *         description: Email verified successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/verify-email', validate(authValidation.verifyEmail), authController.verifyEmail);

/**
 * @swagger
 * /v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset user password using reset token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password
 *     responses:
 *       "200":
 *         description: Password reset successful
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);

/**
 * @swagger
 * /v1/auth/change-password:
 *   post:
 *     summary: Change password
 *     description: Legacy password flow is still available for email/password users.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password
 *     responses:
 *       "200":
 *         description: Password changed successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/change-password', auth(), validate(authValidation.changePassword), authController.changePassword);

/**
 * @swagger
 * /v1/auth/forgot-password:
 *   post:
 *     summary: Forgot password
 *     description: Legacy password reset flow is still available for email/password users.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       "200":
 *         description: Password reset email sent
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Revoke the current refresh token session and record a logout activity.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token for the device session to revoke
 *     responses:
 *       "200":
 *         description: Logout successful
 */
router.post('/logout', validate(authValidation.logout), authController.logout);

/**
 * @swagger
 * /v1/auth/refresh-tokens:
 *   post:
 *     summary: Refresh auth tokens
 *     description: Rotate the refresh token and return a new access/refresh pair.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       "200":
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access:
 *                   type: object
 *                 refresh:
 *                   type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);

/**
 * @swagger
 * /v1/auth/send-verification-email:
 *   post:
 *     summary: Send verification email
 *     description: Legacy verification email flow remains available.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Verification email sent
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/send-verification-email', auth(), authController.sendVerificationEmail);

/**
 * @swagger
 * /v1/auth/delete-me:
 *   post:
 *     summary: Delete own account
 *     description: Delete either the Firebase account or the legacy Mongo profile and mark it deleted.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password for confirmation
 *     responses:
 *       "200":
 *         description: Account deleted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/delete-me', auth(), validate(authValidation.deleteMe), authController.deleteMe);

export default router;
