import mongoose from 'mongoose';
import config from '../src/config/config.ts';
import logger from '../src/config/logger.ts';
import MemberRelationType from '../src/models/memberRelationType.model.ts';
import { MEMBER_RELATION_TYPE_SEED } from '../src/utils/memberRelationTypeSeeder.ts';

const seedMemberRelationTypes = async (): Promise<void> => {
  for (const item of MEMBER_RELATION_TYPE_SEED) {
    await MemberRelationType.findOneAndUpdate(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          sortOrder: item.sortOrder,
          active: true,
        },
        $setOnInsert: {
          description: '',
        },
      },
      { upsert: true, new: true }
    );
  }

  logger.info(`Seeded ${MEMBER_RELATION_TYPE_SEED.length} member relation types`);
};

const seed = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    await seedMemberRelationTypes();

    logger.info('Member relation type seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding member relation types:', error);
    process.exit(1);
  }
};

void seed();
