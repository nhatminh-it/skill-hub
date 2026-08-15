import * as fs from "fs";
import * as path from "path";
import { parseSkill, parseMcp } from "./parser";
import type { Profile, Skill, MCP } from "./types";

export interface ResolvedProfile {
  skills: Skill[];
  mcps: MCP[];
}

function loadGlobalMcps(hubRoot: string): MCP[] {
  const globalPath = path.join(hubRoot, "mcps", "global.json");

  if (!fs.existsSync(globalPath)) {
    return [];
  }

  const raw = fs.readFileSync(globalPath, "utf-8");
  const data = JSON.parse(raw);
  const entries = Array.isArray(data.mcps) ? data.mcps : [];

  return entries.map((entry: Partial<MCP>) => ({
    name: entry.name ?? "",
    description: entry.description,
    command: entry.command ?? "",
    args: entry.args ?? [],
    env: entry.env ?? {},
    agents: entry.agents ?? [],
    filePath: globalPath,
  }));
}

function resolveSkill(name: string, hubRoot: string): Skill {
  const filePath = path.join(hubRoot, "skills", `${name}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Skill "${name}" not found at ${filePath}`);
  }

  return parseSkill(filePath);
}

function resolveMcp(name: string, hubRoot: string, globalMcps: MCP[]): MCP {
  const fromGlobal = globalMcps.find((mcp) => mcp.name === name);
  if (fromGlobal) {
    return fromGlobal;
  }

  const filePath = path.join(hubRoot, "mcps", `${name}.md`);
  if (fs.existsSync(filePath)) {
    return parseMcp(filePath);
  }

  throw new Error(`MCP "${name}" not found (checked mcps/global.json and ${filePath})`);
}

export function resolveProfile(profile: Profile, hubRoot: string): ResolvedProfile {
  const globalMcps = loadGlobalMcps(hubRoot);

  const skills = profile.skills.map((name) => resolveSkill(name, hubRoot));
  const mcps = profile.mcps.map((name) => resolveMcp(name, hubRoot, globalMcps));

  return { skills, mcps };
}
