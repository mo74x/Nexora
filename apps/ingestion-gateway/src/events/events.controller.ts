import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import * as eventsService_1 from './events.service';
import { TenantIngestionGuard } from '../guards/tenant-ingestion.guard';

@Controller('v1/ingest')
export class EventsController {
  constructor(private readonly eventsService: eventsService_1.EventsService) {}

  @Post()
  @UseGuards(TenantIngestionGuard)
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted: "We got it, but we haven't processed it yet"
  async ingestEvent(
    @Req() req: Request,
    @Body() payload: eventsService_1.IngestionPayload,
  ) {
    const tenantId = req['tenantId'] as string;

    // Dispatch to Kafka immediately
    const eventId = await this.eventsService.dispatchEvent(tenantId, payload);

    // Return an immediate acknowledgment with the tracking ID
    return {
      success: true,
      eventId,
      message: 'Event accepted for processing',
    };
  }
}
