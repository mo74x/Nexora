import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AnalyticsApiModule } from './analytics-api.module';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsApiModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
