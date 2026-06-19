import Joi from 'joi';
import { objectId } from './custom.validation.ts';

const memberIdParams = {
  params: Joi.object().keys({
    memberId: Joi.string().required().custom(objectId),
  }),
};

const voiceIdParams = {
  params: Joi.object().keys({
    memberId: Joi.string().required().custom(objectId),
    voiceId: Joi.string().required().custom(objectId),
  }),
};

const listVoices = memberIdParams;

const uploadVoice = {
  ...memberIdParams,
  body: Joi.object().keys({
    name: Joi.string().trim().max(120),
  }),
};

const getVoice = voiceIdParams;

const setDefaultVoice = voiceIdParams;

const deleteVoice = voiceIdParams;

export default {
  listVoices,
  uploadVoice,
  getVoice,
  setDefaultVoice,
  deleteVoice,
};

export { listVoices, uploadVoice, getVoice, setDefaultVoice, deleteVoice };
