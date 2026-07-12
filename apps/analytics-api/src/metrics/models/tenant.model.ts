import { Field, ObjectType, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Tenant {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  status: string;

  @Field(() => Int)
  maxRequestsPerWindow: number;
}
