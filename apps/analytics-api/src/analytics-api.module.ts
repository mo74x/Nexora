import { Module } from '@nestjs/common';
import { AnalyticsApiController } from './analytics-api.controller';
import { AnalyticsApiService } from './analytics-api.service';
import { PrismaService } from './prisma/prisma.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { MetricsResolver } from './metrics/metrics.resolver';
import { TenantDataLoader } from './metrics/tenant.dataloader';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/analytics-api/src/schema.gql'),
      playground: true, // Enables the interactive Apollo Studio UI at /graphql
    }),
  ],
  controllers: [AnalyticsApiController],
  providers: [
    AnalyticsApiService,
    PrismaService,
    MetricsResolver,
    TenantDataLoader,
  ],
})
export class AnalyticsApiModule {}
