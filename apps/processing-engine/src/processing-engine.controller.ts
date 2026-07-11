import { Controller, Get } from '@nestjs/common';
import { ProcessingEngineService } from './processing-engine.service';

@Controller()
export class ProcessingEngineController {
  constructor(private readonly processingEngineService: ProcessingEngineService) {}

  @Get()
  getHello(): string {
    return this.processingEngineService.getHello();
  }
}
