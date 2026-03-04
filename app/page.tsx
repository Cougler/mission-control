"use client";

import { useEffect, useState, useCallback } from "react";
import type { DashboardData, MCPServer, Skill, Project, Session } from "@/lib/data";

// ── Utilities ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Section Card ──────────────────────────────────────────────────────────────

function Card({ title, icon, hint, children, className = "" }: {
  title: string;
  icon: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border flex flex-col ${className}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b text-xs font-semibold tracking-widest uppercase"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
        <span>{icon}</span>
        <span>{title}</span>
        {hint && <span className="ml-auto">{hint}</span>}
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

// ── MCP Servers ────────────────────────────────────────────────────────────────

function MCPServers({ servers }: { servers: MCPServer[] }) {
  if (!servers.length) {
    return <p className="px-4 py-4 text-xs" style={{ color: "var(--muted)" }}>No MCP servers configured.</p>;
  }
  return (
    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
      {servers.map((s) => (
        <div key={s.name} className="flex items-center gap-3 px-4 py-3">
          <span
            className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
            style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ color: "var(--text)" }}>{s.name}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ background: "var(--surface2)", color: "var(--blue)", border: "1px solid var(--border2)" }}
              >
                {s.type}
              </span>
            </div>
            <div className="mt-0.5 truncate text-xs" style={{ color: "var(--dim)" }}>
              {s.endpoint}
            </div>
          </div>
          <span className="text-[10px] flex-shrink-0" style={{ color: "var(--green)" }}>● connected</span>
        </div>
      ))}
    </div>
  );
}

// ── Skills ────────────────────────────────────────────────────────────────────

