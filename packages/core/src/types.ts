export interface Skill {
  name: string;
  description: string;
  content: string;
  agents: string[];
  tags: string[];
  scope: "global" | "project";
  filePath?: string;
}

export interface MCP {
  name: string;
  description?: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  agents: string[];
  filePath?: string;
}

export interface Profile {
  name: string;
  description?: string;
  skills: string[];
  mcps: string[];
  filePath?: string;
}

export interface SkhConfig {
  registry: string;
  adapters: string[];
  profiles: Record<string, string>;
}

export interface AgentConfig {
  [key: string]: unknown;
}

export interface ApplyOptions {
  project?: string;
  cwd?: string;
  dryRun?: boolean;
}

export interface SkillAdapter {
  name: string;
  export(skill: Skill, options: ApplyOptions): Promise<void>;
  exportMcp(mcp: MCP, options: ApplyOptions): Promise<void>;
  read(): Promise<AgentConfig>;
}
