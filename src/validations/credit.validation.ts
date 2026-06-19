import Joi from 'joi';
import { objectId } from './custom.validation.ts';

const getCreditHistory = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100),
    page: Joi.number().integer().min(1),
  }),
};

const adjustCredits = {
  params: Joi.object().keys({
    userId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    amount: Joi.number().required().invalid(0),
    reason: Joi.string().required().trim().min(1).max(500),
  }),
};

export default {
  getCreditHistory,
  adjustCredits,
};
