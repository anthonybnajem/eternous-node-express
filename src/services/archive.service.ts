import httpStatus from 'http-status';
import { Activity, Recording } from '../models/index.ts';
import storageService from './storage.service.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike, PaginatedResult, PaginationOptions } from '../types/common.ts';
import type { RecordingDocument } from '../models/recording.model.ts';

const getStorageUsage = async (userId: ObjectIdLike) => storageService.computeUserStorage(userId);

const getRecentSessions = async (userId: ObjectIdLike, limit = 10) => {
  const activities = await Activity.find({
    user: userId,
    type: { $in: ['chat', 'voice', 'tree', 'member'] },
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    description: activity.description,
    createdAt: (activity as { createdAt?: Date }).createdAt,
    metadata: activity.metadata ?? {},
  }));
};

const searchRecordings = async (
  userId: ObjectIdLike,
  query: { search?: string; page?: string | number; limit?: string | number }
): Promise<PaginatedResult<RecordingDocument>> => {
  const filter: Record<string, unknown> = { userId };
  if (query.search?.trim()) {
    const term = query.search.trim();
    filter.$or = [
      { memberName: { $regex: term, $options: 'i' } },
      { versionName: { $regex: term, $options: 'i' } },
    ];
  }

  return Recording.paginate(filter, {
    page: query.page,
    limit: query.limit,
    sortBy: 'createdAt:desc',
  });
};

const getRecordingById = async (userId: ObjectIdLike, recordingId: ObjectIdLike): Promise<RecordingDocument> => {
  const recording = await Recording.findOne({ _id: recordingId, userId });
  if (!recording) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recording not found');
  }
  return recording;
};

const getRecordingDownloadUrl = async (userId: ObjectIdLike, recordingId: ObjectIdLike): Promise<{ url: string }> => {
  const recording = await getRecordingById(userId, recordingId);
  if (!recording.fileUrl) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recording file not available');
  }
  return { url: recording.fileUrl };
};

export default {
  getStorageUsage,
  getRecentSessions,
  searchRecordings,
  getRecordingById,
  getRecordingDownloadUrl,
};

export {
  getStorageUsage,
  getRecentSessions,
  searchRecordings,
  getRecordingById,
  getRecordingDownloadUrl,
};
