/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from './models/tenant.model';

//Scope.REQUEST so a new cache/batch is created for every incoming HTTP request.
@Injectable({ scope: Scope.REQUEST })
export class TenantDataLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly loader = new DataLoader<string, Tenant | null>(
    async (tenantIds: readonly string[]) => {
      //Fetch all unique tenants in one single database round-trip
      const tenants = await this.prisma.tenant.findMany({
        where: {
          id: { in: [...tenantIds] },
        },
      });

      // Map the results back to the exact order DataLoader
      const tenantMap = new Map(tenants.map((t) => [t.id, t]));
      return tenantIds.map((id) => tenantMap.get(id) || null);
    },
  );
}
