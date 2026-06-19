import type { Express } from 'express';

export const UPLOADS_FOLDER_TREES = './public/uploads/trees';

export const toImageObject = (file: Express.Multer.File) => ({
  url: `/uploads/trees/${file.filename}`,
  path: file.path,
  mimetype: file.mimetype,
  originalname: file.originalname,
});

export const applyTreeUploads = (
  body: Record<string, unknown>,
  files?: { image?: Express.Multer.File[]; backgroundImage?: Express.Multer.File[] }
): void => {
  if (files?.image?.[0]) {
    body.image = toImageObject(files.image[0]);
  }
  if (files?.backgroundImage?.[0]) {
    body.backgroundImage = toImageObject(files.backgroundImage[0]);
  }
};
