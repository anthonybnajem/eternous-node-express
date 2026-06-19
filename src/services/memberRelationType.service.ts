import httpStatus from 'http-status';
import { MemberRelationType } from '../models/index.ts';
import type { MemberRelationTypeDocument } from '../models/memberRelationType.model.ts';

const listActiveRelationTypes = async (): Promise<MemberRelationTypeDocument[]> => {
  return MemberRelationType.find({ active: true }).sort({ sortOrder: 1, name: 1 });
};

export default {
  listActiveRelationTypes,
};

export { listActiveRelationTypes };
