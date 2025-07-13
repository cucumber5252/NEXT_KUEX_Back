import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from 'src/auth/auth.module';
import { MypageModule } from 'src/mypage/mypage.module';
import { ReportsModule } from 'src/reports/reports.module';
import { SchoolsModule } from 'src/schools/schools.module';

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
    ReportsModule,
    MypageModule,
    SchoolsModule,
  ],
})
export class AppModule {}
