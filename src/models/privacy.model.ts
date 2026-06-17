import mongoose, { type HydratedDocument } from 'mongoose';

export interface PrivacyAttrs {
  content: string;
}

export type PrivacyDocument = HydratedDocument<PrivacyAttrs>;

const privacySchema = new mongoose.Schema<PrivacyAttrs>(
  {
    content: { type: String, required: [true, 'Content is must be Required'] },
  },
  { timestamps: true }
);

export default mongoose.model<PrivacyAttrs>('Privacy', privacySchema);
