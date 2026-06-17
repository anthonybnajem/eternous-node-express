import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'path';

export default function userFileUploadMiddleware(UPLOADS_FOLDER: string): multer.Multer {
  const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      cb(null, UPLOADS_FOLDER);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const fileExt = path.extname(file.originalname);
      const filename = `${file.originalname.replace(fileExt, '').toLocaleLowerCase().split(' ').join('-')}-${Date.now()}`;

      cb(null, filename + fileExt);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 200000000000000000000000000,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      if (
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/heic' ||
        file.mimetype === 'image/heif'
      ) {
        cb(null, true);
      } else {
        cb(new Error('Only jpg, png, jpeg format allowed!'));
      }
    },
  });
}
