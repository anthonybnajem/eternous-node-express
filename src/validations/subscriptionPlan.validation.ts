import Joi from 'joi';

const createPricePlan = {
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      slug: Joi.string().optional(),
      description: Joi.string().allow('').optional(),
      priceId: Joi.string().optional(),
      currency: Joi.string().default('usd'),
      price: Joi.number().min(0).optional(),
      amount: Joi.number().min(0).optional(),
      credits: Joi.number().integer().min(0).default(0),
      planType: Joi.string().valid('monthly', 'yearly', 'preservation').default('monthly'),
      interval: Joi.string().valid('day', 'week', 'month', 'year', 'one_time').optional(),
      trialDays: Joi.number().integer().min(0).default(0),
      features: Joi.array().items(Joi.string()).default([]),
      active: Joi.boolean().default(true),
      sortOrder: Joi.number().integer().default(0),
      metadata: Joi.object().optional(),
    })
    .unknown(false),
};

const updatePricePlan = {
  params: Joi.object().keys({
    planId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().optional(),
      slug: Joi.string().optional(),
      description: Joi.string().allow('').optional(),
      priceId: Joi.string().optional(),
      currency: Joi.string().optional(),
      price: Joi.number().min(0).optional(),
      amount: Joi.number().min(0).optional(),
      credits: Joi.number().integer().min(0).optional(),
      planType: Joi.string().valid('monthly', 'yearly', 'preservation').optional(),
      interval: Joi.string().valid('day', 'week', 'month', 'year', 'one_time').optional(),
      trialDays: Joi.number().integer().min(0).optional(),
      features: Joi.array().items(Joi.string()).optional(),
      active: Joi.boolean().optional(),
      sortOrder: Joi.number().integer().optional(),
      metadata: Joi.object().optional(),
    })
    .unknown(false),
};

export default {
  createPricePlan,
  updatePricePlan,
};

export { createPricePlan, updatePricePlan };
