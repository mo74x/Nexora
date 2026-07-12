<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Apache%20Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white" alt="Kafka" />
  <img src="https://img.shields.io/badge/gRPC-244C5A?style=for-the-badge&logo=google&logoColor=white" alt="gRPC" />
  <img src="https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white" alt="GraphQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

# Nexora StreamGate

**A high-throughput, multi-tenant event ingestion and analytics platform** built with a microservices architecture. StreamGate accepts thousands of events per second, applies per-tenant rate limiting, streams data through Kafka for real-time processing, aggregates metrics into PostgreSQL, and exposes them via a GraphQL API — all built with NestJS in a monorepo.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Client"]
        A["HTTP POST /v1/ingest<br/><i>x-api-key header</i>"]
    end

    subgraph GW["Ingestion Gateway<br/><small>:3000</small>"]
        B["EventsController"]
        C["TenantIngestionGuard"]
        D["RateLimiterService"]
    end

    subgraph Infra["Infrastructure"]
        E["Redis<br/><small>Token Bucket</small>"]
        F["Redpanda / Kafka<br/><small>:19092</small>"]
        G["PostgreSQL<br/><small>:5432</small>"]
    end

    subgraph PE["Processing Engine<br/><small>gRPC :50051 + Kafka Consumer</small>"]
        H["TenantController<br/><small>gRPC</small>"]
        I["MetricsController<br/><small>Kafka Listener</small>"]
        J["MetricsService<br/><small>Hourly Aggregation</small>"]
    end

    subgraph AA["Analytics API<br/><small>:3000</small>"]
        K["GraphQL / Apollo<br/><small>/graphql</small>"]
        L["MetricsResolver"]
        M["TenantDataLoader<br/><small>Batched N+1 Solver</small>"]
    end

    A -->|"POST event"| B
    B --> C
    C -->|"gRPC ValidateTenantKey"| H
    H -->|"Prisma lookup"| G
    C -->|"Lua token bucket"| D
    D <-->|"HMGET / HMSET"| E
    C -->|"Allowed"| B
    B -->|"Emit to topic"| F
    F -->|"tenant.events.raw"| I
    I --> J
    J -->|"Atomic UPSERT"| G
    K --> L
    L -->|"findMany"| G
    L --> M
    M -->|"Batched findMany"| G

    style Client fill:#1a1a2e,stroke:#e94560,color:#fff
    style GW fill:#16213e,stroke:#0f3460,color:#fff
    style Infra fill:#0f3460,stroke:#533483,color:#fff
    style PE fill:#1a1a2e,stroke:#e94560,color:#fff
    style AA fill:#16213e,stroke:#0f3460,color:#fff
```

---

## Request Lifecycle

The journey of a single ingested event through the system:

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as Ingestion Gateway
    participant Guard as TenantIngestionGuard
    participant gRPC as Processing Engine (gRPC)
    participant Redis as Redis
    participant Kafka as Redpanda / Kafka
    participant PE as Processing Engine (Consumer)
    participant DB as PostgreSQL

    C->>GW: POST /v1/ingest {eventType, source, data}
    GW->>Guard: Execute guard pipeline
    Guard->>gRPC: ValidateTenantKey(apiKey)
    gRPC->>DB: SELECT * FROM Tenant WHERE apiKey = ?
    DB-->>gRPC: Tenant config (limits, status)
    gRPC-->>Guard: ValidateKeyResponse

    alt Tenant ACTIVE
        Guard->>Redis: Lua: takeTokens(tenantId, capacity, rate)
        Redis-->>Guard: {allowed: true, remaining: N}
        Guard-->>GW: Request allowed
        GW->>Kafka: emit("tenant.events.raw", enrichedEvent)
        GW-->>C: 202 Accepted {eventId}
        Kafka->>PE: Consume message
        PE->>DB: UPSERT HourlyEventMetric (atomic increment)
    else Rate Limit Exceeded
        Guard-->>C: 429 Too Many Requests
    else Invalid Key
        Guard-->>C: 401 Unauthorized
    end
```

---

## Project Structure

