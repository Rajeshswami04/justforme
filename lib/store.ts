import { Redis } from "@upstash/redis";

export type LinkEntry = {
  id: string;
  url: string;
  title: string;
  tag: string;
  createdAt: number;
};

const KEY = "linkvault:entries";
const NO_DATABASE_MESSAGE =
  "no database connected — attach a Redis store to this project on Vercel";

function createRedisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

const redis = createRedisClient();

function getRedis(): Redis {
  if (!redis) {
    throw new Error(NO_DATABASE_MESSAGE);
  }

  return redis;
}

export async function listEntries(): Promise<LinkEntry[]> {
  const entries = (await getRedis().get<LinkEntry[]>(KEY)) || [];
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addEntry(entry: LinkEntry): Promise<void> {
  const entries = (await getRedis().get<LinkEntry[]>(KEY)) || [];
  entries.push(entry);
  await getRedis().set(KEY, entries);
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = (await getRedis().get<LinkEntry[]>(KEY)) || [];
  await getRedis().set(
    KEY,
    entries.filter((e) => e.id !== id)
  );
}

export function checkAuth(headerValue: string | null): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true; // no password set = open (local dev convenience)
  return headerValue === expected;
}
