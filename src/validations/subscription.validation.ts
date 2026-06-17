import Joi from 'joi';

const createSubscription = {
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      provider: Joi.string().valid('stripe', 'paypal', 'manual').optional(),
      status: Joi.string().valid('active', 'trial', 'inactive', 'past_due', 'canceled', 'unpaid').optional(),
      startedAt: Joi.date().optional(),
      endsAt: Joi.alternatives().try(Joi.date(), Joi.valid(null)).optional(),
      trialEndsAt: Joi.alternatives().try(Joi.date(), Joi.valid(null)).optional(),
      canceledAt: Joi.alternatives().try(Joi.date(), Joi.valid(null)).optional(),
      externalCustomerId: Joi.string().allow('').optional(),
      externalSubscriptionId: Joi.string().allow('').optional(),
      metadata: Joi.object().optional(),
    })
    .unknown(false),
};

const subscriptionIdParams = {
  params: Joi.object().keys({
    subscriptionId: Joi.string().required(),
  }),
};

const createCheckoutSession = {
  body: Joi.object()
    .keys({
      planId: Joi.string().optional(),
      priceId: Joi.string().optional(),
      successUrl: Joi.string().uri().required(),
      cancelUrl: Joi.string().uri().required(),
      customerEmail: Joi.string().email().optional(),
      customerName: Joi.string().allow('').optional(),
      name: Joi.string().allow('').optional(),
      quantity: Joi.number().integer().min(1).default(1),
      metadata: Joi.object().optional(),
    })
    .or('planId', 'priceId')
    .unknown(false),
};

const cancelSubscription = {
  params: Joi.object().keys({
    subscriptionId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      endsAt: Joi.alternatives().try(Joi.date(), Joi.valid(null)).optional(),
    })
    .unknown(false),
};

export default {
  createSubscription,
  createCheckoutSession,
  subscriptionIdParams,
  cancelSubscription,
};

export { createSubscription, createCheckoutSession, subscriptionIdParams, cancelSubscription };
