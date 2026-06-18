import httpStatus from 'http-status';
import type { FilterQuery } from 'mongoose';
import { User } from '../models/index.ts';
import type { UserAttrs, UserDocument } from '../models/user.model.ts';
import ApiError from '../utils/ApiError.ts';
import { sendEmailVerification } from './email.service.ts';
import type { AnyRecord, ObjectIdLike, PaginationOptions, UploadedFileInfo } from '../types/common.ts';

export type UserCreateBody = Partial<UserAttrs> & Pick<UserAttrs, 'email'>;
export type UserUpdateBody = Partial<UserAttrs>;

const createOneTimeCode = (): number => Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

const shouldSendEmailVerification = (role?: string): boolean => role === 'client' || role === 'employee';

const createUser = async (userBody: UserCreateBody): Promise<UserDocument> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  const oneTimeCode = createOneTimeCode();

  if (shouldSendEmailVerification(userBody.role)) {
    await sendEmailVerification(userBody.email, oneTimeCode);
  }

  return User.create({ ...userBody, oneTimeCode });
};

const queryUsers = async (filter: AnyRecord, options: PaginationOptions) => {
  const query: FilterQuery<UserAttrs> = {};

  Object.keys(filter).forEach((key) => {
    const value = filter[key];
    if (value === '' || value === undefined || value === null) return;

    if (key === 'fullName' || key === 'email' || key === 'username') {
      query[key as keyof UserAttrs] = { $regex: String(value), $options: 'i' } as never;
    } else {
      query[key as keyof UserAttrs] = value as never;
    }
  });

  return User.paginate(query, options);
};

const getUserById = async (id: ObjectIdLike): Promise<UserDocument | null> => User.findById(id);

const getUserByEmail = async (email: string): Promise<UserDocument | null> => User.findOne({ email });

const updateUserById = async (
  userId: ObjectIdLike,
  updateBody: UserUpdateBody,
  files?: UploadedFileInfo[] | Express.Multer.File[]
): Promise<UserDocument> => {
  const user = await getUserById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  if (files && files.length > 0) {
    updateBody.photo = files as UploadedFileInfo[];
  } else {
    delete updateBody.photo;
  }

  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const deleteUserById = async (userId: ObjectIdLike): Promise<UserDocument> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.deleteOne();
  return user;
};

const isUpdateUser = async (userId: ObjectIdLike, updateBody: UserUpdateBody): Promise<UserDocument> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const oneTimeCode = createOneTimeCode();

  if (updateBody.email && shouldSendEmailVerification(updateBody.role)) {
    await sendEmailVerification(updateBody.email, oneTimeCode);
  }

  Object.assign(user, updateBody, {
    isDeleted: false,
    isSuspended: false,
    isEmailVerified: false,
    isResetPassword: false,
    isPhoneNumberVerified: false,
    oneTimeCode,
  });

  await user.save();
  return user;
};

const verifyNid = async (id: ObjectIdLike, nidNumber: string): Promise<UserDocument> => {
  const user = await getUserById(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.nidStatus === 'approved') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'NID already verified');
  }
  if (user.nidStatus === 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Waiting for admin approval');
  }
  user.nidNumber = nidNumber;
  user.nidStatus = 'pending';
  await user.save();
  return user;
};

const nidVerifyApproval = async (id: ObjectIdLike): Promise<UserDocument> => {
  const user = await getUserById(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.nidStatus === 'approved') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'NID already verified');
  }
  if (user.nidStatus === 'unverified' || user.nidStatus === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not submitted Nid for approval');
  }
  if (user.nidStatus === 'pending') {
    user.nidStatus = 'approved';
  }
  await user.save();
  return user;
};

const nidVerifyReject = async (id: ObjectIdLike): Promise<UserDocument> => {
  const user = await getUserById(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.nidStatus !== 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'NID verification already cancelled for this user');
  }
  user.nidStatus = 'cancelled';
  await user.save();
  return user;
};

const nidVerifySubmitList = async (): Promise<UserDocument[]> => {
  return User.find({ nidStatus: { $eq: 'pending' } });
};

const interestList = async (): Promise<string[]> => [];

export default {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  isUpdateUser,
  verifyNid,
  nidVerifyApproval,
  nidVerifyReject,
  nidVerifySubmitList,
  interestList,
};

export {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  isUpdateUser,
  verifyNid,
  nidVerifyApproval,
  nidVerifyReject,
  nidVerifySubmitList,
  interestList,
};
