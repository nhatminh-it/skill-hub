import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import { getConfigDir, parseProfile, readConfig, resolveProfile } from "@skill-hub/core";
import type { ApplyOptions as SkhApplyOptions } from "@skill-hub/core";
import { getAdapter } from "../adapters";

interface ApplyCommandOptions {
  project?: string;
}

export async function applyCommand(options: ApplyCommandOptions): Promise<void> {
  const cwd = process.cwd();
  const config = readConfig(cwd);
  const hubRoot = getConfigDir(cwd);

  const profileKey = options.project ?? "default";
  const profilePath = config.profiles[profileKey];

  if (!profilePath) {
    console.error(chalk.red(`No profile "${profileKey}" configured in skh.config.json`));
    process.exitCode = 1;
    return;
  }

  const profile = parseProfile(path.join(hubRoot, profilePath));
  const { skills, mcps } = resolveProfile(profile, hubRoot);

  const applyOptions: SkhApplyOptions = { project: options.project, cwd };

  for (const adapterName of config.adapters) {
    const spinner = ora(`Applying to ${adapterName}`).start();
    const adapter = getAdapter(adapterName);

    try {
      for (const skill of skills) {
        await adapter.export(skill, applyOptions);
      }

      for (const mcp of mcps) {
        try {
          await adapter.exportMcp(mcp, applyOptions);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          spinner.warn(chalk.yellow(`${adapterName}: skipped mcp "${mcp.name}" — ${message}`));
          spinner.start(`Applying to ${adapterName}`);
        }
      }

      spinner.succeed(
        chalk.green(`${adapterName}: applied ${skills.length} skill(s), ${mcps.length} mcp(s)`)
      );
    } catch (error) {
      spinner.fail(chalk.red(`${adapterName}: failed to apply`));
      throw error;
    }
  }
}
