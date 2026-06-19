import Joi from 'joi';
import { objectId } from './custom.validation.ts';

const sendChat = {
  body: Joi.object().keys({
    memberId: Joi.string().required().custom(objectId),
    message: Joi.string().required().trim().min(1).max(2000),
    voiceId: Joi.string().custom(objectId),
    versionNumber: Joi.number().integer().min(1),
  }),
};

export default { sendChat };
