import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { paginate, toJSON } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export interface MemberAttrs {
  userId: Types.ObjectId;
  name?: string;
  bio?: string;
  privateNotes?: string;
  customGreetings?: string;
  dateOfBirth?: Date | null;
  relatedToMemberId?: Types.ObjectId;
  treeId?: Types.ObjectId;
  image?: Record<string, unknown>;
  linkId?: string;
  memberRelationTypeId?: Types.ObjectId;
  nickname?: string;
  isRelatedMember?: boolean;
  isFavorite?: boolean;
  lastTimeUsed?: Date;
  defaultVoiceId?: Types.ObjectId;
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

    privateNotes: {
      type: String,
      trim: true,
      required: false,
      default: '',
    },

    customGreetings: {
      type: String,
      trim: true,
      required: false,
    },

    dateOfBirth: {
      type: Date,
      required: false,
      default: null,
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

    isRelatedMember: {
      type: Boolean,
      default: true,
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

    defaultVoiceId: {
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

memberSchema.index({ userId: 1, isFavorite: 1 });
memberSchema.index({ userId: 1, lastTimeUsed: -1 });
memberSchema.index({ userId: 1, treeId: 1 });

memberSchema.plugin(toJSON as never);
memberSchema.plugin(paginate as never);

export default mongoose.model<MemberAttrs, MemberModel>('Member', memberSchema);
