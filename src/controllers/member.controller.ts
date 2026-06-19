import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import pick from '../utils/pick.ts';
import { activityService, memberService } from '../services/index.ts';
import { applyMemberUploads, normalizeMemberInput } from '../utils/memberUpload.ts';
import type { MemberCreateBody, MemberFavoriteBody, MemberUpdateBody } from '../services/member.service.ts';

type TreeIdParams = { treeId: string };
type MemberIdParams = { memberId: string };
type MemberQuery = Record<string, string | undefined>;
type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, never>;

const requireAuthUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  return req.user;
};

const listMembersByTree = catchAsync<TreeIdParams, unknown, unknown, MemberQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const members = await memberService.queryMembersByTree(req.params.treeId, user.id, options);

    res.status(httpStatus.OK).json(
      response({
        message: 'Members retrieved successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: members,
      })
    );
  }
);

const createMember = catchAsync<TreeIdParams, unknown, MemberCreateBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const body = normalizeMemberInput({ ...req.body }) as MemberCreateBody;
    const { voiceFile } = applyMemberUploads(body as Record<string, unknown>, req.files as {
      image?: Express.Multer.File[];
      voice?: Express.Multer.File[];
    });

    const member = await memberService.createMember(req.params.treeId, user.id, body, voiceFile);

    await activityService.recordUserProductAction(req, 'member', `Created member "${member.name}"`, {
      action: 'create',
      memberId: member.id,
      treeId: req.params.treeId,
    });

    res.status(httpStatus.CREATED).json(
      response({
        message: 'Member created successfully',
        status: 'OK',
        statusCode: httpStatus.CREATED,
        data: { member },
      })
    );
  }
);

const getMember = catchAsync<MemberIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const member = await memberService.getMemberDetails(req.params.memberId, user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Member retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { member },
    })
  );
});

const updateMember = catchAsync<MemberIdParams, unknown, MemberUpdateBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const body = normalizeMemberInput({ ...req.body }) as MemberUpdateBody;
    applyMemberUploads(body as Record<string, unknown>, req.files as {
      image?: Express.Multer.File[];
      voice?: Express.Multer.File[];
    });

    const member = await memberService.updateMember(req.params.memberId, user.id, body);

    await activityService.recordUserProductAction(req, 'member', `Updated member "${member.name}"`, {
      action: 'update',
      memberId: member.id,
      treeId: member.treeId,
    });

    res.status(httpStatus.OK).json(
      response({
        message: 'Member updated successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { member },
      })
    );
  }
);

const deleteMember = catchAsync<MemberIdParams, unknown, unknown, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const member = await memberService.deleteMember(req.params.memberId, user.id);

    await activityService.recordUserProductAction(req, 'member', `Deleted member "${member.name}"`, {
      action: 'delete',
      memberId: member.id,
      treeId: member.treeId,
    });

    res.status(httpStatus.OK).json(
      response({
        message: 'Member deleted successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { member },
      })
    );
  }
);

const setFavorite = catchAsync<MemberIdParams, unknown, MemberFavoriteBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const member = await memberService.setMemberFavorite(req.params.memberId, user.id, req.body.isFavorite);

    await activityService.recordUserProductAction(req, 'member', `Updated favorite for "${member.name}"`, {
      action: 'favorite',
      memberId: member.id,
      isFavorite: member.isFavorite,
    });

    res.status(httpStatus.OK).json(
      response({
        message: 'Member favorite updated successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { member },
      })
    );
  }
);

export default {
  listMembersByTree,
  createMember,
  getMember,
  updateMember,
  deleteMember,
  setFavorite,
};
