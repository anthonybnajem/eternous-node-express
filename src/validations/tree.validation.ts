import Joi from 'joi';
import { objectId } from './custom.validation.ts';

const listTrees = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const createTree = {
  body: Joi.object().keys({
    name: Joi.string().trim().required().min(1).max(120),
    description: Joi.string().trim().allow('').max(2000),
  }),
};

const treeIdParams = {
  params: Joi.object().keys({
    treeId: Joi.string().required().custom(objectId),
  }),
};

const getTree = treeIdParams;

const updateTree = {
  ...treeIdParams,
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(1).max(120),
      description: Joi.string().trim().allow('').max(2000),
    })
    .min(1),
};

const deleteTree = treeIdParams;

const duplicateTree = {
  ...treeIdParams,
  body: Joi.object().keys({
    copyMembers: Joi.boolean().default(false),
  }),
};

const setDefaultTree = {
  ...treeIdParams,
  body: Joi.object().optional(),
};

export default {
  listTrees,
  createTree,
  getTree,
  updateTree,
  deleteTree,
  duplicateTree,
  setDefaultTree,
};

export { listTrees, createTree, getTree, updateTree, deleteTree, duplicateTree, setDefaultTree };
