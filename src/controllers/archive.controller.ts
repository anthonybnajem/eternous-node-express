import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import pick from '../utils/pick.ts';
import { archiveService } from '../services/index.ts';

type EmptyParams = Record<string, never>;
type RecordingIdParams = { id: string };
type ArchiveQuery = Record<string, string | undefined>;

const requireAuthUser = (req: Request) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  return req.user;
};

type EmptyQuery = Record<string, string | undefined>;

const getStorage = catchAsync<EmptyParams, unknown, unknown, EmptyQuery>(async (req, res: Response) => {
  const user = requireAuthUser(req);
  const usage = await archiveService.getStorageUsage(user.id);
  res.status(httpStatus.OK).json(response({ message: 'Storage usage retrieved', statusCode: httpStatus.OK, data: usage }));
});

const getRecentSessions = catchAsync<EmptyParams, unknown, unknown, EmptyQuery>(async (req, res: Response) => {
  const user = requireAuthUser(req);
  const sessions = await archiveService.getRecentSessions(user.id);
  res.status(httpStatus.OK).json(response({ message: 'Recent sessions retrieved', statusCode: httpStatus.OK, data: { sessions } }));
});

const listRecordings = catchAsync<EmptyParams, unknown, unknown, EmptyQuery>(async (req, res: Response) => {
  const user = requireAuthUser(req);
  const options = pick(req.query, ['search', 'page', 'limit']);
  const recordings = await archiveService.searchRecordings(user.id, options);
  res.status(httpStatus.OK).json(response({ message: 'Recordings retrieved', statusCode: httpStatus.OK, data: recordings }));
});

const getRecording = catchAsync<RecordingIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  const recording = await archiveService.getRecordingById(req.user.id, req.params.id);
  res.status(httpStatus.OK).json(response({ message: 'Recording retrieved', statusCode: httpStatus.OK, data: { recording } }));
});

const downloadRecording = catchAsync<RecordingIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response) => {
  if (!req.user) throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  const download = await archiveService.getRecordingDownloadUrl(req.user.id, req.params.id);
  res.status(httpStatus.OK).json(response({ message: 'Download URL generated', statusCode: httpStatus.OK, data: download }));
});

export default { getStorage, getRecentSessions, listRecordings, getRecording, downloadRecording };
