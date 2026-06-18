import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import { toJSON, paginate } from './plugins/index.ts';
import { roles } from '../config/roles.ts';
import type { PaginateModel, UploadedFileInfo } from '../types/common.ts';

export type AuthProvider = 'email' | 'firebase' | 'google' | 'facebook' | 'apple';

export interface UserImage {
  url: string;
  path: string;
}

export interface UserAttrs {
  fullName?: string;
  email: string;
  image?: UserImage | Record<string, unknown>;
  password?: string;
  authProvider?: AuthProvider;
  authProviderId?: string;
  firebaseUid?: string;
  role?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string | Date;
  isEmailVerified?: boolean;
  isPhoneNumberVerified?: boolean;
  isResetPassword?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  isSuspended?: boolean;
  lastLogin?: Date;
  oneTimeCode?: number | null;
  phoneNumberOTP?: number | null;
  nidNumber?: string;
  nidStatus?: 'unverified' | 'pending' | 'approved' | 'cancelled';
  currentSubscription?: Types.ObjectId | null;
  subscriptions?: Types.ObjectId[];
  photo?: UploadedFileInfo[];
}

export interface UserMethods {
  isPasswordMatch(password: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<UserAttrs, UserMethods>;

export interface UserModel extends Model<UserAttrs, Record<string, never>, UserMethods>, PaginateModel<UserAttrs> {
  isEmailTaken(email: string, excludeUserId?: string | Types.ObjectId): Promise<boolean>;
  isPhoneNumberTaken(phoneNumber: string, excludeUserId?: string | Types.ObjectId): Promise<boolean>;
}

const userSchema = new mongoose.Schema<UserAttrs, UserModel, UserMethods>(
  {
    fullName: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value: string) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    image: {
      type: Object,
      required: false,
      default: { url: `/uploads/users/user.png`, path: 'null' },
    },
    authProvider: {
      type: String,
      enum: ['email', 'firebase', 'google', 'facebook', 'apple'],
      default: 'email',
    },
    authProviderId: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    firebaseUid: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    password: {
      type: String,
      required: false,
      trim: true,
      minlength: 8,
      validate(value: string) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true,
    },
    role: {
      type: String,
      enum: roles,
      default: 'user',
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneNumberVerified: {
      type: Boolean,
      default: false,
    },
    isResetPassword: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    oneTimeCode: {
      type: Number,
      default: null,
    },
    phoneNumberOTP: {
      type: Number,
      default: null,
    },
    nidNumber: {
      type: String,
      required: false,
    },
    nidStatus: {
      type: String,
      enum: ['unverified', 'pending', 'approved', 'cancelled'],
      default: 'unverified',
    },
    lastLogin: {
      type: Date,
    },
    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    subscriptions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subscription',
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(toJSON as never);
userSchema.plugin(paginate as never);

userSchema.statics.isEmailTaken = async function (email: string, excludeUserId?: string | Types.ObjectId): Promise<boolean> {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.statics.isPhoneNumberTaken = async function (
  phoneNumber: string,
  excludeUserId?: string | Types.ObjectId
): Promise<boolean> {
  const user = await this.findOne({ phoneNumber, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.methods.isPasswordMatch = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password ?? '');
};

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

const User = mongoose.model<UserAttrs, UserModel>('User', userSchema);

export default User;
