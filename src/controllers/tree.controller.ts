import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import pick from '../utils/pick.ts';
import { activityService, treeService } from '../services/index.ts';
import { applyTreeUploads } from '../utils/treeUpload.ts';
import type { TreeCreateBody, TreeUpdateBody } from '../services/tree.service.ts';

type TreeIdParams = { treeId: string };
type TreeQuery = Record<string, string | undefined>;
type DuplicateTreeBody = { copyMembers?: boolean };
type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, never>;

const requireAuthUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  return req.user;
};

const listTrees = catchAsync<EmptyParams, unknown, unknown, TreeQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const trees = await treeService.queryTrees(user.id, options);

  res.status(httpStatus.OK).json(
    response({
      message: 'Trees retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: trees,
    })
  );
});

const createTree = catchAsync<EmptyParams, unknown, TreeCreateBody, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const body = { ...req.body };
  applyTreeUploads(body, req.files as { image?: Express.Multer.File[]; backgroundImage?: Express.Multer.File[] });

  const tree = await treeService.createTree(user.id, body);

  await activityService.recordUserProductAction(req, 'tree', `Created tree "${tree.name}"`, {
    action: 'create',
    treeId: tree.id,
  });

  res.status(httpStatus.CREATED).json(
    response({
      message: 'Tree created successfully',
      status: 'OK',
      statusCode: httpStatus.CREATED,
      data: { tree },
    })
  );
});

const getTree = catchAsync<TreeIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const tree = await treeService.getTreeById(req.params.treeId, user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Tree retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { tree },
    })
  );
});

const updateTree = catchAsync<TreeIdParams, unknown, TreeUpdateBody, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const body = { ...req.body };
  applyTreeUploads(body, req.files as { image?: Express.Multer.File[]; backgroundImage?: Express.Multer.File[] });

  const tree = await treeService.updateTree(req.params.treeId, user.id, body);

  await activityService.recordUserProductAction(req, 'tree', `Updated tree "${tree.name}"`, {
    action: 'update',
    treeId: tree.id,
  });

  res.status(httpStatus.OK).json(
    response({
      message: 'Tree updated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { tree },
    })
  );
});

const deleteTree = catchAsync<TreeIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const tree = await treeService.softDeleteTree(req.params.treeId, user.id);

  await activityService.recordUserProductAction(req, 'tree', `Deleted tree "${tree.name}"`, {
    action: 'delete',
    treeId: tree.id,
  });

  res.status(httpStatus.OK).json(
    response({
      message: 'Tree deleted successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { tree },
    })
  );
});

const duplicateTree = catchAsync<TreeIdParams, unknown, DuplicateTreeBody, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const sourceTree = await treeService.getOwnedTreeOrThrow(req.params.treeId, user.id);
  const tree = await treeService.duplicateTree(req.params.treeId, user.id, {
    copyMembers: req.body.copyMembers ?? false,
  });

  await activityService.recordUserProductAction(req, 'tree', `Duplicated tree "${sourceTree.name}"`, {
    action: 'duplicate',
    treeId: tree.id,
    sourceTreeId: sourceTree.id,
    copyMembers: req.body.copyMembers ?? false,
  });

  res.status(httpStatus.CREATED).json(
    response({
      message: 'Tree duplicated successfully',
      status: 'OK',
      statusCode: httpStatus.CREATED,
      data: { tree },
    })
  );
});

const setDefaultTree = catchAsync<TreeIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const tree = await treeService.setDefaultTree(req.params.treeId, user.id);

  await activityService.recordUserProductAction(req, 'tree', `Set default tree "${tree.name}"`, {
    action: 'set_default',
    treeId: tree.id,
  });

  res.status(httpStatus.OK).json(
    response({
      message: 'Default tree updated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { tree },
    })
  );
});

export default {
  listTrees,
  createTree,
  getTree,
  updateTree,
  deleteTree,
  duplicateTree,
  setDefaultTree,
};
