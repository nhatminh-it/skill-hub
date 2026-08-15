import * as fs from "fs";
import * as path from "path";
import type { SkhConfig } from "./types";

const CONFIG_FILENAME = "skh.config.json";

function findConfigPath(cwd: string): string | null {
  let dir = path.resolve(cwd);

  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

export function readConfig(cwd: string = process.cwd()): SkhConfig {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    throw new Error(`Could not find ${CONFIG_FILENAME} in ${cwd} or any parent directory`);
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const data = JSON.parse(raw);

  return {
    registry: data.registry ?? "",
    adapters: data.adapters ?? [],
    profiles: data.profiles ?? {},
  };
}

export function writeConfig(config: SkhConfig, cwd: string = process.cwd()): void {
  const existing = findConfigPath(cwd);
  const configPath = existing ?? path.join(path.resolve(cwd), CONFIG_FILENAME);

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function getConfigDir(cwd: string = process.cwd()): string {
  const configPath = findConfigPath(cwd);
  return configPath ? path.dirname(configPath) : path.resolve(cwd);
}
