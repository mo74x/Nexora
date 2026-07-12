/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Logger } from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';
import * as metricsService_1 from './metrics.service';

@Controller()
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(
    private readonly metricsService: metricsService_1.MetricsService,
  ) {}

  @MessagePattern('tenant.events.raw')
  async handleRawEventStream(
    @Payload() message: metricsService_1.RawIngestedEvent,
    @Ctx() context: KafkaContext,
  ) {
    const originalMessage = context.getMessage();

    // Defensive check: handle cases where Kafka sends an empty or malformed payload
    if (!message || !message.tenantId) {
      this.logger.warn(
        `Received empty or invalid payload on partition: ${context.getPartition()}`,
      );
      return;
    }

    // Pass down to the aggregator service
    await this.metricsService.aggregateHourlyMetric(message);
  }
}
