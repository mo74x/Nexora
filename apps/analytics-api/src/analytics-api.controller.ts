import { Controller, Get } from '@nestjs/common';
import { AnalyticsApiService } from './analytics-api.service';

@Controller()
export class AnalyticsApiController {
  constructor(private readonly analyticsApiService: AnalyticsApiService) {}

  @Get()
  getHello(): string {
    return this.analyticsApiService.getHello();
  }
}
