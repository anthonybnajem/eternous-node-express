import httpStatus from 'http-status';
import { CreditTransaction, User } from '../models/index.ts';
import type { CreditTransactionDocument, CreditTransactionType } from '../models/creditTransaction.model.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike } from '../types/common.ts';

export interface GrantCreditsInput {
  userId: ObjectIdLike;
  amount: number;
  type: CreditTransactionType;
  idempotencyKey?: string;
  description?: string;
  subscriptionId?: ObjectIdLike;
  subscriptionPlanId?: ObjectIdLike;
  invoiceId?: string;
  paymentIntentId?: string;
  metadata?: Record<string, unknown>;
}

const findByIdempotencyKey = async (idempotencyKey: string): Promise<CreditTransactionDocument | null> =>
  CreditTransaction.findOne({ idempotencyKey });

const grantCredits = async (input: GrantCreditsInput): Promise<CreditTransactionDocument | null> => {
  const {
    userId,
    amount,
    type,
    idempotencyKey,
    description = '',
    subscriptionId,
    subscriptionPlanId,
    invoiceId,
    paymentIntentId,
    metadata = {},
  } = input;

  if (amount <= 0) {
    return null;
  }

  if (idempotencyKey) {
    const existing = await CreditTransaction.findOne({ idempotencyKey });
    if (existing) {
      return existing;
    }
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const nextBalance = Math.max(0, (user.creditBalance ?? 0) + amount);
  user.creditBalance = nextBalance;
  await user.save();

  try {
    return await CreditTransaction.create({
      userId,
      amount,
      balanceAfter: nextBalance,
      type,
      status: 'completed',
      description,
      subscriptionId: subscriptionId ?? null,
      subscriptionPlanId: subscriptionPlanId ?? null,
      invoiceId,
      paymentIntentId,
      idempotencyKey,
      metadata,
    });
  } catch (error) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000 && idempotencyKey) {
      const existing = await CreditTransaction.findOne({ idempotencyKey });
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
};

export default {
  grantCredits,
  findByIdempotencyKey,
};

export { grantCredits, findByIdempotencyKey };
