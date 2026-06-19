import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON, paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export interface RecordingAttrs {
  userId: Types.ObjectId;
  memberId?: Types.ObjectId | null;
  voiceId?: Types.ObjectId | null;
  memberName?: string;
  versionName?: string;
  lastBackupAt?: Date | null;
  duration?: number;
  size?: number;
  fileUrl?: string;
  backupId?: string;
  metadata?: Record<string, unknown>;
}

export type RecordingDocument = HydratedDocument<RecordingAttrs>;
export type RecordingModel = Model<RecordingAttrs> & PaginateModel<RecordingAttrs>;

const recordingSchema = new mongoose.Schema<RecordingAttrs, RecordingModel>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null, index: true },
    voiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voice', default: null, index: true },
    memberName: { type: String, trim: true, default: '' },
    versionName: { type: String, trim: true, default: '' },
    lastBackupAt: { type: Date, default: null },
    duration: { type: Number, default: 0, min: 0 },
    size: { type: Number, default: 0, min: 0 },
    fileUrl: { type: String, trim: true, default: '' },
    backupId: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

recordingSchema.plugin(toJSON as never);
recordingSchema.plugin(paginate as never);

const Recording = mongoose.model<RecordingAttrs, RecordingModel>('Recording', recordingSchema);
export default Recording;
