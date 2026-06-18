import type { NextFunction, Request, RequestHandler, Response } from 'express';
import Joi from 'joi';
import httpStatus from 'http-status';
import pick from '../utils/pick.ts';
import ApiError from '../utils/ApiError.ts';

type ValidationSchema = Partial<Record<'params' | 'query' | 'body', Joi.Schema | Record<string, unknown>>>;

const validate = (schema: ValidationSchema): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validSchema = pick(schema, ['params', 'query', 'body']);
    const object = pick(req as unknown as Record<string, unknown>, Object.keys(validSchema));
    const { value, error } = Joi.compile(validSchema)
      .prefs({ errors: { label: 'key' }, abortEarly: false })
      .validate(object);

    if (error) {
      const errorMessage = error.details.map((details) => details.message).join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
      return;
    }
    Object.assign(req, value);
    next();
  };
};

export default validate;
