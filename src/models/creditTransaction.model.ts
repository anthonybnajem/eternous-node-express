import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON, paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export type CreditTransactionType =
  | 'purchase'
  | 'subscription_grant'
  | 'voice_generation'
  | 'refund'
  | 'admin_adjustment'
  | 'bonus'
  | 'expiration'
  | 'reversal';

export type CreditTransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'reversed';

export interface CreditTransactionAttrs {
  userId: Types.ObjectId;

  amount: number; // positive = add credits, negative = consume credits
  balanceAfter?: number;

  type: CreditTransactionType;
  status?: CreditTransactionStatus;

  description?: string;

  subscriptionId?: Types.ObjectId | null;
  subscriptionPlanId?: Types.ObjectId | null;
  paymentIntentId?: string;
  invoiceId?: string;

  memberId?: Types.ObjectId | null;
  voiceId?: Types.ObjectId | null;
  voiceGenerationId?: Types.ObjectId | null;

  createdBy?: Types.ObjectId | null; // admin/user who caused it

  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export type CreditTransactionDocument = HydratedDocument<CreditTransactionAttrs>;
export type CreditTransactionModel = Model<CreditTransactionAttrs> &
  PaginateModel<CreditTransactionAttrs>;

const creditTransactionSchema = new mongoose.Schema<
  CreditTransactionAttrs,
  CreditTransactionModel
>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    balanceAfter: {
      type: Number,
      required: false,
      min: 0,
    },

    type: {
      type: String,
      enum: [
        'purchase',
        'subscription_grant',
        'voice_generation',
        'refund',
        'admin_adjustment',
        'bonus',
        'expiration',
        'reversal',
      ],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed',
      index: true,
    },

    description: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
      index: true,
    },

    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      default: null,
      index: true,
    },

    paymentIntentId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },

    invoiceId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },

    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
      index: true,
    },

    voiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voice',
      default: null,
      index: true,
    },

    voiceGenerationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VoiceGeneration',
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    idempotencyKey: {
      type: String,
      required: false,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

creditTransactionSchema.index({ userId: 1, createdAt: -1 });
creditTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

creditTransactionSchema.plugin(toJSON as never);
creditTransactionSchema.plugin(paginate as never);

const CreditTransaction = mongoose.model<
  CreditTransactionAttrs,
  CreditTransactionModel
>('CreditTransaction', creditTransactionSchema);

export default CreditTransaction;