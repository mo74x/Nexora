import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { RedisModule } from './redis/redis.module';
import { RateLimiterService } from './rate-limiting/rate-limiter.service';
import { TenantIngestionGuard } from './guards/tenant-ingestion.guard';
import { KafkaModule } from './kafka/kafka.module';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { TENANT_PACKAGE_NAME } from '@streamgate/contracts';

@Module({
  imports: [
    RedisModule,
    KafkaModule,
    ClientsModule.register([
      {
        name: 'TENANT_GRPC_CLIENT',
        transport: Transport.GRPC,
        options: {
          url: process.env.PROCESSING_ENGINE_GRPC_URL || 'localhost:50051',
          package: TENANT_PACKAGE_NAME,
          // Point directly to the shared library proto file
          protoPath: join(
            __dirname,
            '../../../libs/contracts/src/proto/tenant.proto',
          ),
        },
      },
    ]),
  ],
  providers: [
    RateLimiterService,
    TenantIngestionGuard,
    EventsController,
    EventsService,
  ],
  exports: [ClientsModule, RateLimiterService, TenantIngestionGuard],
})
export class AppModule {}
