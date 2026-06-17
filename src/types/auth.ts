import type { ObjectIdLike } from './common';
import type { UserDocument } from '../models/user.model';

export interface RegisterBody {
  fullName?: string;
  idToken?: string;
  email?: string;
  password?: string;
  role?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string | Date;
}

export interface LoginBody {
  idToken?: string;
  email?: string;
  password?: string;
}

export interface FirebaseAuthBody {
  idToken: string;
  fullName?: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  email: string;
  password: string;
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

export interface VerifyEmailBody {
  email: string;
  oneTimeCode: number;
}

export interface DeleteMeBody {
  password: string;
}

export interface AuthTokenPayload {
  sub: ObjectIdLike;
  iat: number;
  exp: number;
  activity?: ObjectIdLike;
  sessionId?: string;
  type: string;
}

export interface AuthTokens {
  access: {
    token: string;
    expires: Date;
  };
  refresh: {
    token: string;
    expires: Date;
  };
}

export interface AuthenticatedUser extends UserDocument {}
