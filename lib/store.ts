import { kv } from "@vercel/kv";

export type LinkEntry = {
  id: string;
  url: string;
  title: string;
  tag: string;
  createdAt: number;
};

const KEY = "linkvault:entries";

export async function listEntries(): Promise<LinkEntry[]> {
  const entries = (await kv.get<LinkEntry[]>(KEY)) || [];
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addEntry(entry: LinkEntry): Promise<void> {
  const entries = (await kv.get<LinkEntry[]>(KEY)) || [];
  entries.push(entry);
  await kv.set(KEY, entries);
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = (await kv.get<LinkEntry[]>(KEY)) || [];
  await kv.set(
    KEY,
    entries.filter((e) => e.id !== id)
  );
}

export function checkAuth(headerValue: string | null): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true; // no password set = open (local dev convenience)
  return headerValue === expected;
}
