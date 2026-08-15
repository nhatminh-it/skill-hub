import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import { getConfigDir, readConfig } from "@skill-hub/core";

interface PushOptions {
  message?: string;
}

export async function pushCommand(options: PushOptions): Promise<void> {
  const cwd = process.cwd();
  const config = readConfig(cwd);
  const hubRoot = getConfigDir(cwd);

  const isGitRepo = fs.existsSync(path.join(hubRoot, ".git"));

  if (!isGitRepo) {
    console.error(chalk.red(`${hubRoot} is not a git repository — cannot push to ${config.registry}`));
    process.exitCode = 1;
    return;
  }

  const status = execSync("git status --porcelain", { cwd: hubRoot }).toString().trim();

  if (!status) {
    console.log(chalk.gray("Nothing to push — working tree is clean"));
    return;
  }

  const spinner = ora(`Pushing changes to ${config.registry}`).start();
  const message = options.message ?? "Update skills and mcps";

  try {
    execSync("git add -A", { cwd: hubRoot, stdio: "pipe" });
    execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: hubRoot, stdio: "pipe" });
    execSync("git push", { cwd: hubRoot, stdio: "pipe" });
    spinner.succeed(chalk.green("Pushed local changes to registry"));
  } catch (error) {
    spinner.fail(chalk.red("Failed to push changes"));
    throw error;
  }
}
