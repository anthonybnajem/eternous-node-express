import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON, paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export interface TreeAttrs {
  userId: Types.ObjectId;
  name: string;
  image?: Record<string, unknown>;
  backgroundImage?: Record<string, unknown>;
  description?: string;
  isDefault?: boolean;
  isDeleted?: boolean;
}

export type TreeDocument = HydratedDocument<TreeAttrs>;
export type TreeModel = Model<TreeAttrs> & PaginateModel<TreeAttrs>;

const treeSchema = new mongoose.Schema<TreeAttrs, TreeModel>(
  {
    userId: {
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

    image: {
      type: Object,
      required: false,
      default: null,
    },

    backgroundImage: {
      type: Object,
      required: false,
      default: null,
    },

    description: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

treeSchema.plugin(toJSON as never);
treeSchema.plugin(paginate as never);

const Tree = mongoose.model<TreeAttrs, TreeModel>('Tree', treeSchema);

export default Tree;