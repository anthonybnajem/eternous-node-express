import type { MemberRelationTypeAttrs } from '../models/memberRelationType.model.ts';

export const MEMBER_RELATION_TYPE_SEED: Array<Pick<MemberRelationTypeAttrs, 'name' | 'slug' | 'sortOrder'>> = [
  { name: 'Father', slug: 'father', sortOrder: 1 },
  { name: 'Mother', slug: 'mother', sortOrder: 2 },
  { name: 'Son', slug: 'son', sortOrder: 3 },
  { name: 'Daughter', slug: 'daughter', sortOrder: 4 },
  { name: 'Brother', slug: 'brother', sortOrder: 5 },
  { name: 'Sister', slug: 'sister', sortOrder: 6 },
  { name: 'Grandfather', slug: 'grandfather', sortOrder: 7 },
  { name: 'Grandmother', slug: 'grandmother', sortOrder: 8 },
  { name: 'Uncle', slug: 'uncle', sortOrder: 9 },
  { name: 'Aunt', slug: 'aunt', sortOrder: 10 },
  { name: 'Cousin', slug: 'cousin', sortOrder: 11 },
  { name: 'Friend', slug: 'friend', sortOrder: 12 },
  { name: 'Other', slug: 'other', sortOrder: 99 },
];
