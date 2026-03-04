"use client";

import { useEffect, useState, useCallback } from "react";
import type { DashboardData, MCPServer, Skill, Project } from "@/lib/data";

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

// ── Section Card ──────────────────────────────────────────────────────────────

function Card({ title, icon, hint, children, className = "", id }: {
  title: string;
  icon: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-lg border flex flex-col ${className}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b text-xs font-semibold tracking-widest uppercase"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
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
    <div className="divide-y">
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
      <colgroup>
        <col style={{ width: "50%" }} />
        <col style={{ width: "25%" }} />
        <col style={{ width: "25%" }} />
      </colgroup>
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
              <div className="font-semibold text-xs" style={{ color: "var(--text)" }}>{sk.name}</div>
              <div className="mt-0.5 text-[10px] leading-relaxed" style={{ color: "var(--dim)" }}>
                {sk.description}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
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

// ── Project Cards ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active:   "var(--green)",
  paused:   "var(--yellow)",
  archived: "var(--muted)",
};

function ProjectCards({ projects }: { projects: Project[] }) {
  if (!projects.length) {
    return <p className="px-4 py-4 text-xs" style={{ color: "var(--muted)" }}>No projects found in ~/Apps.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => {
        const statusColor = STATUS_COLORS[p.status?.toLowerCase()] ?? "var(--dim)";
        return (
          <div
            key={p.path}
            className="flex flex-col gap-3 rounded-lg p-4 transition-colors"
            style={{ background: "var(--surface2)", border: "1px solid var(--border2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--dim)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-sm leading-tight" style={{ color: "var(--text)" }}>
                {p.name}
              </span>
              {p.status && (
                <span className="flex items-center gap-1.5 text-[10px] whitespace-nowrap flex-shrink-0 mt-0.5" style={{ color: statusColor }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor, boxShadow: p.status === "active" ? `0 0 5px ${statusColor}` : "none" }} />
                  {p.status}
                </span>
              )}
            </div>

            {/* Notes — primary content */}
            <p className="text-xs leading-relaxed flex-1" style={{ color: p.notes ? "var(--text)" : "var(--muted)", fontStyle: p.notes ? "normal" : "italic" }}>
              {p.notes || "No notes yet — say \"end mission\" to log a status."}
            </p>

            {/* Stack tags */}
            {p.stack?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.stack.map((s) => (
                  <span
                    key={s}
                    className="rounded px-1.5 py-0.5 text-[10px]"
                    style={{ background: "var(--surface)", color: "var(--blue)", border: "1px solid var(--border)" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] pt-1 border-t" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              <span>{p.missions != null ? `${p.missions} mission${p.missions === 1 ? "" : "s"}` : "no missions yet"}</span>
              <span>{p.lastActive ? fmtDate(p.lastActive) : "—"}</span>
            </div>
          </div>
        );
      })}
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

// ── Splash Screen ──────────────────────────────────────────────────────────────

function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 1800;
    const start = performance.now();
    let raf: number;
    const tick = () => {
      const pct = Math.min(((performance.now() - start) / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6" style={{ background: "var(--bg)" }}>
      <p className="text-xs tracking-[0.3em] uppercase" style={{ color: "var(--dim)" }}>
        Mission Control
      </p>
      <div className="w-64 overflow-hidden rounded-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div
          className="h-1 rounded-sm"
          style={{ width: `${progress}%`, background: "var(--green)", boxShadow: "0 0 8px var(--green)" }}
        />
      </div>
      <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--muted)", animation: "pulse 1.4s ease-in-out infinite" }}>
        Initializing…
      </p>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

const REFRESH_MS = 30_000;

export default function Dashboard() {
  const [splash, setSplash] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

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

  const [page, setPage] = useState<"dashboard" | "mcp" | "skills" | "projects">("dashboard");

  if (splash) return <SplashScreen />;

  const navItems: { icon: string; label: string; page: typeof page }[] = [
    { icon: "🎛", label: "Dashboard",       page: "dashboard" },
    { icon: "⚡", label: "MCP Servers",     page: "mcp" },
    { icon: "🛠", label: "Skills Registry", page: "skills" },
    { icon: "📡", label: "Projects",        page: "projects" },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Sidebar */}
      <aside
        className="sticky top-0 flex h-screen w-52 flex-shrink-0 flex-col border-r"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
          <img src="/icon.svg" alt="" className="h-4 w-4" />
          <span className="text-xs font-bold tracking-wider" style={{ color: "var(--text)" }}>MISSION CONTROL</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = page === item.page;
            return (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-xs transition-colors"
                style={{
                  background: active ? "var(--surface2)" : "transparent",
                  color: active ? "var(--text)" : "var(--dim)",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface2)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "var(--border)" }}>
          {lastFetch && (
            <p className="text-[10px]" style={{ color: "var(--muted)" }}>updated {timeAgo(lastFetch)}</p>
          )}
          <div className="flex items-center justify-between">
            <StatusPulse refreshing={refreshing} />
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="rounded px-2 py-1 text-[10px] transition-colors"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border2)",
                color: "var(--dim)",
                cursor: refreshing ? "default" : "pointer",
              }}
            >
              ↻ refresh
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

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
          <main className="w-full mx-auto p-6 space-y-6" style={{ maxWidth: 1100 }}>

            {/* Dashboard: all sections */}
            {page === "dashboard" && <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card title="MCP Servers" icon="⚡" className="lg:col-span-1"
                  hint={
                    <span className="flex items-center gap-3">
                      <code style={{ color: "var(--teal)" }}>/mcp</code>
                      <button onClick={() => setPage("mcp")} className="text-[10px] transition-colors" style={{ color: "var(--muted)" }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text)")}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
                      >view all →</button>
                    </span>
                  }
                >
                  <MCPServers servers={data.mcpServers} />
                </Card>
                <Card title="Skills Registry" icon="🛠" className="lg:col-span-2"
                  hint={
                    <button onClick={() => setPage("skills")} className="text-[10px] normal-case tracking-normal font-normal transition-colors" style={{ color: "var(--muted)" }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text)")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
                    >view all →</button>
                  }
                >
                  <SkillsRegistry skills={data.skills} />
                </Card>
              </div>
              <Card title={`Projects  ·  ${data.projects.length} active`} icon="📡"
                hint={
                  <button onClick={() => setPage("projects")} className="text-[10px] normal-case tracking-normal font-normal transition-colors" style={{ color: "var(--muted)" }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text)")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
                  >view all →</button>
                }
              >
                <ProjectCards projects={data.projects} />
              </Card>
            </>}

            {/* MCP Servers page */}
            {page === "mcp" && (
              <Card title="MCP Servers" icon="⚡" hint={<code style={{ color: "var(--teal)" }}>/mcp</code>}>
                <MCPServers servers={data.mcpServers} />
              </Card>
            )}

            {/* Skills page */}
            {page === "skills" && (
              <Card title="Skills Registry" icon="🛠">
                <SkillsRegistry skills={data.skills} />
              </Card>
            )}

            {/* Projects page */}
            {page === "projects" && (
              <Card title={`Projects  ·  ${data.projects.length} active`} icon="📡">
                <ProjectCards projects={data.projects} />
              </Card>
            )}

          </main>
        )}

        {/* Footer */}
        <footer className="mt-auto pb-8 text-center text-[11px]" style={{ color: "var(--muted)" }}>
          Auto-refreshes every 30s · say <code style={{ color: "var(--dim)" }}>end mission</code> to log project status
        </footer>

      </div>
    </div>
  );
}
