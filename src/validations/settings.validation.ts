import Joi from 'joi';

const updateSettings = {
  body: Joi.object()
    .keys({
      applicationLock: Joi.boolean(),
      newMessagesLock: Joi.boolean(),
      billingEmail: Joi.string().email().allow(''),
    })
    .min(1),
};

const updateNotificationSettings = {
  body: Joi.object()
    .keys({
      notificationsEnabled: Joi.boolean(),
      birthdayNotificationsEnabled: Joi.boolean(),
      paymentNotificationsEnabled: Joi.boolean(),
    })
    .min(1),
};

export default {
  updateSettings,
  updateNotificationSettings,
};
