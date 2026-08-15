import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { writeConfig } from "@skill-hub/core";
import type { SkhConfig } from "@skill-hub/core";

export async function initCommand(registry: string): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "skh.config.json");

  if (fs.existsSync(configPath)) {
    console.error(chalk.red(`skh.config.json already exists at ${configPath}`));
    process.exitCode = 1;
    return;
  }

  const config: SkhConfig = {
    registry,
    adapters: ["claude"],
    profiles: {
      default: "profiles/default.json",
    },
  };

  writeConfig(config, cwd);

  fs.mkdirSync(path.join(cwd, "skills"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "mcps"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "profiles"), { recursive: true });

  const mcpGlobalPath = path.join(cwd, "mcps", "global.json");
  if (!fs.existsSync(mcpGlobalPath)) {
    fs.writeFileSync(mcpGlobalPath, JSON.stringify({ mcps: [] }, null, 2) + "\n", "utf-8");
  }

  const defaultProfilePath = path.join(cwd, "profiles", "default.json");
  if (!fs.existsSync(defaultProfilePath)) {
    const defaultProfile = {
      name: "default",
      description: "Base profile applied to all projects",
      skills: [],
      mcps: [],
    };
    fs.writeFileSync(defaultProfilePath, JSON.stringify(defaultProfile, null, 2) + "\n", "utf-8");
  }

  console.log(chalk.green(`Initialized skh.config.json with registry ${chalk.bold(registry)}`));
}
