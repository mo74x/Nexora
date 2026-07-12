/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import * as contracts from '@streamgate/contracts';
import { TenantStatus } from '@prisma/client';

@Controller()
export class TenantController {
  constructor(private readonly prisma: PrismaService) {}

  @GrpcMethod(contracts.TENANT_SERVICE_NAME, 'ValidateTenantKey')
  async validateTenantKey(
    data: contracts.ValidateKeyRequest,
  ): Promise<contracts.ValidateKeyResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { apiKey: data.apiKey },
    });

    if (!tenant) {
      return {
        isValid: false,
        tenantId: '',
        rateLimitWindowSec: 0,
        maxRequestsPerWindow: 0,
        status: 'REVOKED',
      };
    }

    return {
      isValid: true,
      tenantId: tenant.id,
      rateLimitWindowSec: tenant.rateLimitWindowSec,
      maxRequestsPerWindow: tenant.maxRequestsPerWindow,
      status: tenant.status, // ACTIVE, SUSPENDED, etc.
    };
  }
}
