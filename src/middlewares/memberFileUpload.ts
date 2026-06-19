import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'path';
import { UPLOADS_FOLDER_MEMBERS, UPLOADS_FOLDER_VOICES } from '../utils/memberUpload.ts';

const imageMimeTypes = new Set([
  'image/jpg',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
]);

const audioMimeTypes = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
]);

export default function memberFileUploadMiddleware(): multer.Multer {
  const storage = multer.diskStorage({
    destination: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      const isVoiceField = file.fieldname === 'voice' || file.fieldname === 'file';
      const folder = isVoiceField ? UPLOADS_FOLDER_VOICES : UPLOADS_FOLDER_MEMBERS;
      cb(null, folder);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const fileExt = path.extname(file.originalname);
      const filename = `${file.originalname.replace(fileExt, '').toLowerCase().split(' ').join('-')}-${Date.now()}`;
      cb(null, filename + fileExt);
    },
  });

  return multer({
    storage,
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      if (imageMimeTypes.has(file.mimetype) || audioMimeTypes.has(file.mimetype)) {
        cb(null, true);
        return;
      }
      cb(new Error('Only image or audio files are allowed'));
    },
  });
}
