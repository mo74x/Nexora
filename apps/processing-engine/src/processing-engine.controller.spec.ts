import { Test, TestingModule } from '@nestjs/testing';
import { ProcessingEngineController } from './processing-engine.controller';
import { ProcessingEngineService } from './processing-engine.service';

describe('ProcessingEngineController', () => {
  let processingEngineController: ProcessingEngineController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ProcessingEngineController],
      providers: [ProcessingEngineService],
    }).compile();

    processingEngineController = app.get<ProcessingEngineController>(ProcessingEngineController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(processingEngineController.getHello()).toBe('Hello World!');
    });
  });
});
