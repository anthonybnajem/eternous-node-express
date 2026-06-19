import Joi from 'joi';
import { objectId } from './custom.validation.ts';

const memberFields = {
  name: Joi.string().trim().min(1).max(120),
  bio: Joi.string().trim().allow('').max(5000),
  biography: Joi.string().trim().allow('').max(5000),
  privateNotes: Joi.string().trim().allow('').max(5000),
  customGreetings: Joi.string().trim().allow('').max(2000),
  dateOfBirth: Joi.date().iso().allow(null),
  relatedToMemberId: Joi.string().custom(objectId).allow(null),
  memberRelationTypeId: Joi.string().custom(objectId).allow(null),
  nickname: Joi.string().trim().allow('').max(120),
  isRelatedMember: Joi.boolean(),
};

const treeIdParams = {
  params: Joi.object().keys({
    treeId: Joi.string().required().custom(objectId),
  }),
};

const memberIdParams = {
  params: Joi.object().keys({
    memberId: Joi.string().required().custom(objectId),
  }),
};

const listMembersByTree = {
  ...treeIdParams,
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const createMember = {
  ...treeIdParams,
  body: Joi.object()
    .keys({
      name: memberFields.name.required(),
      bio: memberFields.bio,
      biography: memberFields.biography,
      privateNotes: memberFields.privateNotes,
      customGreetings: memberFields.customGreetings,
      dateOfBirth: memberFields.dateOfBirth,
      relatedToMemberId: memberFields.relatedToMemberId,
      memberRelationTypeId: memberFields.memberRelationTypeId,
      nickname: memberFields.nickname,
      isRelatedMember: memberFields.isRelatedMember,
    }),
};

const getMember = memberIdParams;

const updateMember = {
  ...memberIdParams,
  body: Joi.object()
    .keys(memberFields)
    .min(1),
};

const deleteMember = memberIdParams;

const setFavorite = {
  ...memberIdParams,
  body: Joi.object().keys({
    isFavorite: Joi.boolean().required(),
  }),
};

export default {
  listMembersByTree,
  createMember,
  getMember,
  updateMember,
  deleteMember,
  setFavorite,
};

export { listMembersByTree, createMember, getMember, updateMember, deleteMember, setFavorite };
