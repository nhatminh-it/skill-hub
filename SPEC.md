# SkillHub — Spec

## Overview
CLI tool to manage AI agent skills and MCP configs across multiple machines and projects.
Each user stores their skills in their own GitHub repo. The CLI syncs and applies them in the correct format for each agent.

## Packages

### `packages/core`
Business logic. No agent-specific code.
- Parse skill/mcp markdown files (frontmatter + content)
- Validate against `schema/skill.json` and `schema/mcp.json`
- Resolve profiles (which skills + mcps to apply)
- Read/write `skh.config.json`

### `packages/registry`
GitHub registry client.
- `pull(repo)` — clone or pull a GitHub repo to local cache (`~/.skh/cache/<user>/<repo>`)
- `push(repo)` — commit and push local skills back to GitHub
- `resolve(ref)` — parse `github:user/repo` format

### `packages/adapters/claude`
Adapter for Claude Code.
- `export(skill)` → writes `.md` file to `~/.claude/skills/`
- `exportMcp(mcp)` → merges into `~/.claude/settings.json` under `mcpServers`
- `read()` → reads current Claude config

### `packages/adapters/cursor`
Adapter for Cursor.
- `export(skill)` → writes `.mdc` file to `.cursor/rules/` in project
- `exportMcp(mcp)` → merges into Cursor MCP config
- `read()` → reads current Cursor config

### `packages/adapters/codex`
Adapter for Codex (OpenAI Codex CLI).
- `export(skill)` → appends to `~/.codex/instructions.md`
- `read()` → reads current Codex instructions

### `packages/cli`
Entry point. Commands:
- `skh init <registry>` — set up skh.config.json with GitHub repo
- `skh sync` — pull latest from registry
- `skh apply [--project <name>]` — apply skills + mcps to all configured adapters
- `skh push` — commit & push local changes to registry
- `skh add skill <name>` — create new skill interactively
- `skh add mcp <name>` — add MCP config
- `skh install <github:user/repo>` — import skills from someone else's hub
- `skh status` — show what's applied vs registry

## Skill File Format
```md
---
name: typescript-strict
description: ...
tags: [typescript]
agents: []        # empty = all agents
scope: global     # global | project
---

Skill content here. This is what gets injected into each agent.
```

## Adapter Interface
Every adapter must implement:
```typescript
interface SkillAdapter {
  name: string
  export(skill: Skill, options: ApplyOptions): Promise<void>
  exportMcp(mcp: MCP, options: ApplyOptions): Promise<void>
  read(): Promise<AgentConfig>
}
```

## Config File (`skh.config.json`)
```json
{
  "registry": "github:mason/my-skills",
  "adapters": ["claude", "cursor", "codex"],
  "profiles": {
    "default": "profiles/default.json"
  }
}
```
