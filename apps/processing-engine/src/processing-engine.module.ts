import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { KafkaModule } from './kafka/kafka.module';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';
import { TenantController } from './tenant/tenant.controller';

@Module({
  imports: [KafkaModule],
  controllers: [MetricsController, TenantController],
  providers: [MetricsService, PrismaService],
})
export class ProcessingEngineModule {}
