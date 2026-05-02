import Redis from "ioredis";

const redisUrl = import.meta.env.REDIS_URL || "redis://localhost:6379";

function createClient(db: number) {
  const client = new Redis(redisUrl, { db });
  client.on("error", (err) => console.warn(`[Redis DB${db}]`, err.message));
  return client;
}

export const cacheDb = createClient(0);
export const jobDb = createClient(1);

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    let path = u.pathname;
    if (path.endsWith("/") && path.length > 1) path = path.slice(0, -1);
    return `${host}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function cacheKey(normUrl: string): string {
  return `roast:cache:${normUrl}`;
}

export async function getCached(normUrl: string): Promise<null | {
  site: string;
  cats: string[];
  lang: string;
  result: Record<string, unknown>;
  cachedAt: string;
  translations?: Record<string, { result: Record<string, unknown>; translatedAt: string }>;
}> {
  try {
    const raw = await cacheDb.get(cacheKey(normUrl));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCached(
  normUrl: string,
  data: {
    site: string;
    cats: string[];
    lang: string;
    result: Record<string, unknown>;
    cachedAt: string;
    translations?: Record<string, { result: Record<string, unknown>; translatedAt: string }>;
  },
) {
  await cacheDb.setex(cacheKey(normUrl), 7 * 24 * 3600, JSON.stringify(data));
}

export function jobIdKey(normUrl: string, locale: string): string {
  return `roast:active:${normUrl}:${locale}`;
}

export async function getJobId(normUrl: string, locale: string): Promise<string | null> {
  try {
    return await jobDb.get(jobIdKey(normUrl, locale));
  } catch {
    return null;
  }
}

export async function setJobId(normUrl: string, locale: string, jobId: string) {
  await jobDb.setex(jobIdKey(normUrl, locale), 3600, jobId);
}

export async function createJob(jobId: string, fields: Record<string, string>) {
  await jobDb.hset(`roast:job:${jobId}`, { ...fields, createdAt: new Date().toISOString() });
  await jobDb.expire(`roast:job:${jobId}`, 3600);
}

export async function updateJob(jobId: string, fields: Record<string, string>) {
  await jobDb.hset(`roast:job:${jobId}`, fields);
}

export async function getJob(jobId: string): Promise<null | Record<string, string>> {
  try {
    const data = await jobDb.hgetall(`roast:job:${jobId}`);
    return Object.keys(data).length ? data : null;
  } catch {
    return null;
  }
}

export function generateJobId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
