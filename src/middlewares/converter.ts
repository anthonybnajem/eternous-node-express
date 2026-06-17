import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import convert from 'heic-convert';

const convertHeicToPngMiddleware = (UPLOADS_FOLDER: string): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.file && (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif')) {
        const heicBuffer = await fs.readFile(req.file.path);
        const pngBuffer = (await convert({
          buffer: heicBuffer,
          format: 'PNG',
        })) as Buffer;

        const originalFileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
        const currentDateTime = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const pngFileName = `${originalFileName}_${currentDateTime}.png`;
        const pngFilePath = path.join(UPLOADS_FOLDER, pngFileName);

        await fs.writeFile(pngFilePath, pngBuffer);
        await fs.unlink(req.file.path);

        req.file.path = pngFilePath;
        req.file.filename = pngFileName;
        req.file.mimetype = 'image/png';
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default convertHeicToPngMiddleware;