```
nexora-streamgate/
├── apps/
│   ├── ingestion-gateway/          # HTTP entry point for event ingestion
│   │   └── src/
│   │       ├── main.ts             # Bootstrap (port 3000)
│   │       ├── app.module.ts       # Root module: Redis, Kafka, gRPC client
│   │       ├── events/             # POST /v1/ingest controller & Kafka producer
│   │       ├── guards/             # TenantIngestionGuard (gRPC + rate limit)
│   │       ├── kafka/              # KafkaModule (producer client config)
│   │       ├── rate-limiting/      # Token bucket via Redis Lua scripts
│   │       ├── redis/              # IoRedis provider module
│   │       └── types/              # Shared TypeScript interfaces
│   │
│   ├── processing-engine/          # Kafka consumer + gRPC server
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Tenant & HourlyEventMetric models
│   │   │   ├── seed.ts             # Seeds enterprise & free-tier tenants
│   │   │   └── migrations/         # Database migration history
│   │   └── src/
│   │       ├── main.ts             # Dual transport: gRPC (:50051) + Kafka
│   │       ├── kafka/              # Kafka consumer module
│   │       ├── metrics/            # Stream consumer → hourly aggregation
│   │       ├── prisma/             # PrismaService provider
│   │       └── tenant/             # gRPC TenantService implementation
│   │
│   └── analytics-api/              # GraphQL API for querying aggregated data
│       └── src/
│           ├── main.ts             # Bootstrap (port 3000)
│           ├── analytics-api.module.ts  # Apollo GraphQL setup
│           ├── metrics/            # Resolvers, DataLoader, GraphQL models
│           ├── prisma/             # PrismaService provider
│           └── schema.gql          # Auto-generated GraphQL schema
│
├── libs/
│   └── contracts/                  # Shared protobuf definitions & generated code
│       └── src/
│           ├── index.ts            # Re-exports & package constants
│           └── proto/
│               ├── tenant.proto    # gRPC service definition
│               └── tenant.ts       # ts-proto generated TypeScript stubs
│
├── docker-compose.yml              # Redis, Redpanda (Kafka), PostgreSQL
├── load-test.js                    # k6 load testing script (200 VUs, 50s)
├── nest-cli.json                   # NestJS monorepo configuration
└── package.json                    # Scripts, dependencies, Jest config
```

---

## Microservices Breakdown

### 1. Ingestion Gateway

The **HTTP-facing** entry point that accepts events and routes them into the processing pipeline.

| Component | Role |
|---|---|
| `EventsController` | Exposes `POST /v1/ingest`, returns `202 Accepted` with a tracking `eventId` |
| `TenantIngestionGuard` | Validates `x-api-key` via gRPC, enforces per-tenant rate limits |
| `RateLimiterService` | Atomic **Token Bucket** algorithm executed as a Redis Lua script |
| `EventsService` | Enriches the payload and emits to `tenant.events.raw` Kafka topic |
| `KafkaModule` | Configures the KafkaJS producer client connected to Redpanda |
| `RedisModule` | Provides the IoRedis client with `streamgate:rl:` key prefix |

### 2. Processing Engine

A **dual-transport** microservice that acts as both a gRPC server and a Kafka consumer simultaneously.

| Component | Role |
|---|---|
| `TenantController` | gRPC `ValidateTenantKey` — looks up tenant by API key in PostgreSQL |
| `MetricsController` | Kafka `@MessagePattern('tenant.events.raw')` — consumes the event stream |
| `MetricsService` | Truncates timestamps to the hour and performs atomic `UPSERT` aggregation |
| `PrismaService` | Database access layer using Prisma ORM with the `@prisma/adapter-pg` driver |

### 3. Analytics API

A **GraphQL API** powered by Apollo Server for querying aggregated metrics.

| Component | Role |
|---|---|
| `MetricsResolver` | `getHourlyMetrics` query — fetches aggregated metrics with optional filters |
| `TenantDataLoader` | **DataLoader pattern** — batches N+1 tenant lookups into a single SQL query |
| `schema.gql` | Auto-generated schema exposing `HourlyEventMetric` and `Tenant` types |

---

## Data Model

```mermaid
erDiagram
    Tenant {
        UUID id PK
        String name
        String apiKey UK
        TenantStatus status
        Int maxRequestsPerWindow
        Int rateLimitWindowSec
        DateTime createdAt
        DateTime updatedAt
    }

    HourlyEventMetric {
        UUID id PK
        String tenantId FK
        String eventType
        String source
        DateTime hourTimestamp
        Int eventCount
        DateTime updatedAt
    }

    Tenant ||--o{ HourlyEventMetric : "has many"
```

**Key design decisions:**
- **Composite unique constraint** on `(tenantId, eventType, source, hourTimestamp)` enables atomic `UPSERT` during stream processing — no race conditions, no double counting
- **Index** on `(tenantId, hourTimestamp)` optimizes GraphQL dashboard queries
- **Index** on `apiKey` enables fast gRPC lookups during ingestion

---

## Rate Limiting Deep Dive

StreamGate uses a **Token Bucket** algorithm implemented as an **atomic Redis Lua script** for zero-contention, per-tenant rate limiting:

