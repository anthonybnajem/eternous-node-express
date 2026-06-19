import express from 'express';
import auth from '../../middlewares/auth.ts';
import validate from '../../middlewares/validate.ts';
import chatController from '../../controllers/chat.controller.ts';
import { chatValidation } from '../../validations/index.ts';

const router = express.Router();

router.route('/').post(auth(), validate(chatValidation.sendChat), chatController.sendChat);

export default router;
