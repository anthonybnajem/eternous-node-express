import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'path';

export default function messageFileUploadMiddleware(UPLOADS_FOLDER: string): multer.Multer {
  const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      cb(null, UPLOADS_FOLDER);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const fileExt = path.extname(file.originalname);
      const filename = `${file.originalname.replace(fileExt, '').toLowerCase().split(' ').join('-')}-${Date.now()}`;

      cb(null, filename + fileExt);
    },
  });

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image',
    'audio',
    'video',
  ];

  return multer({
    storage,
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const fileType = file.mimetype.split('/')[0];

      if (allowedTypes.includes(file.mimetype) || allowedTypes.includes(fileType)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    },
  });
}
