import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import { toJSON, paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export interface MemberRelationTypeAttrs {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export type MemberRelationTypeDocument = HydratedDocument<MemberRelationTypeAttrs>;
export type MemberRelationTypeModel = Model<MemberRelationTypeAttrs> &
  PaginateModel<MemberRelationTypeAttrs>;

const memberRelationTypeSchema = new mongoose.Schema<
  MemberRelationTypeAttrs,
  MemberRelationTypeModel
>(
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
      trim: true,
      default: '',
    },

    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
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

memberRelationTypeSchema.plugin(toJSON as never);
memberRelationTypeSchema.plugin(paginate as never);

const MemberRelationType = mongoose.model<
  MemberRelationTypeAttrs,
  MemberRelationTypeModel
>('MemberRelationType', memberRelationTypeSchema);

export default MemberRelationType;