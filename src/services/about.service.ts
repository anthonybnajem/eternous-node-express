import { About } from '../models/index.ts';
import type { AboutAttrs, AboutDocument } from '../models/about.model.ts';

const createAbout = async (aboutBody: AboutAttrs): Promise<AboutDocument> => {
  const existingAbout = await About.findOne();

  if (existingAbout) {
    existingAbout.content = aboutBody.content;
    await existingAbout.save();
    return existingAbout;
  }

  return About.create(aboutBody);
};

const queryAbouts = async (): Promise<AboutDocument | null> => {
  return About.findOne();
};

export default { createAbout, queryAbouts };
export { createAbout, queryAbouts };
