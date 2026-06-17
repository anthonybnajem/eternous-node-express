import type { Request } from 'express';
import type { HydratedDocument, Model, Types } from 'mongoose';

export type ObjectIdLike = string | Types.ObjectId;
export type AnyRecord = Record<string, unknown>;
export type StringRecord = Record<string, string>;

export interface PaginationOptions {
  sortBy?: string;
  populate?: string;
  limit?: number | string;
  page?: number | string;
}

export interface PaginatedResult<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface PaginateModel<T> {
  paginate(filter: AnyRecord, options: PaginationOptions): Promise<PaginatedResult<HydratedDocument<T>>>;
}

export interface UploadedFileInfo {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  destination?: string;
  filename: string;
  path: string;
  size?: number;
}

export type TypedRequest<
  Params = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
> = Request<Params, ResBody, ReqBody, ReqQuery>;

export interface ApiResponsePayload<T = unknown> {
  status?: string;
  statusCode?: number;
  code?: string | number;
  message: string;
  data?: T;
}
