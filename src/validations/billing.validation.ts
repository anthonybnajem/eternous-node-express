import Joi from 'joi';

const getBillingHistory = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100),
    page: Joi.number().integer().min(1),
  }),
};

const paymentMethodId = {
  params: Joi.object().keys({
    id: Joi.string().required().trim().min(3),
  }),
};

export default {
  getBillingHistory,
  paymentMethodId,
};
