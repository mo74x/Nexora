/* eslint-disable @typescript-eslint/no-floating-promises */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ProcessingEngineModule } from './processing-engine.module';
import { TENANT_PACKAGE_NAME } from '@streamgate/contracts';

async function bootstrap() {
  const app = await NestFactory.create(ProcessingEngineModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:50051',
      package: TENANT_PACKAGE_NAME,
      protoPath: join(
        __dirname,
        '../../../libs/contracts/src/proto/tenant.proto',
      ),
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:19092'],
      },
      consumer: {
        groupId: 'streamgate-processing-group',
      },
    },
  });

  // Start all connected microservices concurrently
  await app.startAllMicroservices();
  console.log(
    'Processing Engine running with dual gRPC & Kafka listeners active.',
  );
}
bootstrap();
