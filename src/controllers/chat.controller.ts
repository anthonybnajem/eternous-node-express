import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import { chatService } from '../services/index.ts';

type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, string | undefined>;
type ChatBody = {
  memberId: string;
  message: string;
  voiceId?: string;
  versionNumber?: number;
};

const sendChat = catchAsync<EmptyParams, unknown, ChatBody, EmptyQuery>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  const result = await chatService.sendChatMessage({
    userId: req.user.id,
    memberId: req.body.memberId,
    message: req.body.message,
    voiceId: req.body.voiceId,
    versionNumber: req.body.versionNumber,
    deductCredits: true,
  });

  res.status(httpStatus.OK).json(
    response({
      message: 'Chat response generated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

export default { sendChat };
export { sendChat };
