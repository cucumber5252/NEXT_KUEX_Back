import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { School } from 'src/schemas/school.schema';
import { Country } from 'src/schemas/country.schema';
import { Continent } from 'src/schemas/continent.schema';
import { FastifyRequest } from 'fastify';
import { SchoolType, CountryType, ContinentType } from 'src/types';
import { SchoolFilter, SchoolResponse } from 'src/types/school';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectModel(School.name) private schoolModel: Model<School>,
    @InjectModel(Country.name) private countryModel: Model<Country>,
    @InjectModel(Continent.name) private continentModel: Model<Continent>,
  ) {}

  async getSchools(req: FastifyRequest) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const searchParams = url.searchParams;
    const filter: SchoolFilter = {};

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const requestedLimit = Number(searchParams.get('limit')) || 12;
    const limit =
      requestedLimit >= 9999
        ? 99999
        : Math.min(50, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;

    if (searchParams.has('minCompletedSemester')) {
      filter.minCompletedSemester = {
        $gte: Number(searchParams.get('minCompletedSemester')),
      };
    }
    if (searchParams.has('toefl')) {
      filter.toefl = { $lte: Number(searchParams.get('toefl')) };
    }
    if (searchParams.has('ielts')) {
      filter.ielts = { $lte: Number(searchParams.get('ielts')) };
    }
    if (searchParams.has('availableSemester')) {
      filter.availableSemester = searchParams.get('availableSemester') as any;
    }
    if (searchParams.has('hasDormitory')) {
      filter.hasDormitory = searchParams.get('hasDormitory') === 'true';
    }

    const continentName = searchParams.get('continent');
    const countryName = searchParams.get('country');

    if (countryName) {
      const country = await this.countryModel.findOne({ name: countryName });
      if (country) filter.countryId = country._id;
    } else if (continentName) {
      const continent = await this.continentModel.findOne({
        name: continentName,
      });
      if (continent) {
        const countries = await this.countryModel.find({
          continentId: continent._id,
        });
        filter.countryId = { $in: countries.map((c) => c._id) };
      }
    }

    const totalItems = await this.schoolModel.countDocuments(filter);
    const sortOption = searchParams.get('sort') ?? 'qsRank';
    let mongoSort: any = {};

    const pipeline: any[] = [{ $match: filter }];

    if (sortOption === 'qsRank') {
      pipeline.push({
        $addFields: {
          qsRankSortField: {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$qsRank', null] },
                  { $eq: ['$qsRank', undefined] },
                ],
              },
              then: 999999,
              else: '$qsRank',
            },
          },
        },
      });
      pipeline.push({ $sort: { qsRankSortField: 1, _id: 1 } });
    } else if (sortOption === 'personnel') {
      pipeline.push({
        $addFields: {
          personnelSortField: {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$personnel', null] },
                  { $eq: ['$personnel', undefined] },
                ],
              },
              then: -1,
              else: '$personnel',
            },
          },
        },
      });
      pipeline.push({ $sort: { personnelSortField: -1, _id: 1 } });
    } else {
      pipeline.push({
        $addFields: {
          qsRankSortField: {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$qsRank', null] },
                  { $eq: ['$qsRank', undefined] },
                ],
              },
              then: 999999,
              else: '$qsRank',
            },
          },
        },
      });
      pipeline.push({ $sort: { qsRankSortField: 1, _id: 1 } });
    }

    pipeline.push({ $skip: skip }, { $limit: limit });

    pipeline.push(
      {
        $lookup: {
          from: 'countries',
          localField: 'countryId',
          foreignField: '_id',
          as: 'countryId',
        },
      },
      { $unwind: '$countryId' },
      {
        $lookup: {
          from: 'continents',
          localField: 'countryId.continentId',
          foreignField: '_id',
          as: 'countryId.continentId',
        },
      },
      { $unwind: '$countryId.continentId' },
    );

    const schools = await this.schoolModel.aggregate(pipeline);

    const result: SchoolResponse[] = schools.map(
      (
        school: SchoolType & {
          countryId: CountryType & { continentId: ContinentType };
        },
      ) => ({
        id: school._id.toString(),
        name: school.name,
        name_kor: school.name_kor,
        continent: school.countryId?.continentId?.name ?? '',
        country: school.countryId?.name ?? '',
        city: school.city,
        minCompletedSemester: school.minCompletedSemester,
        toefl: school.toefl,
        ielts: school.ielts,
        availableSemester: school.availableSemester,
        hasDormitory: school.hasDormitory,
        qsRank: school.qsRank,
        personnel: school.personnel,
        minGpa: school.minGpa,
        homepageUrl: school.homepageUrl,
      }),
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: result,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getSchoolLocations() {
    const schools = await this.schoolModel
      .find({}, { country: 1, city: 1 })
      .populate({
        path: 'countryId',
        populate: {
          path: 'continentId',
          select: 'name',
        },
        select: 'name',
      })
      .lean();

    const locationData = schools
      .map((school) => {
        const populated = school as {
          countryId: {
            name?: string;
            continentId?: {
              name?: string;
            };
          };
        };
        return {
          country: populated.countryId?.name || '',
          continent: populated.countryId?.continentId?.name || '',
        };
      })
      .filter((item) => item.country && item.continent);

    return locationData;
  }

  async getSchoolById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;

    const school = await this.schoolModel
      .findById(id)
      .populate({
        path: 'countryId',
        populate: { path: 'continentId' },
      })
      .lean();

    if (!school) return null;

    const populated = school as {
      _id: Types.ObjectId;
      name: string;
      name_kor?: string;
      countryId?: {
        name?: string;
        continentId?: {
          name?: string;
        };
      };
      city?: string;
      minGpa?: number;
      minCompletedSemester?: number;
      toefl?: number;
      ielts?: number;
      availableSemester?: string;
      hasDormitory?: boolean;
      homepageUrl?: string;
      qsRank?: number;
      personnel?: number;
      language_remarks?: string;
    };

    return {
      id: populated._id.toString(),
      name: populated.name,
      name_kor: populated.name_kor,
      continent: populated.countryId?.continentId?.name ?? '',
      country: populated.countryId?.name ?? '',
      city: populated.city,
      minGpa: populated.minGpa,
      minCompletedSemester: populated.minCompletedSemester,
      toefl: populated.toefl,
      ielts: populated.ielts,
      availableSemester: populated.availableSemester,
      hasDormitory: populated.hasDormitory,
      homepageUrl: populated.homepageUrl,
      qsRank: populated.qsRank,
      personnel: populated.personnel,
      language_remarks: populated.language_remarks,
    };
  }
}
