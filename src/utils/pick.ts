const pick = <T extends Record<string, unknown>, K extends keyof T>(object: T, keys: readonly K[]): Partial<Pick<T, K>> => {
  return keys.reduce<Partial<Pick<T, K>>>((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

export default pick;
