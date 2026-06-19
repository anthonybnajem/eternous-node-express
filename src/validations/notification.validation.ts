import Joi from 'joi';
import { objectId } from './custom.validation.ts';

const listNotifications = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100),
    page: Joi.number().integer().min(1),
  }),
};

const notificationIdParams = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
};

export default {
  listNotifications,
  notificationIdParams,
};
