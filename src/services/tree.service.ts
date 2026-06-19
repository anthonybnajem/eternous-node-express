import httpStatus from 'http-status';
import { Tree, Member } from '../models/index.ts';
import type { TreeAttrs, TreeDocument } from '../models/tree.model.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike, PaginationOptions } from '../types/common.ts';

export type TreeCreateBody = Pick<TreeAttrs, 'name' | 'description' | 'image' | 'backgroundImage'>;
export type TreeUpdateBody = Partial<TreeCreateBody>;
export type DuplicateTreeOptions = { copyMembers?: boolean };

const activeTreeFilter = (userId: ObjectIdLike) => ({
  userId,
  isDeleted: false,
});

const getOwnedTreeOrThrow = async (treeId: ObjectIdLike, userId: ObjectIdLike): Promise<TreeDocument> => {
  const tree = await Tree.findOne({ _id: treeId, ...activeTreeFilter(userId) });
  if (!tree) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tree not found');
  }
  return tree;
};

const getMemberCount = async (treeId: ObjectIdLike, userId: ObjectIdLike): Promise<number> =>
  Member.countDocuments({ treeId, userId });

const withMemberCount = async (tree: TreeDocument) => {
  const memberCount = await getMemberCount(tree.id, tree.userId);
  return {
    ...tree.toJSON(),
    memberCount,
  };
};

const createTree = async (userId: ObjectIdLike, body: TreeCreateBody): Promise<TreeDocument> => {
  const hasDefault = await Tree.exists({ ...activeTreeFilter(userId), isDefault: true });
  return Tree.create({
    userId,
    name: body.name,
    description: body.description ?? '',
    image: body.image ?? null,
    backgroundImage: body.backgroundImage ?? null,
    isDefault: !hasDefault,
    isDeleted: false,
  });
};

const queryTrees = async (userId: ObjectIdLike, options: PaginationOptions) => {
  const queryOptions = {
    ...options,
    sortBy: options.sortBy ?? 'createdAt:desc',
  };
  return Tree.paginate(activeTreeFilter(userId), queryOptions);
};

const getTreeById = async (treeId: ObjectIdLike, userId: ObjectIdLike) => {
  const tree = await getOwnedTreeOrThrow(treeId, userId);
  return withMemberCount(tree);
};

const updateTree = async (treeId: ObjectIdLike, userId: ObjectIdLike, body: TreeUpdateBody): Promise<TreeDocument> => {
  const tree = await getOwnedTreeOrThrow(treeId, userId);
  Object.assign(tree, body);
  await tree.save();
  return tree;
};

const softDeleteTree = async (treeId: ObjectIdLike, userId: ObjectIdLike): Promise<TreeDocument> => {
  const tree = await getOwnedTreeOrThrow(treeId, userId);
  tree.isDeleted = true;
  if (tree.isDefault) {
    tree.isDefault = false;
  }
  await tree.save();
  return tree;
};

const setDefaultTree = async (treeId: ObjectIdLike, userId: ObjectIdLike): Promise<TreeDocument> => {
  const tree = await getOwnedTreeOrThrow(treeId, userId);
  await Tree.updateMany({ userId, isDeleted: false, _id: { $ne: tree.id } }, { isDefault: false });
  tree.isDefault = true;
  await tree.save();
  return tree;
};

const duplicateTree = async (
  treeId: ObjectIdLike,
  userId: ObjectIdLike,
  options: DuplicateTreeOptions = {}
): Promise<TreeDocument> => {
  const sourceTree = await getOwnedTreeOrThrow(treeId, userId);
  const copyMembers = options.copyMembers ?? false;

  const duplicatedTree = await Tree.create({
    userId,
    name: `${sourceTree.name} (Copy)`,
    description: sourceTree.description ?? '',
    image: sourceTree.image ?? null,
    backgroundImage: sourceTree.backgroundImage ?? null,
    isDefault: false,
    isDeleted: false,
  });

  if (copyMembers) {
    const members = await Member.find({ treeId: sourceTree.id, userId });
    const idMap = new Map<string, string>();

    for (const member of members) {
      const created = await Member.create({
        userId,
        treeId: duplicatedTree.id,
        name: member.name,
        bio: member.bio,
        privateNotes: member.privateNotes,
        customGreetings: member.customGreetings,
        dateOfBirth: member.dateOfBirth,
        image: member.image,
        linkId: member.linkId,
        memberRelationTypeId: member.memberRelationTypeId,
        nickname: member.nickname,
        isRelatedMember: member.isRelatedMember,
        isFavorite: false,
        lastTimeUsed: null,
        defaultVoiceId: null,
      });
      idMap.set(String(member.id), String(created.id));
    }

    for (const member of members) {
      if (!member.relatedToMemberId) {
        continue;
      }
      const newMemberId = idMap.get(String(member.id));
      const newRelatedId = idMap.get(String(member.relatedToMemberId));
      if (newMemberId && newRelatedId) {
        await Member.updateOne({ _id: newMemberId }, { relatedToMemberId: newRelatedId });
      }
    }
  }

  return duplicatedTree;
};

export default {
  createTree,
  queryTrees,
  getTreeById,
  updateTree,
  softDeleteTree,
  setDefaultTree,
  duplicateTree,
  getOwnedTreeOrThrow,
};

export {
  createTree,
  queryTrees,
  getTreeById,
  updateTree,
  softDeleteTree,
  setDefaultTree,
  duplicateTree,
  getOwnedTreeOrThrow,
};
