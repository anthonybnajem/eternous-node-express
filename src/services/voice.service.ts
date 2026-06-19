import httpStatus from 'http-status';
import { Member, Voice } from '../models/index.ts';
import type { VoiceDocument } from '../models/voice.model.ts';
import ApiError from '../utils/ApiError.ts';
import { toVoiceFileRef } from '../utils/memberUpload.ts';
import * as memberService from './member.service.ts';
import type { ObjectIdLike } from '../types/common.ts';
import type { Express } from 'express';

export type VoiceUploadBody = { name?: string };

const getOwnedVoiceOrThrow = async (
  voiceId: ObjectIdLike,
  memberId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<VoiceDocument> => {
  const voice = await Voice.findOne({
    _id: voiceId,
    memberId,
    userId,
    status: { $ne: 'archived' },
  });
  if (!voice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Voice not found');
  }
  return voice;
};

const getNextVersionNumber = async (memberId: ObjectIdLike): Promise<number> => {
  const latest = await Voice.findOne({ memberId, status: { $ne: 'archived' } })
    .sort({ versionNumber: -1 })
    .select('versionNumber');
  return (latest?.versionNumber ?? 0) + 1;
};

const uploadVoice = async (
  memberId: ObjectIdLike,
  userId: ObjectIdLike,
  file: Express.Multer.File,
  body: VoiceUploadBody = {}
): Promise<VoiceDocument> => {
  const member = await memberService.getOwnedMemberOrThrow(memberId, userId);
  const versionNumber = await getNextVersionNumber(member.id);
  const fileRef = toVoiceFileRef(file);
  const hasDefault = await Voice.exists({ memberId: member.id, userId, isDefault: true, status: { $ne: 'archived' } });
  const isFirstVoice = versionNumber === 1 && !hasDefault;

  const voice = await Voice.create({
    userId,
    memberId: member.id,
    versionNumber,
    name: body.name?.trim() || `Version ${versionNumber}.0`,
    uploadUrl: fileRef.url,
    voiceUrl: fileRef.url,
    size: file.size ?? 0,
    status: 'processing',
    isDefault: isFirstVoice,
    metadata: { originalname: file.originalname, mimetype: file.mimetype },
  });

  if (isFirstVoice || !member.defaultVoiceId) {
    member.defaultVoiceId = voice.id;
    await member.save();
  }

  return voice;
};

const listVoices = async (memberId: ObjectIdLike, userId: ObjectIdLike): Promise<VoiceDocument[]> => {
  await memberService.getOwnedMemberOrThrow(memberId, userId);
  return Voice.find({ memberId, userId, status: { $ne: 'archived' } }).sort({ versionNumber: -1 });
};

const getVoiceById = async (
  memberId: ObjectIdLike,
  voiceId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<VoiceDocument> => {
  await memberService.getOwnedMemberOrThrow(memberId, userId);
  return getOwnedVoiceOrThrow(voiceId, memberId, userId);
};

const setDefaultVoice = async (
  memberId: ObjectIdLike,
  voiceId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<VoiceDocument> => {
  const member = await memberService.getOwnedMemberOrThrow(memberId, userId);
  const voice = await getOwnedVoiceOrThrow(voiceId, member.id, userId);

  await Voice.updateMany({ memberId: member.id, userId, _id: { $ne: voice.id } }, { isDefault: false });
  voice.isDefault = true;
  await voice.save();

  member.defaultVoiceId = voice.id;
  await member.save();

  return voice;
};

const archiveVoice = async (
  memberId: ObjectIdLike,
  voiceId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<VoiceDocument> => {
  const member = await memberService.getOwnedMemberOrThrow(memberId, userId);
  const voice = await getOwnedVoiceOrThrow(voiceId, member.id, userId);

  if (voice.isDefault) {
    voice.isDefault = false;
    member.defaultVoiceId = undefined;
    const fallback = await Voice.findOne({
      memberId: member.id,
      userId,
      _id: { $ne: voice.id },
      status: { $ne: 'archived' },
    }).sort({ versionNumber: -1 });

    if (fallback) {
      fallback.isDefault = true;
      await fallback.save();
      member.defaultVoiceId = fallback.id;
    }
    await member.save();
  }

  voice.status = 'archived';
  await voice.save();
  return voice;
};

const resolveVoiceForChat = async (
  memberId: ObjectIdLike,
  userId: ObjectIdLike,
  options: { voiceId?: ObjectIdLike; versionNumber?: number } = {}
): Promise<VoiceDocument | null> => {
  await memberService.getOwnedMemberOrThrow(memberId, userId);

  if (options.voiceId) {
    return Voice.findOne({
      _id: options.voiceId,
      memberId,
      userId,
      status: { $in: ['ready', 'processing'] },
    });
  }

  if (options.versionNumber) {
    return Voice.findOne({
      memberId,
      userId,
      versionNumber: options.versionNumber,
      status: { $in: ['ready', 'processing'] },
    });
  }

  const defaultVoice = await Voice.findOne({ memberId, userId, isDefault: true, status: { $ne: 'archived' } });
  if (defaultVoice) {
    return defaultVoice;
  }

  return Voice.findOne({ memberId, userId, status: 'ready' }).sort({ versionNumber: -1 });
};

export default {
  uploadVoice,
  listVoices,
  getVoiceById,
  setDefaultVoice,
  archiveVoice,
  resolveVoiceForChat,
};

export {
  uploadVoice,
  listVoices,
  getVoiceById,
  setDefaultVoice,
  archiveVoice,
  resolveVoiceForChat,
};
