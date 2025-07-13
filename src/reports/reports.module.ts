import { Module } from '@nestjs/common';
import { ReportsController } from 'src/reports/reports.controller';
import { ReportsService } from 'src/reports/reports.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from 'src/schemas/report.schema';
import { School, SchoolSchema } from 'src/schemas/school.schema';
import { Country, CountrySchema } from 'src/schemas/country.schema';
import { Continent, ContinentSchema } from 'src/schemas/continent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Country.name, schema: CountrySchema },
      { name: Continent.name, schema: ContinentSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
