import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON, paginate } from './plugins/index';
import type { PaginateModel } from '../types/common';

export type PaymentMethod = 'stripe' | 'paypal' | 'card' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentAttrs {
  user: Types.ObjectId;
  order?: Types.ObjectId;
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  stripePaymentIntentId?: string;
  metadata?: Record<string, unknown>;
}

export type PaymentDocument = HydratedDocument<PaymentAttrs>;
export type PaymentModel = Model<PaymentAttrs> & PaginateModel<PaymentAttrs>;

const paymentSchema = new mongoose.Schema<PaymentAttrs, PaymentModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'card', 'cash'],
      default: 'stripe',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.plugin(toJSON as never);
paymentSchema.plugin(paginate as never);

const Payment = mongoose.model<PaymentAttrs, PaymentModel>('Payment', paymentSchema);

export default Payment;
