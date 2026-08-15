import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

import type { AgentConfig, ApplyOptions, MCP, Skill, SkillAdapter } from "@skh/core";

type JsonObject = Record<string, unknown>;

function assertSafeName(name: string): void {
  if (name.length === 0 || basename(name) !== name || name === "." || name === "..") {
    throw new Error(`Invalid skill or MCP name: ${name}`);
  }
}

async function readObject(path: string): Promise<JsonObject> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`Expected a JSON object in ${path}`);
    }
    return value as JsonObject;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeJson(path: string, value: JsonObject): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

function mcpFromEntry(name: string, value: unknown): MCP | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const entry = value as JsonObject;
  if (typeof entry.command !== "string") return undefined;
  return {
    name,
    command: entry.command,
    ...(Array.isArray(entry.args) && entry.args.every((arg) => typeof arg === "string")
      ? { args: entry.args as string[] }
      : {}),
    ...(typeof entry.env === "object" && entry.env !== null && !Array.isArray(entry.env)
      ? { env: entry.env as Record<string, string> }
      : {}),
  };
}

export class ClaudeAdapter implements SkillAdapter {
  readonly name = "claude";
  private readonly claudePath: string;

  constructor(homePath: string = homedir()) {
    this.claudePath = join(homePath, ".claude");
  }

  async export(skill: Skill, _options: ApplyOptions): Promise<void> {
    assertSafeName(skill.name);
    const skillsPath = join(this.claudePath, "skills");
    await mkdir(skillsPath, { recursive: true });
    await writeFile(join(skillsPath, `${skill.name}.md`), skill.content, "utf8");
  }

  async exportMcp(mcp: MCP, _options: ApplyOptions): Promise<void> {
    assertSafeName(mcp.name);
    const settingsPath = join(this.claudePath, "settings.json");
    const settings = await readObject(settingsPath);
    const current = settings.mcpServers;
    const mcpServers: JsonObject =
      typeof current === "object" && current !== null && !Array.isArray(current)
        ? { ...(current as JsonObject) }
        : {};
    const { name: _name, description: _description, agents: _agents, ...configuration } = mcp;
    mcpServers[mcp.name] = configuration;
    await writeJson(settingsPath, { ...settings, mcpServers });
  }

  async read(): Promise<AgentConfig> {
    const skillsPath = join(this.claudePath, "skills");
    let entries: string[] = [];
    try {
      entries = await readdir(skillsPath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const skillFiles = entries.filter((entry) => entry.endsWith(".md")).sort();
    const skills: Skill[] = await Promise.all(
      skillFiles.map(async (entry) => ({
        name: entry.slice(0, -3),
        description: "",
        content: await readFile(join(skillsPath, entry), "utf8"),
      })),
    );
    const settings = await readObject(join(this.claudePath, "settings.json"));
    const rawServers = settings.mcpServers;
    const mcps =
      typeof rawServers === "object" && rawServers !== null && !Array.isArray(rawServers)
        ? Object.entries(rawServers)
            .map(([name, value]) => mcpFromEntry(name, value))
            .filter((mcp): mcp is MCP => mcp !== undefined)
        : [];
    return { skills, mcps };
  }
}

export default ClaudeAdapter;
