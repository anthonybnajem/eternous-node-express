import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON, paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export type VoiceStatus = 'processing' | 'ready' | 'failed' | 'archived';

export interface VoiceAttrs {
  userId: Types.ObjectId;
  memberId: Types.ObjectId;

  name?: string;
  uploadUrl?: string;
  voiceUrl?: string;

  versionNumber: number;

  size?: number;
  duration?: number;

  status?: VoiceStatus;
  isDefault?: boolean;

  backupId?: string;
  backupDate?: Date | null;

  metadata?: Record<string, unknown>;
}

export type VoiceDocument = HydratedDocument<VoiceAttrs>;
export type VoiceModel = Model<VoiceAttrs> & PaginateModel<VoiceAttrs>;

const voiceSchema = new mongoose.Schema<VoiceAttrs, VoiceModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: false,
      trim: true,
    },

    uploadUrl: {
      type: String,
      required: false,
      trim: true,
    },

    voiceUrl: {
      type: String,
      required: false,
      trim: true,
    },

    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    size: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    duration: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ['processing', 'ready', 'failed', 'archived'],
      default: 'processing',
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    backupId: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },

    backupDate: {
      type: Date,
      default: null,
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

voiceSchema.index({ memberId: 1, versionNumber: 1 }, { unique: true });
voiceSchema.index({ userId: 1, memberId: 1 });
voiceSchema.index({ memberId: 1, status: 1, versionNumber: -1 });
voiceSchema.index({ memberId: 1, isDefault: 1 });

voiceSchema.plugin(toJSON as never);
voiceSchema.plugin(paginate as never);

const Voice = mongoose.model<VoiceAttrs, VoiceModel>('Voice', voiceSchema);

export default Voice;