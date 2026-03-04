import fs from "node:fs";
import path from "node:path";

const HOME = process.env.HOME ?? "";
const CLAUDE_JSON = path.join(HOME, ".claude.json");
const SKILLS_DIR = path.join(HOME, ".claude", "skills");
const SESSIONS_FILE = path.join(HOME, ".claude", "mission-control", "data", "sessions.jsonl");

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MCPServer {
  name: string;
  type: string;
  endpoint: string;
}

export interface Skill {
  name: string;
  invoke: string;
  description: string;
  added: string;
}

export interface Project {
  name: string;
  path: string;
  display: string;
  lastActive: string | null;
  sessions: number | null;
}

export interface Session {
  timestamp: string;
  sessionId: string;
  project: string;
  cwd: string;
  display: string;
  summary: string;
}

export interface DashboardData {
  lastUpdated: string;
  mcpServers: MCPServer[];
  skills: Skill[];
  projects: Project[];
  sessions: Session[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDisplay(p: string): string {
  return p.replace(HOME, "~");
}

function projectName(p: string): string {
  if (!p || p === HOME) return "Home";
  return path.basename(p);
}

function parseSessions(lines: string[]): Session[] {
  return lines
    .filter(Boolean)
    .map((line) => {
      try {
        const obj = JSON.parse(line) as Record<string, string>;
        return {
          timestamp: obj.timestamp ?? "",
          sessionId: obj.session_id ?? "",
          project: obj.project ?? projectName(obj.cwd ?? ""),
          cwd: obj.cwd ?? "",
          display: toDisplay(obj.cwd ?? ""),
          summary: obj.summary ?? "",
        };
      } catch {
        return null;
      }
    })
    .filter((s): s is Session => s !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function buildProjects(sessions: Session[], knownPaths: string[]): Project[] {
  const stats: Record<string, { lastActive: string; count: number }> = {};
  for (const s of sessions) {
    if (!s.cwd) continue;
    const d = s.timestamp.slice(0, 10);
    if (!stats[s.cwd]) {
      stats[s.cwd] = { lastActive: d, count: 1 };
    } else {
      stats[s.cwd].count++;
      if (d > stats[s.cwd].lastActive) stats[s.cwd].lastActive = d;
    }
  }

  const allPaths = new Set([...knownPaths, ...Object.keys(stats)]);
  return Array.from(allPaths)
    .map((p) => ({
      name: projectName(p),
      path: p,
      display: toDisplay(p),
      lastActive: stats[p]?.lastActive ?? null,
      sessions: stats[p]?.count ?? null,
    }))
    .sort((a, b) => {
      if (a.path === HOME) return -1;
      if (b.path === HOME) return 1;
      return a.name.localeCompare(b.name);
    });
}

// ── Local (dev) ────────────────────────────────────────────────────────────────

function readJSON(filePath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function getLocalMCPServers(): MCPServer[] {
  const data = readJSON(CLAUDE_JSON);
  const servers = (data.mcpServers as Record<string, Record<string, string>>) ?? {};
  return Object.entries(servers).map(([name, cfg]) => {
    const type = cfg.type ?? "stdio";
    let endpoint = "";
    if (type === "stdio") {
      const cmd = cfg.command ?? "";
      endpoint = cmd.includes("Pencil.app") ? "Pencil Desktop App" : path.basename(cmd) || "local";
    } else {
      endpoint = (cfg.url ?? "").replace(/^https?:\/\//, "");
    }
    return { name, type, endpoint };
  });
}

function getLocalSkills(): Skill[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const skills: Skill[] = [];
  for (const dir of fs.readdirSync(SKILLS_DIR)) {
    const skillMd = path.join(SKILLS_DIR, dir, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    let name = dir, description = "", added = "";
    try {
      const content = fs.readFileSync(skillMd, "utf-8");
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      if (fm) {
        const nameM = fm[1].match(/^name:\s*(.+)$/m);
        const descM = fm[1].match(/^description:\s*(.+)$/m);
        if (nameM) name = nameM[1].trim();
        if (descM) {
          const d = descM[1].trim();
          description = d.length > 120 ? d.slice(0, 120) + "…" : d;
        }
      }
      added = new Date(fs.statSync(skillMd).mtimeMs).toISOString().slice(0, 10);
    } catch { /* skip */ }
    skills.push({ name, invoke: `/${dir}`, description, added });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function getLocalSessions(): Session[] {
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  const lines = fs.readFileSync(SESSIONS_FILE, "utf-8").split("\n");
  return parseSessions(lines);
}

function getLocalKnownPaths(): string[] {
  const data = readJSON(CLAUDE_JSON);
  return Object.keys((data.projects as Record<string, unknown>) ?? {});
}

function getLocalData(): DashboardData {
  const sessions = getLocalSessions();
  return {
    lastUpdated: new Date().toISOString(),
    mcpServers: getLocalMCPServers(),
    skills: getLocalSkills(),
    projects: buildProjects(sessions, getLocalKnownPaths()),
    sessions,
  };
}

// ── Remote (Vercel) ────────────────────────────────────────────────────────────

interface RemoteConfig {
  mcpServers: MCPServer[];
  skills: Skill[];
  knownProjects: string[];
}

async function getRemoteData(baseUrl: string): Promise<DashboardData> {
  const base = baseUrl.replace(/\/$/, "");
  const [sessionsText, config] = await Promise.all([
    fetch(`${base}/sessions.jsonl`, { cache: "no-store" }).then((r) => r.text()),
    fetch(`${base}/config.json`, { cache: "no-store" }).then((r) => r.json() as Promise<RemoteConfig>),
  ]);

  const sessions = parseSessions(sessionsText.split("\n"));
  return {
    lastUpdated: new Date().toISOString(),
    mcpServers: config.mcpServers ?? [],
    skills: config.skills ?? [],
    projects: buildProjects(sessions, config.knownProjects ?? []),
    sessions,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const remoteBase = process.env.GITHUB_DATA_BASE_URL;
  if (remoteBase) {
    return getRemoteData(remoteBase);
  }
  return getLocalData();
}