```
┌─────────────────────────────────────────────┐
│              Token Bucket                   │
│                                             │
│  Capacity: 10,000 (Enterprise)              │
│  Refill:   ~166.7 tokens/sec                │
│                                             │
│  ████████████████████░░░░  8,500 remaining  │
│                                             │
│  Each request consumes 1 token.             │
│  Tokens refill continuously over time.      │
│  Bucket never exceeds capacity.             │
└─────────────────────────────────────────────┘
```

| Tier | Capacity | Window | Effective Rate |
|---|---|---|---|
| Enterprise | 10,000 req | 60s | ~166 req/sec |
| Free Tier | 100 req | 60s | ~1.7 req/sec |

The Lua script runs atomically inside Redis — **no round-trip race conditions**, even under extreme concurrency.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & Docker Compose
- **k6** (optional, for load testing)

### 1. Clone & Install

```bash
git clone https://github.com/mo74x/Nexora.git
cd Nexora
npm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts:
| Service | Container | Port |
|---|---|---|
| Redis | `streamgate_redis` | `6379` |
| Redpanda (Kafka) | `streamgate_kafka` | `19092` |
| PostgreSQL | `streamgate_postgres` | `5432` |

### 3. Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/streamgate?schema=public"
```

### 4. Set Up the Database

```bash
# Run Prisma migrations
npx prisma migrate dev

# Seed tenant data (Enterprise + Free Tier)
npm run db:seed
```

### 5. Start the Services

Open separate terminals for each microservice:

```bash
# Terminal 1 — Processing Engine (gRPC + Kafka consumer)
npm run start:dev processing-engine

# Terminal 2 — Ingestion Gateway (HTTP API)
npm run start:dev ingestion-gateway

# Terminal 3 — Analytics API (GraphQL) [optional]
npm run start:dev analytics-api
```

---

## API Reference

### Ingestion Gateway

#### `POST /v1/ingest`

Ingest an event into the platform.

**Headers:**
| Header | Required | Description |
|---|---|---|
| `x-api-key` | Yes | Tenant API key for authentication and rate limiting |
| `Content-Type` | Yes | Must be `application/json` |

**Request Body:**
```json
{
  "eventType": "performance_metric",
  "source": "us-east-worker",
  "data": {
    "cpu_utilization": 78.5,
    "memory_free_bytes": 4294967296
  }
}
```

**Responses:**

| Status | Description |
|---|---|
| `202 Accepted` | Event accepted for async processing |
| `401 Unauthorized` | Invalid or missing API key |
| `429 Too Many Requests` | Tenant rate limit exceeded |

**Success Response:**
```json
{
  "success": true,
  "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Event accepted for processing"
}
```

---

### Analytics API (GraphQL)

Access the interactive **Apollo Playground** at `http://localhost:3000/graphql`.

**Example Query:**
```graphql
query {
  getHourlyMetrics(eventType: "performance_metric", limit: 10) {
    id
    eventType
    source
    hourTimestamp
    eventCount
    tenant {
      id
      name
      status
      maxRequestsPerWindow
    }
  }
}
```

---

## Load Testing

StreamGate includes a [k6](https://k6.io/) load test script that simulates real-world multi-tenant traffic:

```bash
k6 run load-test.js
```

**Test Profile:**
| Phase | Duration | Virtual Users |
|---|---|---|
| Ramp-up | 10s | 0 → 50 |
| Sustained load | 30s | 50 → 200 |
| Ramp-down | 10s | 200 → 0 |

**Traffic mix:** 70% Enterprise tenant / 30% Free-tier tenant — validating that rate limiting correctly throttles the free tier while the enterprise tier handles full throughput.

**Pass criteria:** p99 latency < 500ms for accepted (`202`) requests.

---

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| **Redpanda** over Apache Kafka | Single-binary, zero-JVM, Kafka-API compatible — ideal for local dev |
| **gRPC** for inter-service calls | Binary protocol with code-generated type-safe stubs via `ts-proto` |
| **Redis Lua scripts** for rate limiting | Atomic execution eliminates race conditions under concurrency |
| **Token Bucket** over Sliding Window | Allows controlled bursts while maintaining a steady average rate |
| **Prisma UPSERT** for aggregation | Atomic database-level increment avoids double-counting in concurrent consumers |
| **DataLoader** in Analytics API | Solves the GraphQL N+1 problem by batching tenant lookups per request |
| **NestJS Monorepo** | Shared contracts library, unified tooling, independent deployability |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run start:dev <app>` | Start a service in watch mode |
| `npm run build` | Build the full project |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests with Jest |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:seed` | Seed the database with sample tenants |
| `npm run proto:compile` | Regenerate TypeScript stubs from `.proto` files |

---

## License

This project is **UNLICENSED** — private and proprietary.
