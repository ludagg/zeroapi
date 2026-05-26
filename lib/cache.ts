import Redis from "ioredis";

/**
 * Thin cache abstraction backed by Redis when REDIS_URL is set,
 * falling back to a Map in-process. The fallback is single-instance
 * (fine for `pnpm dev`, not for multi-pod prod — hence the warning
 * in .env.production.example).
 */

let _redis: Redis | null = null;
let _redisFailed = false;
const _mem = new Map<string, { value: string; expiresAt: number }>();

function client(): Redis | null {
  if (_redisFailed) return null;
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    _redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    _redis.on("error", (err) => {
      console.warn("[cache] Redis error, falling back to memory:", err.message);
      _redisFailed = true;
      _redis = null;
    });
    return _redis;
  } catch (err) {
    console.warn("[cache] Redis init failed:", err);
    _redisFailed = true;
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const r = client();
  if (r) {
    try {
      return await r.get(key);
    } catch {
      // fallthrough to memory
    }
  }
  const hit = _mem.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    _mem.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const r = client();
  if (r) {
    try {
      await r.set(key, value, "EX", ttlSeconds);
      return;
    } catch {
      // fallthrough to memory
    }
  }
  _mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const r = client();
  if (r) {
    try {
      if (keys.length) await r.del(...keys);
    } catch {
      // fallthrough
    }
  }
  for (const k of keys) _mem.delete(k);
}
