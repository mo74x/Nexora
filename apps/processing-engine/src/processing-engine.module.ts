import { Module } from '@nestjs/common';
import { ProcessingEngineController } from './processing-engine.controller';
import { ProcessingEngineService } from './processing-engine.service';

@Module({
  imports: [],
  controllers: [ProcessingEngineController],
  providers: [ProcessingEngineService],
})
export class ProcessingEngineModule {}
