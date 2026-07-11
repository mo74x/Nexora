import { Module } from '@nestjs/common';
import { AnalyticsApiController } from './analytics-api.controller';
import { AnalyticsApiService } from './analytics-api.service';

@Module({
  imports: [],
  controllers: [AnalyticsApiController],
  providers: [AnalyticsApiService],
})
export class AnalyticsApiModule {}
