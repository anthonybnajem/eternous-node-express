import type { ObjectIdLike } from '../types/common.js';
import User, { type UserDocument } from '../models/user.model.js';

type UserStatusCallback = (user: UserDocument | null, error?: unknown) => void;

const setUserOnline = async (id: ObjectIdLike, callback: UserStatusCallback): Promise<void> => {
  try {
    const updatedUser = await User.findByIdAndUpdate(id, { status: 'online' }, { new: true });
    callback(updatedUser);
  } catch (error) {
    callback(null, error);
  }
};

const setUserOffline = async (id: ObjectIdLike, callback: UserStatusCallback): Promise<void> => {
  try {
    const updatedUser = await User.findByIdAndUpdate(id, { status: 'offline' }, { new: true });
    callback(updatedUser);
  } catch (error) {
    callback(null, error);
  }
};

export default { setUserOnline, setUserOffline };
