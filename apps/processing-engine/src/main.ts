import { NestFactory } from '@nestjs/core';
import { ProcessingEngineModule } from './processing-engine.module';

async function bootstrap() {
  const app = await NestFactory.create(ProcessingEngineModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
