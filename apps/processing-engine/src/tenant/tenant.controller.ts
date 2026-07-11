import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import * as contracts from '@streamgate/contracts';

@Controller()
export class TenantController {
  @GrpcMethod(contracts.TENANT_SERVICE_NAME, 'ValidateTenantKey')
  validateTenantKey(
    data: contracts.ValidateKeyRequest,
  ): contracts.ValidateKeyResponse {
    // Mock database evaluation (we will bind Prisma here during database phase)
    if (data.apiKey === 'nexora_super_secret_key') {
      return {
        isValid: true,
        tenantId: 'tenant_uuid_production_01',
        rateLimitWindowSec: 60,
        maxRequestsPerWindow: 5000,
        status: 'ACTIVE',
      };
    }

    return {
      isValid: false,
      tenantId: '',
      rateLimitWindowSec: 0,
      maxRequestsPerWindow: 0,
      status: 'REVOKED',
    };
  }
}
