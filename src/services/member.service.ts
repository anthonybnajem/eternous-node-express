import httpStatus from 'http-status';
import { Member, MemberRelationType, Voice } from '../models/index.ts';
import type { MemberAttrs, MemberDocument } from '../models/member.model.ts';
import type { VoiceDocument } from '../models/voice.model.ts';
import ApiError from '../utils/ApiError.ts';
import { toVoiceFileRef } from '../utils/memberUpload.ts';
import * as treeService from './tree.service.ts';
import type { ObjectIdLike, PaginationOptions } from '../types/common.ts';
import type { Express } from 'express';

export type MemberCreateBody = Partial<MemberAttrs> & Pick<MemberAttrs, 'name'>;
export type MemberUpdateBody = Partial<MemberAttrs>;
export type MemberFavoriteBody = { isFavorite: boolean };

const getOwnedMemberOrThrow = async (memberId: ObjectIdLike, userId: ObjectIdLike): Promise<MemberDocument> => {
  const member = await Member.findOne({ _id: memberId, userId });
  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Member not found');
  }
  return member;
};

const createInitialVoice = async (
  userId: ObjectIdLike,
  member: MemberDocument,
  voiceFile: Express.Multer.File
): Promise<VoiceDocument> => {
  const fileRef = toVoiceFileRef(voiceFile);
  const voice = await Voice.create({
    userId,
    memberId: member.id,
    versionNumber: 1,
    name: 'Version 1.0',
    uploadUrl: fileRef.url,
    voiceUrl: fileRef.url,
    size: voiceFile.size ?? 0,
    status: 'processing',
    isDefault: true,
    metadata: { originalname: voiceFile.originalname, mimetype: voiceFile.mimetype },
  });

  member.defaultVoiceId = voice.id;
  await member.save();
  return voice;
};

const createMember = async (
  treeId: ObjectIdLike,
  userId: ObjectIdLike,
  body: MemberCreateBody,
  voiceFile?: Express.Multer.File
): Promise<MemberDocument> => {
  await treeService.getOwnedTreeOrThrow(treeId, userId);

  if (body.memberRelationTypeId) {
    const relationType = await MemberRelationType.findOne({
      _id: body.memberRelationTypeId,
      active: true,
    });
    if (!relationType) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid member relation type');
    }
  }

  if (body.relatedToMemberId) {
    const relatedMember = await Member.findOne({
      _id: body.relatedToMemberId,
      userId,
      treeId,
    });
    if (!relatedMember) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Related member not found in this tree');
    }
  }

  const member = await Member.create({
    userId,
    treeId,
    name: body.name,
    bio: body.bio,
    privateNotes: body.privateNotes,
    customGreetings: body.customGreetings,
    dateOfBirth: body.dateOfBirth,
    relatedToMemberId: body.relatedToMemberId,
    image: body.image,
    memberRelationTypeId: body.memberRelationTypeId,
    nickname: body.nickname,
    isRelatedMember: body.isRelatedMember ?? true,
    isFavorite: false,
    lastTimeUsed: null,
    defaultVoiceId: null,
  });

  if (voiceFile) {
    await createInitialVoice(userId, member, voiceFile);
  }

  return member;
};

const queryMembersByTree = async (
  treeId: ObjectIdLike,
  userId: ObjectIdLike,
  options: PaginationOptions
) => {
  await treeService.getOwnedTreeOrThrow(treeId, userId);
  return Member.paginate(
    { treeId, userId },
    {
      ...options,
      sortBy: options.sortBy ?? 'createdAt:desc',
      populate: 'memberRelationTypeId',
    }
  );
};

const buildVoicesSummary = async (memberId: ObjectIdLike, userId: ObjectIdLike) => {
  const voices = await Voice.find({ memberId, userId, status: { $ne: 'archived' } })
    .sort({ versionNumber: -1 })
    .select('name versionNumber status isDefault uploadUrl voiceUrl');

  return {
    count: voices.length,
    items: voices,
  };
};

const getMemberDetails = async (memberId: ObjectIdLike, userId: ObjectIdLike) => {
  const member = await getOwnedMemberOrThrow(memberId, userId);
  await member.populate('memberRelationTypeId');

  const voices = await buildVoicesSummary(member.id, userId);
  const relationType = member.memberRelationTypeId;

  return {
    ...member.toJSON(),
    relationType: relationType && typeof relationType === 'object' ? relationType : null,
    voices,
    defaultVoiceId: member.defaultVoiceId,
  };
};

const updateMember = async (
  memberId: ObjectIdLike,
  userId: ObjectIdLike,
  body: MemberUpdateBody
): Promise<MemberDocument> => {
  const member = await getOwnedMemberOrThrow(memberId, userId);

  if (body.memberRelationTypeId) {
    const relationType = await MemberRelationType.findOne({
      _id: body.memberRelationTypeId,
      active: true,
    });
    if (!relationType) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid member relation type');
    }
  }

  if (body.relatedToMemberId) {
    if (String(body.relatedToMemberId) === String(member.id)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Member cannot be related to itself');
    }
    const relatedMember = await Member.findOne({
      _id: body.relatedToMemberId,
      userId,
      treeId: member.treeId,
    });
    if (!relatedMember) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Related member not found in this tree');
    }
  }

  Object.assign(member, body);
  await member.save();
  return member;
};

const deleteMember = async (memberId: ObjectIdLike, userId: ObjectIdLike): Promise<MemberDocument> => {
  const member = await getOwnedMemberOrThrow(memberId, userId);
  await Voice.deleteMany({ memberId: member.id, userId });
  await member.deleteOne();
  return member;
};

const setMemberFavorite = async (
  memberId: ObjectIdLike,
  userId: ObjectIdLike,
  isFavorite: boolean
): Promise<MemberDocument> => {
  const member = await getOwnedMemberOrThrow(memberId, userId);
  member.isFavorite = isFavorite;
  await member.save();
  return member;
};

const getFavoriteMembers = async (userId: ObjectIdLike, limit = 20) => {
  return Member.find({ userId, isFavorite: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('memberRelationTypeId');
};

const getRecentlyUsedMembers = async (userId: ObjectIdLike, limit = 10) => {
  return Member.find({ userId, lastTimeUsed: { $ne: null } })
    .sort({ lastTimeUsed: -1 })
    .limit(limit)
    .populate('memberRelationTypeId');
};

const touchMemberUsed = async (memberId: ObjectIdLike, userId: ObjectIdLike): Promise<MemberDocument> => {
  const member = await getOwnedMemberOrThrow(memberId, userId);
  member.lastTimeUsed = new Date();
  await member.save();
  return member;
};

export default {
  createMember,
  queryMembersByTree,
  getMemberDetails,
  updateMember,
  deleteMember,
  setMemberFavorite,
  getFavoriteMembers,
  getRecentlyUsedMembers,
  touchMemberUsed,
  getOwnedMemberOrThrow,
};

export {
  createMember,
  queryMembersByTree,
  getMemberDetails,
  updateMember,
  deleteMember,
  setMemberFavorite,
  getFavoriteMembers,
  getRecentlyUsedMembers,
  touchMemberUsed,
  getOwnedMemberOrThrow,
};
