/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RateLimiterService } from '../rate-limiting/rate-limiter.service';
import { Request } from 'express';
import {
  TenantServiceClient,
  TENANT_SERVICE_NAME,
} from '@streamgate/contracts';

@Injectable()
export class TenantIngestionGuard implements CanActivate, OnModuleInit {
  private tenantService: TenantServiceClient;

  constructor(
    @Inject('TENANT_GRPC_CLIENT') private readonly client: ClientGrpc,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  onModuleInit() {
    // Dynamically mirror the gRPC stub interface from our compiled library
    this.tenantService =
      this.client.getService<TenantServiceClient>(TENANT_SERVICE_NAME);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new HttpException(
        'Missing x-api-key header',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      // 1. Dispatch high-speed gRPC call to Processing Engine to validate the key
      // Wrap the Observable response in firstValueFrom to leverage async/await cleanly
      const tenantConfig = await firstValueFrom(
        this.tenantService.validateTenantKey({ apiKey }),
      );

      if (
        !tenantConfig ||
        !tenantConfig.isValid ||
        tenantConfig.status !== 'ACTIVE'
      ) {
        throw new HttpException(
          'Invalid or suspended API Key',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 2. Feed the retrieved configuration directly into the Atomic Redis Lua script
      const rateLimit = await this.rateLimiter.consume(
        tenantConfig.tenantId,
        tenantConfig.maxRequestsPerWindow, // Capacity
        // Calculate fill rate (e.g., tokens per second) based on window
        tenantConfig.maxRequestsPerWindow / tenantConfig.rateLimitWindowSec,
      );

      if (!rateLimit.allowed) {
        throw new HttpException(
          {
            error: 'TOO_MANY_REQUESTS',
            message: 'Tenant ingestion rate limit exceeded.',
            remainingTokens: rateLimit.remainingTokens,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 3. Attach hydrated metadata to the request pipeline for down-stream processing
      request['tenantId'] = tenantConfig.tenantId;
      return true;
    } catch (err) {
      // Gracefully handle gRPC connection failures or downstream exceptions
      if (err instanceof HttpException) throw err;

      console.error('TenantIngestionGuard error:', err);

      throw new HttpException(
        'Internal gateway routing error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
