import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { AgentConfig, ApplyOptions, MCP, Skill, SkillAdapter } from "@skill-hub/core";

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function mergeMcpIntoSettings(settingsPath: string, mcp: MCP): void {
  ensureDir(path.dirname(settingsPath));

  const settings: Record<string, unknown> = fs.existsSync(settingsPath)
    ? JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
    : {};

  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[mcp.name] = {
    command: mcp.command,
    args: mcp.args,
    env: mcp.env,
  };
  settings.mcpServers = mcpServers;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

function skillMarkdown(skill: Skill): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.content}\n`;
}

class ClaudeAdapter implements SkillAdapter {
  name = "claude";

  async export(skill: Skill, _options: ApplyOptions): Promise<void> {
    const dir = path.join(os.homedir(), ".claude", "skills");
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, `${skill.name}.md`), skillMarkdown(skill), "utf-8");
  }

  async exportMcp(mcp: MCP, _options: ApplyOptions): Promise<void> {
    const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
    mergeMcpIntoSettings(settingsPath, mcp);
  }

  async read(): Promise<AgentConfig> {
    const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
    if (!fs.existsSync(settingsPath)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  }
}

class CursorAdapter implements SkillAdapter {
  name = "cursor";

  async export(skill: Skill, options: ApplyOptions): Promise<void> {
    const cwd = options.cwd ?? process.cwd();
    const dir = path.join(cwd, ".cursor", "rules");
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, `${skill.name}.mdc`), skillMarkdown(skill), "utf-8");
  }

  async exportMcp(mcp: MCP, options: ApplyOptions): Promise<void> {
    const cwd = options.cwd ?? process.cwd();
    const settingsPath = path.join(cwd, ".cursor", "mcp.json");
    mergeMcpIntoSettings(settingsPath, mcp);
  }

  async read(): Promise<AgentConfig> {
    const cwd = process.cwd();
    const settingsPath = path.join(cwd, ".cursor", "mcp.json");
    if (!fs.existsSync(settingsPath)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  }
}

class CodexAdapter implements SkillAdapter {
  name = "codex";

  async export(skill: Skill, _options: ApplyOptions): Promise<void> {
    const dir = path.join(os.homedir(), ".codex");
    ensureDir(dir);
    const filePath = path.join(dir, "instructions.md");
    const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
    const marker = `<!-- skh:${skill.name} -->`;

    if (existing.includes(marker)) {
      return;
    }

    const block = `${marker}\n## ${skill.name}\n\n${skill.content}\n`;
    fs.writeFileSync(filePath, existing ? `${existing}\n${block}` : block, "utf-8");
  }

  async exportMcp(_mcp: MCP, _options: ApplyOptions): Promise<void> {
    throw new Error("Codex adapter does not support MCP configs");
  }

  async read(): Promise<AgentConfig> {
    const filePath = path.join(os.homedir(), ".codex", "instructions.md");
    if (!fs.existsSync(filePath)) {
      return {};
    }
    return { instructions: fs.readFileSync(filePath, "utf-8") };
  }
}

const ADAPTERS: Record<string, () => SkillAdapter> = {
  claude: () => new ClaudeAdapter(),
  cursor: () => new CursorAdapter(),
  codex: () => new CodexAdapter(),
};

export function getAdapter(name: string): SkillAdapter {
  const factory = ADAPTERS[name];
  if (!factory) {
    throw new Error(`Unknown adapter "${name}". Available: ${Object.keys(ADAPTERS).join(", ")}`);
  }
  return factory();
}

export function isSkillApplied(adapterName: string, skill: Skill, cwd: string): boolean {
  switch (adapterName) {
    case "claude":
      return fs.existsSync(path.join(os.homedir(), ".claude", "skills", `${skill.name}.md`));
    case "cursor":
      return fs.existsSync(path.join(cwd, ".cursor", "rules", `${skill.name}.mdc`));
    case "codex": {
      const filePath = path.join(os.homedir(), ".codex", "instructions.md");
      if (!fs.existsSync(filePath)) {
        return false;
      }
      return fs.readFileSync(filePath, "utf-8").includes(`<!-- skh:${skill.name} -->`);
    }
    default:
      return false;
  }
}
