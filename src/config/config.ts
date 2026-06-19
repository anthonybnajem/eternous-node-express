import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Joi from 'joi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const normalizeFirebasePrivateKey = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().replace(/^"(.*)"$/, '$1');
  return trimmed.replace(/\\n/g, '\n');
};

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    REDIS_HOST: Joi.string().default('localhost').description('Redis host'),
    REDIS_PORT: Joi.number().default(6379).description('Redis port'),
    REDIS_PASSWORD: Joi.string().allow('').description('Redis password'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    CLIENT_URL: Joi.string().uri().allow('').description('Frontend application URL'),
    STRIPE_SECRET_KEY: Joi.string().description('Stripe secret key'),
    STRIPE_WEBHOOK_SECRET: Joi.string().description('Stripe webhook secret'),
    FIREBASE_PROJECT_ID: Joi.string().description('Firebase project ID'),
    FIREBASE_PRIVATE_KEY: Joi.string().description('Firebase private key'),
    FIREBASE_CLIENT_EMAIL: Joi.string().description('Firebase client email'),
    FIREBASE_WEB_API_KEY: Joi.string().description('Firebase web api key'),
    FIREBASE_WEB_AUTH_DOMAIN: Joi.string().description('Firebase web auth domain'),
    FIREBASE_WEB_PROJECT_ID: Joi.string().description('Firebase web project id'),
    FIREBASE_WEB_APP_ID: Joi.string().description('Firebase web app id'),
    FIREBASE_WEB_MESSAGING_SENDER_ID: Joi.string().description('Firebase web messaging sender id'),
    FIREBASE_WEB_MEASUREMENT_ID: Joi.string().description('Firebase web measurement id'),
    AWS_ACCESS_KEY_ID: Joi.string().description('AWS access key ID'),
    AWS_SECRET_ACCESS_KEY: Joi.string().description('AWS secret access key'),
    AWS_REGION: Joi.string().default('us-east-1').description('AWS region'),
    S3_BUCKET_NAME: Joi.string().description('S3 bucket name for file uploads'),
    LOG_REPORT_ENABLED: Joi.boolean().default(false).description('Enable/disable automatic log reports'),
    LOG_REPORT_FREQUENCY: Joi.string()
      .valid('daily', 'weekly', 'biweekly', 'monthly', 'every3days', 'every7days', 'hourly', 'every10min')
      .default('weekly')
      .description('Frequency of log reports'),
    LOG_REPORT_DAYS: Joi.number().default(7).description('Number of days to include in log report'),
    LOG_REPORT_RECIPIENTS: Joi.string().description('Comma-separated list of email recipients for log reports'),
    AUTH_RESEND_VERIFICATION_COOLDOWN_SECONDS: Joi.number()
      .default(60)
      .description('Cooldown before resending Firebase email verification'),
    LOG_REPORT_TIMEZONE: Joi.string().default('UTC').description('Timezone for scheduled reports'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  clientUrl: envVars.CLIENT_URL,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      // Modern MongoDB driver doesn't need these deprecated options
      // Mongoose 6+ handles connection management automatically
    },
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
  },
  firebase: {
    projectId: envVars.FIREBASE_PROJECT_ID,
    privateKey: normalizeFirebasePrivateKey(envVars.FIREBASE_PRIVATE_KEY),
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    web: {
      apiKey: envVars.FIREBASE_WEB_API_KEY,
      authDomain: envVars.FIREBASE_WEB_AUTH_DOMAIN,
      projectId: envVars.FIREBASE_WEB_PROJECT_ID,
      appId: envVars.FIREBASE_WEB_APP_ID,
      messagingSenderId: envVars.FIREBASE_WEB_MESSAGING_SENDER_ID,
      measurementId: envVars.FIREBASE_WEB_MEASUREMENT_ID,
    },
  },
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3BucketName: envVars.S3_BUCKET_NAME,
  },
  logReport: {
    enabled: envVars.LOG_REPORT_ENABLED,
    frequency: envVars.LOG_REPORT_FREQUENCY,
    days: envVars.LOG_REPORT_DAYS,
    recipients: envVars.LOG_REPORT_RECIPIENTS
      ? envVars.LOG_REPORT_RECIPIENTS.split(',').map((email: string) => email.trim())
      : [],
    timezone: envVars.LOG_REPORT_TIMEZONE,
  },
  auth: {
    resendVerificationCooldownSeconds: envVars.AUTH_RESEND_VERIFICATION_COOLDOWN_SECONDS,
  },
  name: 'Node.js Backend Boilerplate',
};

export default config;
