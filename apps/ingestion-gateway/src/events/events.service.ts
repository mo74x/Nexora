/* eslint-disable @typescript-eslint/require-await */
import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';

export interface IngestionPayload {
  eventType: string;
  source: string;
  data: Record<string, any>;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('KAFKA_PRODUCER_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Connect the producer explicitly when the app starts
    await this.kafkaClient.connect();
  }

  async onModuleDestroy() {
    // Graceful shutdown
    await this.kafkaClient.close();
  }

  //Fires the event into Kafka without waiting for processing.
  async dispatchEvent(
    tenantId: string,
    payload: IngestionPayload,
  ): Promise<string> {
    const eventId = randomUUID();

    const enrichedEvent = {
      eventId,
      tenantId,
      eventType: payload.eventType,
      source: payload.source,
      data: payload.data,
      ingestedAt: new Date().toISOString(),
    };
    this.kafkaClient.emit('tenant.events.raw', {
      key: tenantId,
      value: JSON.stringify(enrichedEvent),
    });

    return eventId;
  }
}
