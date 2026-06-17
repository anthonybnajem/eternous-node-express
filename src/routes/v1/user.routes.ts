import express from 'express';
import auth from '../../middlewares/auth.js';
import userController from '../../controllers/user.controller.js';
import userFileUploadMiddleware from '../../middlewares/fileUpload.js';
import convertHeicToPngMiddleware from '../../middlewares/converter.js';

const UPLOADS_FOLDER_USERS = './public/uploads/users';
const uploadUsers = userFileUploadMiddleware(UPLOADS_FOLDER_USERS);

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval endpoints
 */

/**
 * @swagger
 * /v1/users/interest:
 *   get:
 *     summary: Get interest list
 *     description: Retrieve list of user interests.
 *     tags: [Users]
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
 */
router.route('/interest').get(userController.interestList);

/**
 * @swagger
 * /v1/users/verifyNid:
 *   post:
 *     summary: Verify NID
 *     description: Submit NID verification request.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nidNumber
 *             properties:
 *               nidNumber:
 *                 type: string
 *                 description: National ID number
 *               nidImage:
 *                 type: string
 *                 description: NID image URL
 *     responses:
 *       "200":
 *         description: NID verification submitted
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.route('/verifyNid').post(auth('common'), userController.verifyNid);

/**
 * @swagger
 * /v1/users/nidVerifyApproval:
 *   post:
 *     summary: Approve NID verification
 *     description: Approve user's NID verification request.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of user to approve
 *     responses:
 *       "200":
 *         description: NID verification approved
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
router.route('/nidVerifyApproval').post(auth('common'), userController.nidVerifyApproval);

/**
 * @swagger
 * /v1/users/nidVerifyReject:
 *   post:
 *     summary: Reject NID verification
 *     description: Reject user's NID verification request.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - reason
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of user to reject
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       "200":
 *         description: NID verification rejected
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
router.route('/nidVerifyReject').post(auth('common'), userController.nidVerifyReject);

/**
 * @swagger
 * /v1/users/nidVerifySubmitList:
 *   get:
 *     summary: Get NID verification submissions
 *     description: Retrieve list of NID verification submissions.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
router.route('/nidVerifySubmitList').get(auth('common'), userController.nidVerifySubmitList);

/**
 * @swagger
 * /v1/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users with pagination.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of users per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field (e.g., name:asc, email:desc)
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalResults:
 *                   type: integer
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
router.route('/').get(auth('common'), userController.getUsers);

/**
 * @swagger
 * /v1/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update user
 *     description: Update user information including profile image.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image (HEIC files will be converted to PNG)
 *     responses:
 *       "200":
 *         description: User updated successfully
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
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router
  .route('/:userId')
  .get(auth('common'), userController.getUser)
  .patch(
    auth('common'),
    [uploadUsers.single('image')],
    convertHeicToPngMiddleware(UPLOADS_FOLDER_USERS),
    userController.updateUser
  );

export default router;
