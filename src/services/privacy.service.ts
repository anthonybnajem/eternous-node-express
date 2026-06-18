import { Privacy } from '../models/index.ts';
import type { PrivacyAttrs, PrivacyDocument } from '../models/privacy.model.ts';

const createPrivacy = async (privacyBody: PrivacyAttrs): Promise<PrivacyDocument> => {
  const existingPrivacy = await Privacy.findOne();

  if (existingPrivacy) {
    existingPrivacy.content = privacyBody.content;
    await existingPrivacy.save();
    return existingPrivacy;
  }

  return Privacy.create(privacyBody);
};

const queryPrivacy = async (): Promise<PrivacyDocument | null> => {
  return Privacy.findOne();
};

export default { createPrivacy, queryPrivacy };
export { createPrivacy, queryPrivacy };
