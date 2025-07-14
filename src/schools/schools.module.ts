import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolsController } from '../schools/schools.controller.js';
import { SchoolsService } from '../schools/schools.service.js';
import { School, SchoolSchema } from '../schemas/school.schema.js';
import { Country, CountrySchema } from '../schemas/country.schema.js';
import { Continent, ContinentSchema } from '../schemas/continent.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: School.name, schema: SchoolSchema },
      { name: Country.name, schema: CountrySchema },
      { name: Continent.name, schema: ContinentSchema },
    ]),
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
