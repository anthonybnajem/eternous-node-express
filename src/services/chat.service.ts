import httpStatus from 'http-status';
import axios from 'axios';
import config from '../config/config.ts';
import { Member } from '../models/index.ts';
import voiceService from './voice.service.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike } from '../types/common.ts';

export interface ChatInput {
  userId: ObjectIdLike;
  memberId: ObjectIdLike;
  message: string;
  voiceId?: ObjectIdLike;
  versionNumber?: number;
  deductCredits?: boolean;
}

export interface ChatResult {
  text: string;
  audioUrl: string;
  creditsUsed: number;
  creditsRemaining: number;
}

const generateDevResponse = (memberName: string, message: string): string =>
  `Hi, this is ${memberName}. I heard you say: "${message}"`;

const callOpenAi = async (memberName: string, message: string): Promise<string> => {
  if (!config.chat.openAiApiKey) {
    return generateDevResponse(memberName, message);
  }

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are ${memberName}, a family member responding warmly and briefly.`,
        },
        { role: 'user', content: message },
      ],
      max_tokens: 200,
    },
    {
      headers: {
        Authorization: `Bearer ${config.chat.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim() ?? generateDevResponse(memberName, message);
};

const synthesizeVoice = async (text: string, voiceId?: string): Promise<string> => {
  if (!config.chat.voiceCloneApiUrl) {
    return `https://example.com/dev-audio/${encodeURIComponent(voiceId ?? 'default')}.mp3`;
  }

  const response = await axios.post(
    config.chat.voiceCloneApiUrl,
    { text, voiceId },
    { timeout: 30000 }
  );

  return response.data?.audioUrl ?? response.data?.url ?? '';
};

const sendChatMessage = async (input: ChatInput): Promise<ChatResult> => {
  const member = await Member.findOne({ _id: input.memberId, userId: input.userId });
  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Member not found');
  }

  const defaultVoice = input.voiceId
    ? await voiceService.getVoiceById(input.memberId, input.voiceId, input.userId)
    : member.defaultVoiceId
      ? await voiceService.getVoiceById(input.memberId, member.defaultVoiceId, input.userId)
      : null;

  const memberName = member.name ?? 'your loved one';
  const text = await callOpenAi(memberName, input.message);
  const audioUrl = await synthesizeVoice(text, defaultVoice?.id);

  member.lastTimeUsed = new Date();
  await member.save();

  let creditsUsed = 0;
  let creditsRemaining = 0;

  if (input.deductCredits) {
    const { default: creditService } = await import('./credit.service.ts');
    const { default: User } = await import('../models/user.model.ts');
    const creditCost = config.chat.creditCost;

    await creditService.deductCredits({
      userId: input.userId,
      amount: creditCost,
      type: 'voice_generation',
      description: `Chat with ${memberName}`,
      memberId: member.id,
      voiceId: defaultVoice?.id,
      metadata: { messagePreview: input.message.slice(0, 120) },
    });

    creditsUsed = creditCost;
    const user = await User.findById(input.userId);
    creditsRemaining = user?.creditBalance ?? 0;
  } else {
    const { default: User } = await import('../models/user.model.ts');
    const user = await User.findById(input.userId);
    creditsRemaining = user?.creditBalance ?? 0;
  }

  return {
    text,
    audioUrl,
    creditsUsed,
    creditsRemaining,
  };
};

export default { sendChatMessage };
export { sendChatMessage };
