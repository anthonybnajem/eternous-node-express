import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { CreditTransaction, User } from '../models/index.ts';
import type { CreditTransactionDocument, CreditTransactionType } from '../models/creditTransaction.model.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike, PaginationOptions, PaginatedResult } from '../types/common.ts';

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
  createdBy?: ObjectIdLike;
  metadata?: Record<string, unknown>;
}

export interface DeductCreditsInput {
  userId: ObjectIdLike;
  amount: number;
  type: CreditTransactionType;
  description?: string;
  memberId?: ObjectIdLike;
  voiceId?: ObjectIdLike;
  voiceGenerationId?: ObjectIdLike;
  createdBy?: ObjectIdLike;
  metadata?: Record<string, unknown>;
}

export interface AdjustCreditsInput {
  userId: ObjectIdLike;
  amount: number;
  reason: string;
  createdBy: ObjectIdLike;
}

const RECENT_TRANSACTION_LIMIT = 5;

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
    createdBy,
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
      createdBy: createdBy ?? null,
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

const deductCredits = async (input: DeductCreditsInput): Promise<CreditTransactionDocument> => {
  const {
    userId,
    amount,
    type,
    description = '',
    memberId,
    voiceId,
    voiceGenerationId,
    createdBy,
    metadata = {},
  } = input;

  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Deduction amount must be positive');
  }

  const session = await mongoose.startSession();

  try {
    let transaction: CreditTransactionDocument | null = null;

    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      const currentBalance = user.creditBalance ?? 0;
      if (currentBalance < amount) {
        throw new ApiError(httpStatus.PAYMENT_REQUIRED, 'Insufficient credits');
      }

      const nextBalance = currentBalance - amount;
      user.creditBalance = nextBalance;
      await user.save({ session });

      const [created] = await CreditTransaction.create(
        [
          {
            userId,
            amount: -amount,
            balanceAfter: nextBalance,
            type,
            status: 'completed',
            description,
            memberId: memberId ?? null,
            voiceId: voiceId ?? null,
            voiceGenerationId: voiceGenerationId ?? null,
            createdBy: createdBy ?? null,
            metadata,
          },
        ],
        { session }
      );

      transaction = created;
    });

    if (!transaction) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to deduct credits');
    }

    return transaction;
  } finally {
    await session.endSession();
  }
};

const getBalance = async (
  userId: ObjectIdLike
): Promise<{ balance: number; recentTransactions: CreditTransactionDocument[] }> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const recentTransactions = await CreditTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(RECENT_TRANSACTION_LIMIT);

  return {
    balance: user.creditBalance ?? 0,
    recentTransactions,
  };
};

const getHistory = async (
  userId: ObjectIdLike,
  options: PaginationOptions
): Promise<PaginatedResult<CreditTransactionDocument>> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return CreditTransaction.paginate(
    { userId },
    {
      ...options,
      sortBy: options.sortBy ?? 'createdAt:desc',
    }
  );
};

const adjustCredits = async (
  input: AdjustCreditsInput
): Promise<{ balance: number; transaction: CreditTransactionDocument }> => {
  const { userId, amount, reason, createdBy } = input;

  if (amount === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Adjustment amount cannot be zero');
  }

  const transaction =
    amount > 0
      ? await grantCredits({
          userId,
          amount,
          type: 'admin_adjustment',
          description: reason,
          createdBy,
          metadata: { adjustedBy: String(createdBy) },
        })
      : await deductCredits({
          userId,
          amount: Math.abs(amount),
          type: 'admin_adjustment',
          description: reason,
          createdBy,
          metadata: { adjustedBy: String(createdBy) },
        });

  if (!transaction) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to adjust credits');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return {
    balance: user.creditBalance ?? 0,
    transaction,
  };
};

export default {
  grantCredits,
  deductCredits,
  findByIdempotencyKey,
  getBalance,
  getHistory,
  adjustCredits,
};

export { grantCredits, deductCredits, findByIdempotencyKey, getBalance, getHistory, adjustCredits };
