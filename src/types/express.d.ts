import type { UserDocument } from '../models/user.model.ts';

declare global {
  namespace Express {
    interface User extends UserDocument {}

    interface Request {
      user?: UserDocument;
      requestId?: string;
    }
  }
}

export {};
