/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RateLimiterService } from '../rate-limiting/rate-limiter.service';
import { Request } from 'express';

@Injectable()
export class TenantIngestionGuard implements CanActivate {
  constructor(private readonly rateLimiter: RateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new HttpException(
        'Missing x-api-key header',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // TODO: In the next step, we will use our gRPC client here to call the
    // Processing Engine and convert this `apiKey` into a real `tenantId` and `capacity`.
    // For now, we mock the gRPC response to test the rate limiter.

    const mockTenantConfig = {
      tenantId: `tenant_${apiKey}`,
      maxCapacity: 100,
      refillRate: 10,
      isValid: true,
    };

    if (!mockTenantConfig.isValid) {
      throw new HttpException('Invalid API Key', HttpStatus.UNAUTHORIZED);
    }

    // Execute the atomic Redis Lua script
    const rateLimit = await this.rateLimiter.consume(
      mockTenantConfig.tenantId,
      mockTenantConfig.maxCapacity,
      mockTenantConfig.refillRate,
    );

    // Attach tenant info to the request for the controller to use
    request.tenant = mockTenantConfig.tenantId;

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          error: 'TOO_MANY_REQUESTS',
          message: 'Tenant ingestion rate limit exceeded. Please slow down.',
          remainingTokens: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
