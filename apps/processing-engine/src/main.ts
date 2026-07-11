/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ProcessingEngineModule } from './processing-engine.module';
import { TENANT_PACKAGE_NAME } from '@streamgate/contracts';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ProcessingEngineModule,
    {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:50051',
        package: TENANT_PACKAGE_NAME,
        protoPath: join(
          __dirname,
          '../../../libs/contracts/src/proto/tenant.proto',
        ),
      },
    },
  );
  await app.listen();
  console.log(
    'Processing Engine gRPC Microservice is listening on port 50051...',
  );
}
bootstrap();
