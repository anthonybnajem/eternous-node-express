import { Member, Voice } from '../models/index.ts';
import type { ObjectIdLike } from '../types/common.ts';

const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;

const extractSize = (value: unknown): number => {
  if (!value || typeof value !== 'object') {
    return 0;
  }
  const size = (value as { size?: number }).size;
  return typeof size === 'number' && size >= 0 ? size : 0;
};

const computeUserStorage = async (
  userId: ObjectIdLike
): Promise<{ usedBytes: number; quotaBytes: number; breakdown: Record<string, number> }> => {
  const members = await Member.find({ userId });
  const voices = await Voice.find({ userId, status: { $ne: 'archived' } });

  const memberImageBytes = members.reduce((total, member) => total + extractSize(member.image), 0);
  const voiceBytes = voices.reduce((total, voice) => total + (voice.size ?? 0), 0);

  const usedBytes = memberImageBytes + voiceBytes;

  return {
    usedBytes,
    quotaBytes: DEFAULT_QUOTA_BYTES,
    breakdown: {
      memberImages: memberImageBytes,
      voices: voiceBytes,
    },
  };
};

export default { computeUserStorage, DEFAULT_QUOTA_BYTES };
export { computeUserStorage, DEFAULT_QUOTA_BYTES };
