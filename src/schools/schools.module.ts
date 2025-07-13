import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolsController } from 'src/schools/schools.controller';
import { SchoolsService } from 'src/schools/schools.service';
import { School, SchoolSchema } from 'src/schemas/school.schema';
import { Country, CountrySchema } from 'src/schemas/country.schema';
import { Continent, ContinentSchema } from 'src/schemas/continent.schema';

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
