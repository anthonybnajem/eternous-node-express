import type { Express } from 'express';

export const UPLOADS_FOLDER_MEMBERS = './public/uploads/members';
export const UPLOADS_FOLDER_VOICES = './public/uploads/voices';

export const toMemberImageObject = (file: Express.Multer.File) => ({
  url: `/uploads/members/${file.filename}`,
  path: file.path,
  mimetype: file.mimetype,
  originalname: file.originalname,
});

export const toVoiceFileRef = (file: Express.Multer.File) => ({
  url: `/uploads/voices/${file.filename}`,
  path: file.path,
  mimetype: file.mimetype,
  originalname: file.originalname,
});

export const applyMemberUploads = (
  body: Record<string, unknown>,
  files?: { image?: Express.Multer.File[]; voice?: Express.Multer.File[] }
): { voiceFile?: Express.Multer.File } => {
  if (files?.image?.[0]) {
    body.image = toMemberImageObject(files.image[0]);
  }
  return { voiceFile: files?.voice?.[0] };
};

export const normalizeMemberInput = (body: Record<string, unknown>): Record<string, unknown> => {
  const normalized = { ...body };
  if (normalized.biography !== undefined && normalized.bio === undefined) {
    normalized.bio = normalized.biography;
  }
  delete normalized.biography;
  return normalized;
};
