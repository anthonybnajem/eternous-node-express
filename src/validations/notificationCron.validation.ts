import Joi from 'joi';

const runNotificationCron = {
  body: Joi.object().keys({
    job: Joi.string()
      .valid(
        'birthday',
        'anniversary',
        'subscription-reminder',
        'credits-low',
        'payment-failed',
        'backup-ready'
      )
      .required(),
  }),
};

export default { runNotificationCron };
