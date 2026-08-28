import "server-only";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalSecurityState = globalThis as typeof globalThis & {
  __bageshwariRateLimits?: Map<string, RateLimitEntry>;
  __bageshwariActiveRequests?: number;
};

const rateLimits =
  globalSecurityState.__bageshwariRateLimits ?? new Map<string, RateLimitEntry>();
globalSecurityState.__bageshwariRateLimits = rateLimits;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Per-process fixed-window guard. Deployments with more than one instance must
 * replace the backing map with a shared store while keeping this contract.
 */
export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const current = rateLimits.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : current;

  entry.count += 1;
  rateLimits.set(key, entry);

  return {
    allowed: entry.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - entry.count),
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export async function withRequestConcurrencyLimit<T>(
  operation: () => Promise<T>,
  maxConcurrent = Number(process.env.REQUEST_CONCURRENCY_LIMIT || 32),
): Promise<T> {
  const active = globalSecurityState.__bageshwariActiveRequests ?? 0;
  if (active >= maxConcurrent) {
    throw new RequestCapacityError();
  }

  globalSecurityState.__bageshwariActiveRequests = active + 1;
  try {
    return await operation();
  } finally {
    globalSecurityState.__bageshwariActiveRequests = Math.max(
      0,
      (globalSecurityState.__bageshwariActiveRequests ?? 1) - 1,
    );
  }
}

export class RequestCapacityError extends Error {
  readonly status = 503;

  constructor() {
    super("The service is busy. Please retry shortly.");
    this.name = "RequestCapacityError";
  }
}

export function getClientAddress(
  request?: Request | { headers?: Headers | Record<string, string | undefined | null> } | null,
): string {
  if (!request || !request.headers) return "unknown";
  if (typeof (request.headers as Headers).get === "function") {
    const forwardedFor = (request.headers as Headers).get("x-forwarded-for");
    return forwardedFor?.split(",")[0]?.trim()
      || (request.headers as Headers).get("x-real-ip")
      || "unknown";
  }
  const headersObj = request.headers as Record<string, string | undefined | null>;
  const forwardedFor = headersObj["x-forwarded-for"];
  return forwardedFor?.split(",")[0]?.trim()
    || headersObj["x-real-ip"]
    || "unknown";
}
