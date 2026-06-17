import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import { Activity } from '../models/index';
import pick from '../utils/pick';

type IdParams = { id: string };
type ActivityQuery = Record<string, string | undefined>;

const getActivitiesById = catchAsync<Record<string, never>, unknown, unknown, ActivityQuery>(
  async (req, res: Response): Promise<void> => {
    if (!req.user) {
      throw new Error('Unauthorized');
    }
    const filter = { user: req.user.id };
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    if (!options.sortBy) {
      options.sortBy = 'createdAt:desc';
    }

    const activities = await Activity.paginate(filter, options);

    res.status(httpStatus.OK).send({
      message: 'Activities retrieved successfully',
      data: activities,
    });
  }
);

const deleteActivityById = catchAsync<IdParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new Error('Unauthorized');
  }
  const activity = await Activity.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!activity) {
    res.status(httpStatus.NOT_FOUND).send({ message: 'Activity not found' });
    return;
  }

  await activity.deleteOne();

  res.status(httpStatus.OK).send({
    message: 'Activity deleted successfully',
  });
});

export default { getActivitiesById, deleteActivityById };
