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

export class CursorAdapter implements SkillAdapter {
  readonly name = "cursor";
  private readonly homePath: string;
  private readonly defaultProjectPath: string;

  constructor(homePath: string = homedir(), projectPath: string = process.cwd()) {
    this.homePath = homePath;
    this.defaultProjectPath = projectPath;
  }

  async export(skill: Skill, options: ApplyOptions): Promise<void> {
    assertSafeName(skill.name);
    const rulesPath = join(options.projectPath ?? this.defaultProjectPath, ".cursor", "rules");
    await mkdir(rulesPath, { recursive: true });
    await writeFile(join(rulesPath, `${skill.name}.mdc`), skill.content, "utf8");
  }

  async exportMcp(mcp: MCP, _options: ApplyOptions): Promise<void> {
    assertSafeName(mcp.name);
    const path = join(this.homePath, ".cursor", "mcp.json");
    const config = await readObject(path);
    const current = config.mcpServers;
    const mcpServers: JsonObject =
      typeof current === "object" && current !== null && !Array.isArray(current)
        ? { ...(current as JsonObject) }
        : {};
    const { name: _name, description: _description, agents: _agents, ...configuration } = mcp;
    mcpServers[mcp.name] = configuration;
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify({ ...config, mcpServers }, null, 2)}\n`, "utf8");
    await rename(temporaryPath, path);
  }

  async read(): Promise<AgentConfig> {
    const rulesPath = join(this.defaultProjectPath, ".cursor", "rules");
    let entries: string[] = [];
    try {
      entries = await readdir(rulesPath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const files = entries.filter((entry) => entry.endsWith(".mdc")).sort();
    const skills: Skill[] = await Promise.all(
      files.map(async (entry) => ({
        name: entry.slice(0, -4),
        description: "",
        content: await readFile(join(rulesPath, entry), "utf8"),
      })),
    );
    return { skills, mcps: [] };
  }
}

export default CursorAdapter;
