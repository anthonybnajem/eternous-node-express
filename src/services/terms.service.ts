import { Terms } from '../models/index.ts';
import type { TermsAttrs, TermsDocument } from '../models/terms.model.ts';

const createTerms = async (termsBody: TermsAttrs): Promise<TermsDocument> => {
  const existingTerms = await Terms.findOne();

  if (existingTerms) {
    existingTerms.content = termsBody.content;
    await existingTerms.save();
    return existingTerms;
  }

  return Terms.create(termsBody);
};

const queryTerms = async (): Promise<TermsDocument | null> => {
  return Terms.findOne();
};

export default { createTerms, queryTerms };
export { createTerms, queryTerms };
