import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export interface MemberAttrs {
  userId: Types.ObjectId;
  name?: string;
  bio?: string;
  customGreetings?: string;
  relatedToMemberId?: Types.ObjectId;
  treeId?: Types.ObjectId;
  image?: Record<string, unknown>;
  linkId?: string;
  memberRelationTypeId?: Types.ObjectId; // example: son/father/mother...
  nickname?: string;
  isFavorite?: boolean;
  lastTimeUsed?: Date;
  voiceId?: Types.ObjectId;
}

export type MemberDocument = HydratedDocument<MemberAttrs>;
export type MemberModel = Model<MemberAttrs> & PaginateModel<MemberAttrs>;

const memberSchema = new mongoose.Schema<MemberAttrs, MemberModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      required: false,
    },

    bio: {
      type: String,
      trim: true,
      required: false,
    },

    customGreetings: {
      type: String,
      trim: true,
      required: false,
    },

    relatedToMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: false,
      default: null,
    },

    treeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tree',
    required: false,
    index: true,
    default: null,
    },

    image: {
      type: Object,
      required: false,
      default: null,
    },

    linkId: {
      type: String,
      trim: true,
      required: false,
      index: true,
    },

    memberRelationTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberRelationType',
      required: false,
      default: null,
    },

    nickname: {
      type: String,
      trim: true,
      required: false,
    },

    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastTimeUsed: {
      type: Date,
      required: false,
      default: null,
    },

    voiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voice',
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

memberSchema.plugin(paginate as never);

export default mongoose.model<MemberAttrs, MemberModel>('Member', memberSchema);