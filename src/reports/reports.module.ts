import { Module } from '@nestjs/common';
import { RepotsController } from '../reports/reports.controller.js';
import { RepotsService } from '../reports/reports.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from '../schemas/report.schema.js';
import { School, SchoolSchema } from '../schemas/school.schema.js';
import { Country, CountrySchema } from '../schemas/country.schema.js';
import { Continent, ContinentSchema } from '../schemas/continent.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Country.name, schema: CountrySchema },
      { name: Continent.name, schema: ContinentSchema },
    ]),
  ],
  controllers: [RepotsController],
  providers: [RepotsService],
})
export class RepotsModule {}
