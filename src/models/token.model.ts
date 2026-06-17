import mongoose, { type HydratedDocument, type Types } from 'mongoose';
import { toJSON } from './plugins/index';
import { tokenTypes } from '../config/tokens';

export type TokenType = (typeof tokenTypes)[keyof typeof tokenTypes];

export interface TokenAttrs {
  token: string;
  user: Types.ObjectId;
  type: TokenType;
  expires: Date;
  blacklisted: boolean;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export type TokenDocument = HydratedDocument<TokenAttrs>;

const tokenSchema = new mongoose.Schema<TokenAttrs>(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [tokenTypes.REFRESH, tokenTypes.RESET_PASSWORD, tokenTypes.VERIFY_EMAIL],
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: String,
      required: false,
      index: true,
    },
    userAgent: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

tokenSchema.plugin(toJSON);

const Token = mongoose.model<TokenAttrs>('Token', tokenSchema);

export default Token;
