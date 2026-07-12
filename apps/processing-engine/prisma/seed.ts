/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import 'dotenv/config';
import { PrismaClient, TenantStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding StreamGate database...');

  //a high-tier enterprise tenant
  const tenant1 = await prisma.tenant.upsert({
    where: { apiKey: 'sk_live_enterprise_12345' },
    update: {},
    create: {
      name: 'Acme Corp (Enterprise)',
      apiKey: 'sk_live_enterprise_12345',
      status: TenantStatus.ACTIVE,
      maxRequestsPerWindow: 10000,
      rateLimitWindowSec: 60, // 10,000 requests per minute
    },
  });

  //a free-tier tenant with strict limits
  const tenant2 = await prisma.tenant.upsert({
    where: { apiKey: 'sk_live_startup_99999' },
    update: {},
    create: {
      name: 'Startup Inc (Free Tier)',
      apiKey: 'sk_live_startup_99999',
      status: TenantStatus.ACTIVE,
      maxRequestsPerWindow: 100,
      rateLimitWindowSec: 60, // 100 requests per minute
    },
  });

  console.log(`Created Tenant 1: ${tenant1.name}`);
  console.log(`Created Tenant 2: ${tenant2.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
