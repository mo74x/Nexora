import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_CONSUMER_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'streamgate-processing-worker',
            brokers: [process.env.KAFKA_BROKER || 'localhost:19092'],
          },
          consumer: {
            groupId: 'streamgate-processing-group', // Enables horizontal scaling across multiple replicas
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
