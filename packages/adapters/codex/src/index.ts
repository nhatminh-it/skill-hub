import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

import type { AgentConfig, ApplyOptions, MCP, Skill, SkillAdapter } from "@skh/core";

const MARKER_PATTERN = /<!-- skh:([^\s>]+) -->\r?\n([\s\S]*?)\r?\n<!-- \/skh:\1 -->/g;

function assertSafeName(name: string): void {
  if (name.length === 0 || basename(name) !== name || name === "." || name === ".." || /[\s>]/.test(name)) {
    throw new Error(`Invalid skill name: ${name}`);
  }
}

function blockFor(skill: Skill): string {
  return `<!-- skh:${skill.name} -->\n${skill.content}\n<!-- /skh:${skill.name} -->`;
}

export class CodexAdapter implements SkillAdapter {
  readonly name = "codex";
  private readonly instructionsPath: string;

  constructor(homePath: string = homedir()) {
    this.instructionsPath = join(homePath, ".codex", "instructions.md");
  }

  async export(skill: Skill, _options: ApplyOptions): Promise<void> {
    assertSafeName(skill.name);
    let current = "";
    try {
      current = await readFile(this.instructionsPath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const escapedName = skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingPattern = new RegExp(
      `<!-- skh:${escapedName} -->\\r?\\n[\\s\\S]*?\\r?\\n<!-- \\/skh:${escapedName} -->`,
    );
    const block = blockFor(skill);
    const updated = existingPattern.test(current)
      ? current.replace(existingPattern, block)
      : `${current.trimEnd()}${current.trimEnd().length > 0 ? "\n\n" : ""}${block}\n`;
    await mkdir(dirname(this.instructionsPath), { recursive: true });
    const temporaryPath = `${this.instructionsPath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, updated, "utf8");
    await rename(temporaryPath, this.instructionsPath);
  }

  async exportMcp(_mcp: MCP, _options: ApplyOptions): Promise<void> {
    console.warn("CodexAdapter does not support MCP export; skipping.");
  }

  async read(): Promise<AgentConfig> {
    let content: string;
    try {
      content = await readFile(this.instructionsPath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { skills: [], mcps: [] };
      throw error;
    }
    const skills: Skill[] = Array.from(content.matchAll(MARKER_PATTERN), (match) => ({
      name: match[1] as string,
      description: "",
      content: match[2] as string,
    }));
    return { skills, mcps: [] };
  }
}

export default CodexAdapter;
