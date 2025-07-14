import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { MypageModule } from './mypage/mypage.module.js';
import { RepotsModule } from './reports/reports.module.js';
import { SchoolsModule } from './schools/schools.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        dbName: config.get<string>('DB_NAME') || 'ku-ex',
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true,
        retryReads: true,
      }),
    }),
    AuthModule,
    RepotsModule,
    MypageModule,
    SchoolsModule,
  ],
})
export class AppModule {}
