import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON } from './plugins/index.ts';

export type SubscriptionStatus = 'active' | 'trial' | 'inactive' | 'past_due' | 'canceled' | 'unpaid';
export type SubscriptionProvider = 'stripe' | 'paypal' | 'manual';

export interface SubscriptionAttrs {
  user: Types.ObjectId;
  name: string;
  provider?: SubscriptionProvider;
  status?: SubscriptionStatus;
  startedAt?: Date;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  canceledAt?: Date | null;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  metadata?: Record<string, unknown>;
}

export type SubscriptionDocument = HydratedDocument<SubscriptionAttrs>;
export type SubscriptionModel = Model<SubscriptionAttrs>;

const subscriptionSchema = new mongoose.Schema<SubscriptionAttrs, SubscriptionModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'manual'],
      default: 'stripe',
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'inactive', 'past_due', 'canceled', 'unpaid'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    externalCustomerId: {
      type: String,
      trim: true,
      default: undefined,
    },
    externalSubscriptionId: {
      type: String,
      trim: true,
      default: undefined,
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

subscriptionSchema.plugin(toJSON as never);

const Subscription = mongoose.model<SubscriptionAttrs, SubscriptionModel>('Subscription', subscriptionSchema);

export default Subscription;
