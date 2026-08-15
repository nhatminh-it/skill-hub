import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import type { Skill, MCP, Profile } from "./types";

export function parseSkill(filePath: string): Skill {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  if (!data.name || !data.description) {
    throw new Error(`Invalid skill file ${filePath}: missing "name" or "description"`);
  }

  return {
    name: data.name,
    description: data.description,
    content: content.trim(),
    agents: data.agents ?? [],
    tags: data.tags ?? [],
    scope: data.scope ?? "global",
    filePath,
  };
}

export function parseMcp(filePath: string): MCP {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(raw);

  if (!data.name || !data.command) {
    throw new Error(`Invalid mcp file ${filePath}: missing "name" or "command"`);
  }

  return {
    name: data.name,
    description: data.description,
    command: data.command,
    args: data.args ?? [],
    env: data.env ?? {},
    agents: data.agents ?? [],
    filePath,
  };
}

export function parseProfile(filePath: string): Profile {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (!data.name) {
    throw new Error(`Invalid profile file ${filePath}: missing "name"`);
  }

  return {
    name: data.name,
    description: data.description,
    skills: data.skills ?? [],
    mcps: data.mcps ?? [],
    filePath,
  };
}

export function findSkills(dir: string): Skill[] {
  const skills: Skill[] = [];

  function walk(current: string): void {
    if (!fs.existsSync(current)) {
      return;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        skills.push(parseSkill(fullPath));
      }
    }
  }

  walk(dir);
  return skills;
}
