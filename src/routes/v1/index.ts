import express from 'express';
import authRoute from './auth.routes';
import userRoute from './user.routes';
import subscriptionRoute from './subscription.routes';
import subscriptionPlanRoute from './subscription-plan.routes';
import paymentRoute from './payment.routes';
import notificationRoute from './notification.routes';
import termsRoute from './terms.routes';
import privacyRoute from './privacy.routes';
import aboutRoute from './about.routes';

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
