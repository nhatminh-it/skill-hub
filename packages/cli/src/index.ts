#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { syncCommand } from "./commands/sync";
import { applyCommand } from "./commands/apply";
import { pushCommand } from "./commands/push";
import { addCommand } from "./commands/add";
import { statusCommand } from "./commands/status";

const program = new Command();

program
  .name("skh")
  .description("Manage AI agent skills and MCP configs across machines and projects")
  .version("0.1.0");

program
  .command("init <registry>")
  .description("Set up skh.config.json with a GitHub registry")
  .action(initCommand);

program
  .command("sync")
  .description("Pull latest skills/mcps from the registry")
  .action(syncCommand);

program
  .command("apply")
  .description("Apply skills + mcps to all configured adapters")
  .option("--project <name>", "Apply project-scoped skills for a specific project")
  .action(applyCommand);

program
  .command("push")
  .description("Commit and push local changes to the registry")
  .option("-m, --message <message>", "Commit message")
  .action(pushCommand);

const add = program.command("add").description("Create a new skill or mcp");

add
  .command("skill <name>")
  .description("Create a new skill interactively")
  .action((name: string) => addCommand("skill", name));

add
  .command("mcp <name>")
  .description("Add a new MCP config")
  .action((name: string) => addCommand("mcp", name));

program
  .command("status")
  .description("Show what's applied vs registry")
  .action(statusCommand);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
