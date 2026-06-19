import express from 'express';
import auth from '../../middlewares/auth.ts';
import archiveController from '../../controllers/archive.controller.ts';

const router = express.Router();

router.route('/storage').get(auth(), archiveController.getStorage);
router.route('/recent-sessions').get(auth(), archiveController.getRecentSessions);
router.route('/recordings').get(auth(), archiveController.listRecordings);
router.route('/recordings/:id/download').get(auth(), archiveController.downloadRecording);
router.route('/recordings/:id').get(auth(), archiveController.getRecording);

export default router;
