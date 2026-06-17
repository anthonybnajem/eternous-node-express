/* eslint-disable no-param-reassign */
import type { Schema } from 'mongoose';

type MutableRecord = Record<string, any>;

const deleteAtPath = (obj: MutableRecord, path: string[], index: number): void => {
  if (!obj || !path[index]) return;

  if (index === path.length - 1) {
    delete obj[path[index]];
    return;
  }

  deleteAtPath(obj[path[index]], path, index + 1);
};

const toJSON = <T>(schema: Schema<T>): void => {
  const transform = schema.options.toJSON?.transform;
  const toJSONOptions = schema.options.toJSON && typeof schema.options.toJSON === 'object' ? schema.options.toJSON : {};

  schema.set('toJSON', {
    ...toJSONOptions,
    transform(doc: unknown, ret: MutableRecord, options: unknown) {
      Object.keys(schema.paths).forEach((path) => {
        const pathOptions = schema.paths[path]?.options as { private?: boolean } | undefined;
        if (pathOptions?.private) {
          deleteAtPath(ret, path.split('.'), 0);
        }
      });

      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.updatedAt;

      if (typeof transform === 'function') {
        return transform(doc as never, ret as never, options as never);
      }

      return ret;
    },
  });
};

export default toJSON;
