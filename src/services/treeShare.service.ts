import httpStatus from 'http-status';
import { Tree, TreeShare, User } from '../models/index.ts';
import type { TreeShareDocument } from '../models/treeShare.model.ts';
import type { NotificationDocument } from '../models/notification.model.ts';
import notificationService from './notification.service.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike } from '../types/common.ts';

export interface ShareTreeInput {
  treeId: ObjectIdLike;
  ownerId: ObjectIdLike;
  email: string;
  message?: string;
}

export interface ShareTreeResult {
  treeShare: TreeShareDocument;
  notification: NotificationDocument;
}

const shareTree = async (input: ShareTreeInput): Promise<ShareTreeResult> => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const owner = await User.findById(input.ownerId);
  if (!owner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const recipient = await User.findOne({ email: normalizedEmail });
  if (!recipient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recipient user not found');
  }

  if (String(recipient.id) === String(input.ownerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot share a tree with yourself');
  }

  const tree = await Tree.findOne({
    _id: input.treeId,
    userId: input.ownerId,
    isDeleted: false,
  });

  if (!tree) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tree not found');
  }

  const existingShare = await TreeShare.findOne({
    treeId: tree.id,
    recipientId: recipient.id,
    status: 'pending',
  });

  if (existingShare) {
    throw new ApiError(httpStatus.CONFLICT, 'Tree share invitation already pending');
  }

  const treeShare = await TreeShare.create({
    treeId: tree.id,
    ownerId: owner.id,
    recipientId: recipient.id,
    status: 'pending',
    message: input.message ?? '',
  });

  const ownerLabel = owner.fullName?.trim() || owner.email;
  const notification = await notificationService.createNotification({
    receiverId: recipient.id,
    title: 'Tree share invitation',
    message: `${ownerLabel} shared "${tree.name}" tree with you`,
    type: 'tree_share',
    actionStatus: 'pending',
    viewStatus: false,
    linkId: String(tree.id),
    metadata: {
      treeShareId: treeShare.id,
      treeId: tree.id,
      treeName: tree.name,
      ownerId: owner.id,
      ownerEmail: owner.email,
      ownerName: ownerLabel,
      message: input.message ?? '',
    },
  });

  treeShare.notificationId = notification._id;
  await treeShare.save();

  return { treeShare, notification };
};

const resolveTreeShareFromNotification = async (
  notification: NotificationDocument,
  userId: ObjectIdLike
): Promise<TreeShareDocument> => {
  if (notification.type !== 'tree_share') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Notification is not a tree share');
  }

  if (notification.actionStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tree share invitation already handled');
  }

  const treeShareId = notification.metadata?.treeShareId;
  if (!treeShareId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tree share reference missing');
  }

  const treeShare = await TreeShare.findById(treeShareId);
  if (!treeShare || String(treeShare.recipientId) !== String(userId)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tree share not found');
  }

  return treeShare;
};

const acceptShare = async (
  notificationId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<{ notification: NotificationDocument; treeShare: TreeShareDocument }> => {
  const notification = await notificationService.getInboxNotification(notificationId, userId);
  const treeShare = await resolveTreeShareFromNotification(notification, userId);

  treeShare.status = 'accepted';
  await treeShare.save();

  notification.actionStatus = 'accepted';
  notification.viewStatus = true;
  await notification.save();

  return { notification, treeShare };
};

const declineShare = async (
  notificationId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<{ notification: NotificationDocument; treeShare: TreeShareDocument }> => {
  const notification = await notificationService.getInboxNotification(notificationId, userId);
  const treeShare = await resolveTreeShareFromNotification(notification, userId);

  treeShare.status = 'declined';
  await treeShare.save();

  notification.actionStatus = 'declined';
  notification.viewStatus = true;
  await notification.save();

  return { notification, treeShare };
};

export default {
  shareTree,
  acceptShare,
  declineShare,
};

export { shareTree, acceptShare, declineShare };
