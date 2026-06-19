import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import { activityService, voiceService } from '../services/index.ts';
import type { VoiceUploadBody } from '../services/voice.service.ts';

type MemberIdParams = { memberId: string };
type VoiceIdParams = { memberId: string; voiceId: string };
type EmptyQuery = Record<string, never>;

const requireAuthUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  return req.user;
};

const listVoices = catchAsync<MemberIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const voices = await voiceService.listVoices(req.params.memberId, user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Voices retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { voices },
    })
  );
});

const uploadVoice = catchAsync<MemberIdParams, unknown, VoiceUploadBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const file = req.file;
    if (!file) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Voice file is required');
    }

    const voice = await voiceService.uploadVoice(req.params.memberId, user.id, file, req.body);

    await activityService.recordUserProductAction(req, 'voice', `Uploaded voice "${voice.name}"`, {
      action: 'upload',
      memberId: req.params.memberId,
      voiceId: voice.id,
      versionNumber: voice.versionNumber,
    });

    res.status(httpStatus.CREATED).json(
      response({
        message: 'Voice uploaded successfully',
        status: 'OK',
        statusCode: httpStatus.CREATED,
        data: { voice },
      })
    );
  }
);

const getVoice = catchAsync<VoiceIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const voice = await voiceService.getVoiceById(req.params.memberId, req.params.voiceId, user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Voice retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { voice },
    })
  );
});

const setDefaultVoice = catchAsync<VoiceIdParams, unknown, unknown, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const voice = await voiceService.setDefaultVoice(req.params.memberId, req.params.voiceId, user.id);

    await activityService.recordUserProductAction(req, 'voice', `Set default voice "${voice.name}"`, {
      action: 'set_default',
      memberId: req.params.memberId,
      voiceId: voice.id,
    });

    res.status(httpStatus.OK).json(
      response({
        message: 'Default voice updated successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { voice },
      })
    );
  }
);

const deleteVoice = catchAsync<VoiceIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const voice = await voiceService.archiveVoice(req.params.memberId, req.params.voiceId, user.id);

  await activityService.recordUserProductAction(req, 'voice', `Archived voice "${voice.name}"`, {
    action: 'delete',
    memberId: req.params.memberId,
    voiceId: voice.id,
  });

  res.status(httpStatus.OK).json(
    response({
      message: 'Voice archived successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { voice },
    })
  );
});

export default {
  listVoices,
  uploadVoice,
  getVoice,
  setDefaultVoice,
  deleteVoice,
};
