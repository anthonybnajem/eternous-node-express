import mongoose, { type HydratedDocument } from 'mongoose';

export interface AboutAttrs {
  content: string;
}

export type AboutDocument = HydratedDocument<AboutAttrs>;

const aboutSchema = new mongoose.Schema<AboutAttrs>(
  {
    content: { type: String, required: [true, 'Content is must be Required'] },
  },
  { timestamps: true }
);

export default mongoose.model<AboutAttrs>('About', aboutSchema);
