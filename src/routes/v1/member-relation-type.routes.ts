import express from 'express';
import memberRelationTypeController from '../../controllers/memberRelationType.controller.ts';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: MemberRelationTypes
 *   description: Family relation type lookup
 */

router.route('/').get(memberRelationTypeController.listRelationTypes);

export default router;
