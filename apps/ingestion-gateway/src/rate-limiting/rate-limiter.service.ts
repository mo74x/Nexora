/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
}

@Injectable()
export class RateLimiterService implements OnModuleInit {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  onModuleInit() {
    // This script implements a highly efficient Token Bucket.
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2]) -- tokens per second
      local now = tonumber(ARGV[3])
      local requested = tonumber(ARGV[4])

      local bucket = redis.call("HMGET", key, "tokens", "last_update")
      local tokens = tonumber(bucket[1])
      local last_update = tonumber(bucket[2])

      if not tokens then
        tokens = capacity
        last_update = now
      else
        local delta_seconds = math.max(0, now - last_update)
        local added_tokens = delta_seconds * refillRate
        tokens = math.min(capacity, tokens + added_tokens)
        last_update = now
      end

      local allowed = 0
      if tokens >= requested then
        tokens = tokens - requested
        allowed = 1
      end

      redis.call("HMSET", key, "tokens", tokens, "last_update", last_update)
      -- Set expiry to avoid keeping idle buckets forever (e.g., capacity / refillRate + some buffer)
      redis.call("EXPIRE", key, math.ceil(capacity / refillRate) + 60)

      return { allowed, tokens }
    `;

    // Define the custom command on the ioredis instance
    this.redis.defineCommand('takeTokens', {
      numberOfKeys: 1,
      lua: luaScript,
    });
  }

  /**
   * Attempts to consume a token from the tenant's bucket.
   */
  async consume(
    tenantId: string,
    capacity: number,
    refillRate: number,
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const requested = 1;

    // @ts-expect-error - takeTokens is dynamically defined in onModuleInit
    const result = await this.redis.takeTokens(
      tenantId, // KEYS[1]
      capacity, // ARGV[1]
      refillRate, // ARGV[2]
      now, // ARGV[3]
      requested, // ARGV[4]
    );

    return {
      allowed: result[0] === 1,
      remainingTokens: result[1],
    };
  }
}