function SkillsRegistry({ skills }: { skills: Skill[] }) {
  if (!skills.length) {
    return <p className="px-4 py-4 text-xs" style={{ color: "var(--muted)" }}>No custom skills installed.</p>;
  }
  return (
    <table>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {["Skill", "Invoke", "Added"].map((h) => (
            <th key={h} className="px-4 py-2 text-[10px] tracking-widest uppercase" style={{ color: "var(--muted)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {skills.map((sk) => (
          <tr
            key={sk.name}
            className="transition-colors"
            style={{ borderBottom: "1px solid var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <td className="px-4 py-3">
              <div className="font-semibold" style={{ color: "var(--text)" }}>{sk.name}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--dim)" }}>
                {sk.description}
              </div>
            </td>
            <td className="px-4 py-3">
              <span
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--surface2)", color: "var(--teal)", border: "1px solid var(--border2)" }}
              >
                {sk.invoke}
              </span>
            </td>
            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--dim)" }}>
              {sk.added}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Projects ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "var(--green)",
  paused: "var(--yellow)",
  archived: "var(--muted)",
};

function Projects({ projects }: { projects: Project[] }) {
  if (!projects.length) {
    return <p className="px-4 py-4 text-xs" style={{ color: "var(--muted)" }}>No projects found in ~/Apps.</p>;
  }
  return (
    <table>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {["Project", "Description", "Stack", "Status", "Last Active", "Sessions"].map((h) => (
            <th key={h} className="px-4 py-2 text-[10px] tracking-widest uppercase text-left" style={{ color: "var(--muted)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => {
          const statusColor = STATUS_COLORS[p.status?.toLowerCase()] ?? "var(--dim)";
          return (
            <tr
              key={p.path}
              className="transition-colors"
              style={{ borderBottom: "1px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--text)" }}>
                {p.name}
              </td>
              <td className="px-4 py-3 text-xs max-w-xs" style={{ color: "var(--dim)" }}>
                {p.description || "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {p.stack?.length ? p.stack.map((s) => (
                    <span
                      key={s}
                      className="rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap"
                      style={{ background: "var(--surface2)", color: "var(--blue)", border: "1px solid var(--border2)" }}
                    >
                      {s}
                    </span>
                  )) : <span style={{ color: "var(--muted)" }}>—</span>}
                </div>
              </td>
              <td className="px-4 py-3">
                {p.status ? (
                  <span className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: statusColor }}>
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                    {p.status}
                  </span>
                ) : <span style={{ color: "var(--muted)" }}>—</span>}
              </td>
              <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--dim)" }}>
                {fmtDate(p.lastActive)}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: p.sessions ? "var(--text)" : "var(--muted)" }}>
                {p.sessions != null ? (
                  <span
                    className="rounded px-2 py-0.5"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border2)" }}
                  >
                    {p.sessions}
                  </span>
                ) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Session Log ───────────────────────────────────────────────────────────────

function SessionLog({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) {
    return (
      <p className="px-4 py-4 text-xs" style={{ color: "var(--muted)" }}>
        No entries yet. Say &ldquo;save to dashboard&rdquo; at the end of any session.
      </p>
    );
  }
  return (
    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
      {sessions.map((s, i) => (
        <div
          key={`${s.cwd}-${i}`}
          className="flex items-start gap-4 px-4 py-3 transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {/* Timeline dot + connector */}
          <div className="mt-1.5 flex flex-col items-center gap-1 flex-shrink-0">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--teal)" }} />
            {i < sessions.length - 1 && (
              <div className="w-px flex-1 min-h-4" style={{ background: "var(--border2)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                {fmtDatetime(s.timestamp)}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ background: "var(--surface2)", color: "var(--teal)", border: "1px solid var(--border2)" }}
              >
                {s.display}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
              {s.summary || "—"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Status Bar ────────────────────────────────────────────────────────────────

function StatusPulse({ refreshing }: { refreshing: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--green)" }}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${refreshing ? "opacity-40" : ""}`}
        style={{ background: "var(--green)", boxShadow: refreshing ? "none" : "0 0 4px var(--green)" }}
      />
      {refreshing ? "refreshing…" : "live"}
    </span>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

const REFRESH_MS = 30_000;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
      setLastFetch(new Date().toISOString());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-3"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wider" style={{ color: "var(--text)" }}>
            🎛 MISSION CONTROL
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>Aaron Cougle</span>
        </div>
        <div className="flex items-center gap-4">
          {lastFetch && (
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
              updated {timeAgo(lastFetch)}
            </span>
          )}
          <StatusPulse refreshing={refreshing} />
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="rounded px-2 py-1 text-[11px] transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              color: "var(--dim)",
              cursor: refreshing ? "default" : "pointer",
            }}
          >
            ↻ refresh
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 rounded border px-4 py-3 text-xs"
          style={{ background: "var(--surface)", borderColor: "var(--red)", color: "var(--red)" }}>
          Failed to load data: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {!data && !error && (
        <div className="flex h-64 items-center justify-center">
          <span className="text-xs animate-pulse" style={{ color: "var(--muted)" }}>Loading dashboard…</span>
        </div>
      )}

      {/* Dashboard grid */}
      {data && (
        <main className="mx-auto max-w-7xl p-6 space-y-6">

          {/* Row 1: MCP + Skills side by side */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card
              title="MCP Servers"
              icon="⚡"
              className="lg:col-span-1"
              hint={
                <span className="normal-case tracking-normal font-normal" style={{ color: "var(--muted)" }}>
                  How to access MCP servers through Claude Code:{" "}
                  <code style={{ color: "var(--teal)" }}>/mcp</code>
                </span>
              }
            >
              <MCPServers servers={data.mcpServers} />
            </Card>
            <Card title="Skills Registry" icon="🛠" className="lg:col-span-2">
              <SkillsRegistry skills={data.skills} />
            </Card>
          </div>

          {/* Row 2: Projects full width */}
          <Card title="Projects" icon="📁">
            <Projects projects={data.projects} />
          </Card>

          {/* Row 3: Session log */}
          <Card title={`Session Log  ·  ${data.sessions.length} ${data.sessions.length === 1 ? "entry" : "entries"}`} icon="📋">
            <SessionLog sessions={data.sessions} />
          </Card>

        </main>
      )}

      {/* Footer */}
      <footer className="pb-8 text-center text-[11px]" style={{ color: "var(--muted)" }}>
        Auto-refreshes every 30s · data from{" "}
        <code style={{ color: "var(--dim)" }}>~/.claude/mission-control/</code>
      </footer>
    </div>
  );
}
