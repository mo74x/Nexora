import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_PRODUCER_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'streamgate-gateway',
            brokers: [process.env.KAFKA_BROKER || 'localhost:19092'],
            //prod, configure SASL/SSL
          },
          producer: {
            // prod, topics should be provisioned via IaC (Terraform)
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
