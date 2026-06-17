import mongoose, { type HydratedDocument } from 'mongoose';

export interface TermsAttrs {
  content: string;
}

export type TermsDocument = HydratedDocument<TermsAttrs>;

const termsSchema = new mongoose.Schema<TermsAttrs>(
  {
    content: { type: String, required: [true, 'Content is must be Required'] },
  },
  { timestamps: true }
);

export default mongoose.model<TermsAttrs>('Terms', termsSchema);
