import type { Query, Schema } from 'mongoose';
import type { AnyRecord, PaginatedResult, PaginationOptions } from '../../types/common.ts';

const paginate = <T>(schema: Schema<T>): void => {
  schema.statics.paginate = async function (filter: AnyRecord, options: PaginationOptions): Promise<PaginatedResult<T>> {
    let sort = '';

    if (options.sortBy) {
      const sortingCriteria: string[] = [];
      options.sortBy.split(',').forEach((sortOption: string) => {
        const [key, order] = sortOption.split(':');
        sortingCriteria.push((order === 'desc' ? '-' : '') + key);
      });
      sort = sortingCriteria.join(' ');
    } else {
      sort = 'createdAt';
    }

    const limit = options.limit && parseInt(String(options.limit), 10) > 0 ? parseInt(String(options.limit), 10) : 10;
    const page = options.page && parseInt(String(options.page), 10) > 0 ? parseInt(String(options.page), 10) : 1;
    const skip = (page - 1) * limit;

    const countPromise = this.countDocuments(filter).exec();
    let docsPromise = this.find(filter).sort(sort).skip(skip).limit(limit) as Query<T[], T>;

    if (options.populate) {
      options.populate.split(',').forEach((populateOption: string) => {
        const [field, ...fieldsToPopulate] = populateOption.split(' ');
        const populateFields = fieldsToPopulate.length > 0 ? fieldsToPopulate.join(' ') : '';
        docsPromise = docsPromise.populate({ path: field, select: populateFields });
      });
    }

    const [totalResults, results] = await Promise.all([countPromise, docsPromise.exec()]);
    const totalPages = Math.ceil(totalResults / limit);

    return {
      results,
      page,
      limit,
      totalPages,
      totalResults,
    };
  };
};

export default paginate;
