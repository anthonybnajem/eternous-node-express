import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import config from './config/config';
import { successHandler, errorHandler } from './config/morgan';
import { jwtStrategy } from './config/passport';
import authLimiter from './middlewares/rateLimiter';
import routes from './routes/v1/index';
import { errorConverter, errorHandler as errorHandlerMiddleware } from './middlewares/error';
import ApiError from './utils/ApiError';
import { setupSwagger } from './config/swagger';
import { metricsMiddleware, register } from './config/metrics';

const app = express();

// Logging middleware
if (config.env !== 'test') {
  app.use(successHandler);
  app.use(errorHandler);
}

// Metrics middleware
app.use(metricsMiddleware);

// Static files
app.use(express.static('public'));

app.get('/firebase-config', (_req: Request, res: Response): void => {
  const firebaseWebConfig = {
    apiKey: config.firebase.web.apiKey,
    authDomain: config.firebase.web.authDomain,
    projectId: config.firebase.web.projectId,
    appId: config.firebase.web.appId,
    messagingSenderId: config.firebase.web.messagingSenderId,
    measurementId: config.firebase.web.measurementId,
  };

  res.type('application/javascript').send(`window.FIREBASE_WEB_CONFIG = ${JSON.stringify(firebaseWebConfig)};`);
});

// Set security HTTP headers
app.use(helmet());

// Parse json request body


// Stripe webhook must receive raw body before JSON parser
app.use(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' })
);

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Sanitize request data
app.use(xss());
app.use(mongoSanitize());

// Gzip compression
app.use(compression());

// Enable cors
app.use(cors());
app.options('*', cors());

// Legacy Passport JWT auth remains available alongside Firebase auth.
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// Limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/api/v1/auth', authLimiter);
}

// Setup Swagger documentation
setupSwagger(app);

// Prometheus metrics endpoint
app.get('/metrics', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// API v1 routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.json({
    message: 'Node Backend Template API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    metrics: '/metrics',
  });
});

// Send back a 404 error for any unknown api request
app.use((_req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Route not found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandlerMiddleware);

export default app;
