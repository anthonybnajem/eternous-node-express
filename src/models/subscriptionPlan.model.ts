import mongoose, { type HydratedDocument } from 'mongoose';
import { toJSON } from './plugins/index.js';

export type SubscriptionBillingInterval = 'day' | 'week' | 'month' | 'year' | 'one_time';

export interface SubscriptionPlanAttrs {
  name: string;
  slug: string;
  description?: string;
  priceId: string;
  currency?: string;
  amount?: number;
  interval?: SubscriptionBillingInterval;
  trialDays?: number;
  features?: string[];
  active?: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlanAttrs>;

const subscriptionPlanSchema = new mongoose.Schema<SubscriptionPlanAttrs>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: false,
      default: '',
    },
    priceId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    amount: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    interval: {
      type: String,
      enum: ['day', 'week', 'month', 'year', 'one_time'],
      default: 'month',
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

subscriptionPlanSchema.plugin(toJSON as never);

const SubscriptionPlan = mongoose.model<SubscriptionPlanAttrs>('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
