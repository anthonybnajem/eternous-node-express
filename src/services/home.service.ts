import * as memberService from './member.service.ts';
import type { ObjectIdLike } from '../types/common.ts';

const getHomeDashboard = async (userId: ObjectIdLike) => {
  const [favorites, recentlyUsed] = await Promise.all([
    memberService.getFavoriteMembers(userId),
    memberService.getRecentlyUsedMembers(userId),
  ]);

  return {
    favorites: favorites.map((member) => member.toJSON()),
    recentlyUsed: recentlyUsed.map((member) => member.toJSON()),
  };
};

export default {
  getHomeDashboard,
};

export { getHomeDashboard };
