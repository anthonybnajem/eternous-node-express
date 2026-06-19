import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON } from './plugins/index.ts';

export type TreeShareStatus = 'pending' | 'accepted' | 'declined';

export interface TreeShareAttrs {
  treeId: Types.ObjectId;
  ownerId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: TreeShareStatus;
  message?: string;
  notificationId?: Types.ObjectId | null;
}

export type TreeShareDocument = HydratedDocument<TreeShareAttrs>;
export type TreeShareModel = Model<TreeShareAttrs>;

const treeShareSchema = new mongoose.Schema<TreeShareAttrs, TreeShareModel>(
  {
    treeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tree',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
      index: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

treeShareSchema.index({ treeId: 1, recipientId: 1, status: 1 });

treeShareSchema.plugin(toJSON as never);

const TreeShare = mongoose.model<TreeShareAttrs, TreeShareModel>('TreeShare', treeShareSchema);

export default TreeShare;
