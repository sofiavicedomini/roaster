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
  translations?: Record<
    string,
    { result: Record<string, unknown>; translatedAt: string }
  >;
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
    translations?: Record<
      string,
      { result: Record<string, unknown>; translatedAt: string }
    >;
  },
) {
  await cacheDb.setex(cacheKey(normUrl), 7 * 24 * 3600, JSON.stringify(data));
}

export function jobIdKey(normUrl: string, locale: string): string {
  return `roast:active:${normUrl}:${locale}`;
}

export async function getJobId(
  normUrl: string,
  locale: string,
): Promise<string | null> {
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
  const now = new Date().toISOString();
  await jobDb.hset(`roast:job:${jobId}`, {
    ...fields,
    createdAt: now,
    lastUpdate: now,
    iterationCount: "0",
  });
  await jobDb.expire(`roast:job:${jobId}`, 3600);
}

export async function updateJob(jobId: string, fields: Record<string, string>) {
  const updates: Record<string, string> = {
    ...fields,
    lastUpdate: new Date().toISOString(),
  };
  if (fields.progress) {
    const job = await getJob(jobId);
    if (job) {
      const currentCount = parseInt(job.iterationCount || "0", 10);
      if (currentCount > 0) {
        updates.iterationCount = String(currentCount);
      }
    }
  }
  await jobDb.hset(`roast:job:${jobId}`, updates);
}

export async function incrementIteration(jobId: string) {
  const job = await getJob(jobId);
  if (job) {
    const currentCount = parseInt(job.iterationCount || "0", 10);
    await jobDb.hset(`roast:job:${jobId}`, {
      iterationCount: String(currentCount + 1),
      lastUpdate: new Date().toISOString(),
    });
  }
}

export async function resetJobProgress(jobId: string) {
  const job = await getJob(jobId);
  if (job) {
    await jobDb.hset(`roast:job:${jobId}`, {
      iterationCount: "0",
      lastUpdate: new Date().toISOString(),
    });
  }
}

export async function getJob(
  jobId: string,
): Promise<null | Record<string, string>> {
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

export async function saveRanking(
  uuid: string,
  data: {
    url: string;
    normUrl: string;
    score: number;
    verdict: string;
    cats: string[];
    locale: string;
    completedAt: string;
    result: Record<string, unknown>;
  },
) {
  const ts = new Date(data.completedAt).getTime();
  await cacheDb.zadd("roast:rankings", ts, uuid);
  await cacheDb.setex(
    `roast:ranking:${uuid}`,
    30 * 24 * 3600,
    JSON.stringify(data),
  );
  // Keep only last 100 rankings
  await cacheDb.zremrangebyrank("roast:rankings", 0, -101);
}

export async function getRankings(limit = 20): Promise<
  Array<{
    uuid: string;
    url: string;
    normUrl: string;
    score: number;
    verdict: string;
    cats: string[];
    locale: string;
    completedAt: string;
  } | null>
> {
  try {
    const uuids = await cacheDb.zrevrange("roast:rankings", 0, limit - 1);
    if (!uuids.length) return [];
    return Promise.all(
      uuids.map(async (uuid) => {
        const raw = await cacheDb.get(`roast:ranking:${uuid}`);
        if (!raw) return null;
        const { result, ...summary } = JSON.parse(raw);
        void result;
        return { uuid, ...summary };
      }),
    );
  } catch {
    return [];
  }
}

export async function getRanking(uuid: string): Promise<null | {
  uuid: string;
  url: string;
  normUrl: string;
  score: number;
  verdict: string;
  cats: string[];
  locale: string;
  completedAt: string;
  result: Record<string, unknown>;
}> {
  try {
    const raw = await cacheDb.get(`roast:ranking:${uuid}`);
    if (!raw) return null;
    return { uuid, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export async function resumeJob(
  jobId: string,
  newCategories: string[],
): Promise<{ shouldResume: boolean; job: Record<string, string> | null }> {
  const job = await getJob(jobId);
  if (!job) {
    return { shouldResume: false, job: null };
  }

  if (job.status === "completed") {
    return { shouldResume: false, job };
  }

  if (job.status === "failed") {
    await resetJobProgress(jobId);
    return {
      shouldResume: true,
      job: { ...job, status: "pending", error: "" },
    };
  }

  if (job.status === "pending" || job.status === "processing") {
    const lastUpdate = new Date(job.lastUpdate || job.createdAt);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 60000;

    if (minutesSinceUpdate > 5) {
      const currentIteration = parseInt(job.iterationCount || "0", 10);
      if (currentIteration >= 3) {
        await resetJobProgress(jobId);
        await updateJob(jobId, {
          status: "pending",
          progress: "Resuming from stuck state",
          cats: newCategories.join(","),
        });
        return { shouldResume: true, job: { ...job, status: "pending" } };
      }
    }
  }

  return { shouldResume: false, job };
}


export async function getRankingsCount(): Promise<number> {
  try {
    return await cacheDb.zcard("roast:rankings");
  } catch {
    return 0;
  }
}
