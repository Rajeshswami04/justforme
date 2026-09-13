"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LinkEntry = {
  id: string;
  url: string;
  title: string;
  tag: string;
  createdAt: number;
};

function Panel({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        border: "1px solid var(--border)",
        padding: "22px 16px 16px",
        marginBottom: 24,
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: -10,
          left: 12,
          background: "var(--bg)",
          padding: "0 8px",
          fontSize: 12,
          letterSpacing: 1,
          color: "var(--amber-bright)",
        }}
      >
        [ {label} ]
      </span>
      {children}
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toISOString().slice(0, 10);
}

export default function Home() {
  const [password, setPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [entries, setEntries] = useState<LinkEntry[] | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [clock, setClock] = useState("");
  const urlFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("linkvault_pw");
    if (saved) setPassword(saved);
  }, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().replace("T", " ").slice(0, 19) + "Z");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function load(pw: string) {
    const res = await fetch("/api/links", {
      headers: { "x-app-password": pw },
    });
    if (res.status === 401) {
      setAuthError("access denied — wrong passphrase");
      localStorage.removeItem("linkvault_pw");
      setPassword(null);
      return;
    }
    const data = await res.json();
    setEntries(data.entries);
  }

  useEffect(() => {
    if (password !== null) {
      setAuthError("");
      load(password);
    }
  }, [password]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    localStorage.setItem("linkvault_pw", passwordInput.trim());
    setPassword(passwordInput.trim());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim() || password === null) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-password": password,
        },
        body: JSON.stringify({ url: urlInput.trim(), tag: tagInput.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "save failed");
      }
      const data = await res.json();
      setEntries((prev) => (prev ? [data.entry, ...prev] : [data.entry]));
      setUrlInput("");
      setTagInput("");
      urlFieldRef.current?.focus();
    } catch (err: any) {
      setFormError(`error: ${err.message || "could not save link"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (password === null) return;
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
    await fetch(`/api/links/${id}`, {
      method: "DELETE",
      headers: { "x-app-password": password },
    });
  }

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (!filter.trim()) return entries;
    const f = filter.trim().toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(f) ||
        e.url.toLowerCase().includes(f) ||
        e.tag.toLowerCase().includes(f)
    );
  }, [entries, filter]);

  // ---- LOGIN SCREEN ----
  if (password === null) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div style={{ width: "100%", maxWidth: 480 }}>
          <pre
            style={{
              fontSize: 12,
              lineHeight: 1.3,
              color: "var(--amber-bright)",
              margin: "0 0 24px",
              textShadow: "0 0 8px rgba(255,182,64,0.35)",
            }}
          >
{String.raw`  _ _       _                _ _
 | (_)_ __ | | ___   ____ _ _ _| | |_
 | | | '_ \| |/ / \ / / _\` | | | | __|
 | | | | | |   <\ V / (_| | |_| | |_
 |_|_|_| |_|_|\_\\_/ \__,_|\__,_|\__|`}
          </pre>
          <Panel label="AUTH_REQUIRED">
            <p style={{ margin: "0 0 16px", color: "var(--amber-dim)", fontSize: 13 }}>
              enter passphrase to unlock your saved links
            </p>
            <form onSubmit={handleLogin} style={{ display: "flex", gap: 8 }}>
              <span style={{ paddingTop: 10 }}>$</span>
              <input
                autoFocus
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="passphrase"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  padding: "8px 4px",
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                style={{
                  background: "var(--amber-dimmer)",
                  border: "1px solid var(--border)",
                  color: "var(--amber-bright)",
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                unlock
              </button>
            </form>
            {authError && (
              <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>
                {authError}
              </p>
            )}
          </Panel>
          <p style={{ color: "var(--amber-dimmer)", fontSize: 12 }}>
            first time here? use the APP_PASSWORD you set in your Vercel
            project's environment variables.
          </p>
        </div>
      </main>
    );
  }

  // ---- MAIN APP ----
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: "1px solid var(--border)",
          paddingBottom: 12,
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h1
          style={{
            fontSize: 18,
            letterSpacing: 1,
            margin: 0,
            color: "var(--amber-bright)",
            textShadow: "0 0 8px rgba(255,182,64,0.3)",
          }}
        >
          linkvault<span className="blink">_</span>
        </h1>
        <div style={{ fontSize: 11, color: "var(--amber-dim)" }}>
          {clock} · {entries ? entries.length : 0} saved
        </div>
      </header>

      <Panel label="SAVE_LINK">
        <form onSubmit={handleAdd}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <span style={{ paddingTop: 10 }}>$</span>
            <input
              ref={urlFieldRef}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="paste a url — example.com/article"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "8px 4px",
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "var(--amber-dim)", fontSize: 13, paddingLeft: 16 }}>
              --tag
            </span>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="optional, e.g. recipes"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "6px 4px",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={saving || !urlInput.trim()}
              style={{
                background: "var(--amber-dimmer)",
                border: "1px solid var(--border)",
                color: "var(--amber-bright)",
                padding: "8px 18px",
                cursor: saving ? "default" : "pointer",
                opacity: saving || !urlInput.trim() ? 0.5 : 1,
              }}
            >
              {saving ? "saving…" : "save"}
            </button>
          </div>
          {formError && (
            <p style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>
              {formError}
            </p>
          )}
        </form>
      </Panel>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <span style={{ color: "var(--amber-dim)" }}>grep</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter by title, tag, or url…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            padding: "4px 4px",
            fontSize: 13,
            color: "var(--amber-dim)",
          }}
        />
      </div>

      {entries === null ? (
        <p style={{ color: "var(--amber-dim)" }}>loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--amber-dimmer)" }}>
          {entries.length === 0
            ? "no links saved yet — paste one above."
            : "no matches for that filter."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {filtered.map((entry) => (
            <li
              key={entry.id}
              style={{
                borderBottom: "1px solid var(--border)",
                padding: "12px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 14,
                    textDecoration: "none",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.title}
                </a>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--amber-dim)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.url}
                </div>
                <div style={{ fontSize: 11, color: "var(--amber-dimmer)", marginTop: 2 }}>
                  {entry.tag && <span>#{entry.tag} · </span>}
                  {timeAgo(entry.createdAt)}
                </div>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                title="rm"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--red)",
                  fontSize: 11,
                  padding: "4px 10px",
                  cursor: "pointer",
                  height: "fit-content",
                  flexShrink: 0,
                }}
              >
                rm
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
