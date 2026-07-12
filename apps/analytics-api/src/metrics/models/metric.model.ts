import { Field, ObjectType, ID, Int } from '@nestjs/graphql';
import { Tenant } from './tenant.model';

@ObjectType()
export class HourlyEventMetric {
  @Field(() => ID)
  id: string;

  @Field()
  tenantId: string;

  @Field()
  eventType: string;

  @Field()
  source: string;

  @Field()
  hourTimestamp: Date;

  @Field(() => Int)
  eventCount: number;

  //relational field resolved with DataLoader
  @Field(() => Tenant)
  tenant: Tenant;
}
