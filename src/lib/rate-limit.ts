// In-memory sliding window rate limiter.
// Each PM2 worker has its own store — for true per-IP sharing across workers use Redis.
type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Returns true if the request is allowed, false if the rate limit is exceeded.
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

export function getClientIp(request: { headers: { get: (h: string) => string | null } }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
