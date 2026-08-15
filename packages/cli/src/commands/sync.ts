import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import { getConfigDir, readConfig } from "@skill-hub/core";

export async function syncCommand(): Promise<void> {
  const cwd = process.cwd();
  const config = readConfig(cwd);
  const hubRoot = getConfigDir(cwd);

  const spinner = ora(`Syncing from ${config.registry}`).start();

  const isGitRepo = fs.existsSync(path.join(hubRoot, ".git"));

  if (!isGitRepo) {
    spinner.warn(
      chalk.yellow(`${hubRoot} is not a git repository — nothing to pull. Skills are managed locally.`)
    );
    return;
  }

  try {
    execSync("git pull --ff-only", { cwd: hubRoot, stdio: "pipe" });
    spinner.succeed(chalk.green("Synced latest skills and mcps from registry"));
  } catch (error) {
    spinner.fail(chalk.red("Failed to sync from registry"));
    throw error;
  }
}
