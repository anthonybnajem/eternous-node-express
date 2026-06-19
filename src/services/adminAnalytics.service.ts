import { Payment, Subscription, User } from '../models/index.ts';

const getDashboardAnalytics = async () => {
  const [userCount, activeSubscriptions, succeededPayments] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Subscription.countDocuments({ status: { $in: ['active', 'trial'] } }),
    Payment.find({ status: 'succeeded' }),
  ]);

  const revenueMTD = succeededPayments.reduce((total, payment) => total + payment.amount, 0);

  return {
    userCount,
    activeSubscriptions,
    revenueMTD,
    paymentCount: succeededPayments.length,
  };
};

export default { getDashboardAnalytics };
export { getDashboardAnalytics };
