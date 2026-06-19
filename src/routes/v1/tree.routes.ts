import express from 'express';
import auth from '../../middlewares/auth.ts';
import validate from '../../middlewares/validate.ts';
import treeController from '../../controllers/tree.controller.ts';
import { treeValidation } from '../../validations/index.ts';
import userFileUploadMiddleware from '../../middlewares/fileUpload.ts';
import { UPLOADS_FOLDER_TREES } from '../../utils/treeUpload.ts';

const router = express.Router();
const uploadTrees = userFileUploadMiddleware(UPLOADS_FOLDER_TREES);
const treeImageFields = uploadTrees.fields([
  { name: 'image', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]);

/**
 * @swagger
 * tags:
 *   name: Trees
 *   description: Family tree management endpoints
 */

router
  .route('/')
  .get(auth(), validate(treeValidation.listTrees), treeController.listTrees)
  .post(auth(), treeImageFields, validate(treeValidation.createTree), treeController.createTree);

router
  .route('/:treeId/default')
  .patch(auth(), validate(treeValidation.setDefaultTree), treeController.setDefaultTree);

router
  .route('/:treeId/duplicate')
  .post(auth(), validate(treeValidation.duplicateTree), treeController.duplicateTree);

router
  .route('/:treeId')
  .get(auth(), validate(treeValidation.getTree), treeController.getTree)
  .patch(auth(), treeImageFields, validate(treeValidation.updateTree), treeController.updateTree)
  .delete(auth(), validate(treeValidation.deleteTree), treeController.deleteTree);

export default router;
