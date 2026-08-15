---
name: typescript-strict
description: Always use TypeScript strict mode and explicit types
tags: [typescript, quality]
agents: []
scope: global
---

Always write TypeScript with strict mode enabled. Rules:
- No `any` types — use `unknown` and narrow, or define proper types
- All function parameters and return types must be explicitly typed
- Use `interface` for object shapes, `type` for unions/aliases
- Prefer `const` over `let`, never use `var`
