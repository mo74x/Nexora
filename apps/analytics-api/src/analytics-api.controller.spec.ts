import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsApiController } from './analytics-api.controller';
import { AnalyticsApiService } from './analytics-api.service';

describe('AnalyticsApiController', () => {
  let analyticsApiController: AnalyticsApiController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsApiController],
      providers: [AnalyticsApiService],
    }).compile();

    analyticsApiController = app.get<AnalyticsApiController>(AnalyticsApiController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(analyticsApiController.getHello()).toBe('Hello World!');
    });
  });
});
