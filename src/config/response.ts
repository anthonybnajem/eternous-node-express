import type { ApiResponsePayload } from '../types/common.js';

interface NormalizedResponse<T = unknown> {
  code?: number | string;
  message: string;
  data: {
    type?: string;
    attributes?: T;
    token?: unknown;
  };
}

const response = <T = unknown>(res: ApiResponsePayload<T> & { type?: string; token?: unknown; tokens?: unknown }): NormalizedResponse<T> => {
  const responseObject: NormalizedResponse<T> = {
    code: res.statusCode ?? res.code,
    message: res.message,
    data: {},
  };

  if (res.type) {
    responseObject.data.type = res.type;
  }

  if (res.data) {
    responseObject.data.attributes = res.data;
  }

  if (res.token || res.tokens) {
    responseObject.data.token = res.tokens ?? res.token;
  }

  return responseObject;
};

export default response;
