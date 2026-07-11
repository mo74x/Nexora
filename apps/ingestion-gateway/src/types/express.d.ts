/**
 * Augments the Express Request type with custom properties
 * attached by guards and middleware in the ingestion gateway.
 */
declare module 'express' {
  interface Request {
    [x: string]: any;
    /** The tenant ID resolved from the API key by TenantIngestionGuard. */
    tenant?: string;
  }
}
