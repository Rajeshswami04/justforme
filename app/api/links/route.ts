import { NextRequest, NextResponse } from "next/server";
import { listEntries, addEntry, checkAuth, LinkEntry } from "@/lib/store";

export async function GET(req: NextRequest) {
  if (!checkAuth(req.headers.get("x-app-password"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const entries = await listEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchTitle(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (linkvault-bot)" },
    });
    clearTimeout(timeout);
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (match && match[1].trim()) {
      return match[1].trim().slice(0, 200);
    }
  } catch {
    // fall through to hostname fallback
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req.headers.get("x-app-password"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  let normalizedUrl = body.url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = "https://" + normalizedUrl;
  }
  try {
    new URL(normalizedUrl);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : await fetchTitle(normalizedUrl);

  const entry: LinkEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    url: normalizedUrl,
    title,
    tag:
      typeof body.tag === "string" && body.tag.trim()
        ? body.tag.trim().slice(0, 40)
        : "",
    createdAt: Date.now(),
  };

  try {
    await addEntry(entry);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
