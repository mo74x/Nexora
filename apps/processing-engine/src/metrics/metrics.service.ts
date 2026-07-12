/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RawIngestedEvent {
  eventId: string;
  tenantId: string;
  eventType: string;
  source: string;
  data: Record<string, any>;
  ingestedAt: string;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  //Processes a single raw event from the stream and aggregates it.

  async aggregateHourlyMetric(event: RawIngestedEvent): Promise<void> {
    try {
      //Truncate the ingestion timestamp to the top of the hour
      const date = new Date(event.ingestedAt);
      date.setMinutes(0, 0, 0);
      const hourTimestamp = date;

      //Perform an atomic database UPSERT utilizing our composite unique constraint.
      await this.prisma.hourlyEventMetric.upsert({
        where: {
          tenantId_eventType_source_hourTimestamp: {
            tenantId: event.tenantId,
            eventType: event.eventType,
            source: event.source,
            hourTimestamp,
          },
        },
        update: {
          eventCount: {
            increment: 1, // Atomic database-level increment operation
          },
        },
        create: {
          tenantId: event.tenantId,
          eventType: event.eventType,
          source: event.source,
          hourTimestamp,
          eventCount: 1,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to aggregate metric for event ${event.eventId}: ${error.message}`,
      );
    }
  }
}
