import express from 'express';
import auth from '../../middlewares/auth.ts';
import validate from '../../middlewares/validate.ts';
import treeController from '../../controllers/tree.controller.ts';
import memberController from '../../controllers/member.controller.ts';
import { treeValidation, memberValidation } from '../../validations/index.ts';
import userFileUploadMiddleware from '../../middlewares/fileUpload.ts';
import memberFileUploadMiddleware from '../../middlewares/memberFileUpload.ts';
import { UPLOADS_FOLDER_TREES } from '../../utils/treeUpload.ts';

const router = express.Router();
const uploadTrees = userFileUploadMiddleware(UPLOADS_FOLDER_TREES);
const uploadMemberFiles = memberFileUploadMiddleware();
const memberMediaFields = uploadMemberFiles.fields([
  { name: 'image', maxCount: 1 },
  { name: 'voice', maxCount: 1 },
]);
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
  .route('/:treeId/share')
  .post(auth(), validate(treeValidation.shareTree), treeController.shareTree);

router
  .route('/:treeId/default')
  .patch(auth(), validate(treeValidation.setDefaultTree), treeController.setDefaultTree);

router
  .route('/:treeId/duplicate')
  .post(auth(), validate(treeValidation.duplicateTree), treeController.duplicateTree);

router
  .route('/:treeId/members')
  .get(auth(), validate(memberValidation.listMembersByTree), memberController.listMembersByTree)
  .post(auth(), memberMediaFields, validate(memberValidation.createMember), memberController.createMember);

router
  .route('/:treeId')
  .get(auth(), validate(treeValidation.getTree), treeController.getTree)
  .patch(auth(), treeImageFields, validate(treeValidation.updateTree), treeController.updateTree)
  .delete(auth(), validate(treeValidation.deleteTree), treeController.deleteTree);

export default router;
