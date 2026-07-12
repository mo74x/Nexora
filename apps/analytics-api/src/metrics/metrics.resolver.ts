/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { HourlyEventMetric } from './models/metric.model';
import { Tenant } from './models/tenant.model';
import { PrismaService } from '../prisma/prisma.service';
import { TenantDataLoader } from './tenant.dataloader';

@Resolver(() => HourlyEventMetric)
export class MetricsResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantLoader: TenantDataLoader,
  ) {}

  //fetch metrics, optionally filtering by event type
  @Query(() => [HourlyEventMetric], { name: 'getHourlyMetrics' })
  async getHourlyMetrics(
    @Args('eventType', { nullable: true }) eventType?: string,
    @Args('limit', { defaultValue: 100 }) limit?: number,
  ) {
    return this.prisma.hourlyEventMetric.findMany({
      where: eventType ? { eventType } : undefined,
      orderBy: { hourTimestamp: 'desc' },
      take: limit,
    });
  }

  // tells GraphQL how to populate the `tenant` field on a metric
  @ResolveField('tenant', () => Tenant)
  async getTenant(@Parent() metric: HourlyEventMetric) {
    // pass the ID to our batching DataLoader
    return this.tenantLoader.loader.load(metric.tenantId);
  }
}
