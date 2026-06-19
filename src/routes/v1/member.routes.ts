import express from 'express';
import auth from '../../middlewares/auth.ts';
import validate from '../../middlewares/validate.ts';
import memberController from '../../controllers/member.controller.ts';
import voiceController from '../../controllers/voice.controller.ts';
import { memberValidation, voiceValidation } from '../../validations/index.ts';
import memberFileUploadMiddleware from '../../middlewares/memberFileUpload.ts';

const router = express.Router();
const uploadMemberFiles = memberFileUploadMiddleware();
const memberMediaFields = uploadMemberFiles.fields([
  { name: 'image', maxCount: 1 },
  { name: 'voice', maxCount: 1 },
]);
const uploadVoiceFile = uploadMemberFiles.single('file');

/**
 * @swagger
 * tags:
 *   name: Members
 *   description: Tree member management
 */

router
  .route('/:memberId/voices/:voiceId/default')
  .patch(auth(), validate(voiceValidation.setDefaultVoice), voiceController.setDefaultVoice);

router
  .route('/:memberId/voices/:voiceId')
  .get(auth(), validate(voiceValidation.getVoice), voiceController.getVoice)
  .delete(auth(), validate(voiceValidation.deleteVoice), voiceController.deleteVoice);

router
  .route('/:memberId/voices')
  .get(auth(), validate(voiceValidation.listVoices), voiceController.listVoices)
  .post(auth(), uploadVoiceFile, validate(voiceValidation.uploadVoice), voiceController.uploadVoice);

router
  .route('/:memberId/favorite')
  .patch(auth(), validate(memberValidation.setFavorite), memberController.setFavorite);

router
  .route('/:memberId')
  .get(auth(), validate(memberValidation.getMember), memberController.getMember)
  .patch(auth(), memberMediaFields, validate(memberValidation.updateMember), memberController.updateMember)
  .delete(auth(), validate(memberValidation.deleteMember), memberController.deleteMember);

export default router;
