import express from 'express';
import authRoute from './auth.routes.ts';
import userRoute from './user.routes.ts';
import subscriptionRoute from './subscription.routes.ts';
import subscriptionPlanRoute from './subscription-plan.routes.ts';
import paymentRoute from './payment.routes.ts';
import notificationRoute from './notification.routes.ts';
import termsRoute from './terms.routes.ts';
import privacyRoute from './privacy.routes.ts';
import aboutRoute from './about.routes.ts';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/subscriptions/price-plans',
    route: subscriptionPlanRoute,
  },
  {
    path: '/subscriptions',
    route: subscriptionRoute,
  },
  {
    path: '/payments',
    route: paymentRoute,
  },
  {
    path: '/notifications',
    route: notificationRoute,
  },
  {
    path: '/static/terms',
    route: termsRoute,
  },
  {
    path: '/static/privacy',
    route: privacyRoute,
  },
  {
    path: '/static/about',
    route: aboutRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
