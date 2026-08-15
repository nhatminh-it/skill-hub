import * as path from "path";
import chalk from "chalk";
import { getConfigDir, parseProfile, readConfig, resolveProfile } from "@skill-hub/core";
import { isSkillApplied } from "../adapters";

export async function statusCommand(): Promise<void> {
  const cwd = process.cwd();
  const config = readConfig(cwd);
  const hubRoot = getConfigDir(cwd);

  console.log(chalk.bold(`Registry: ${config.registry}`));
  console.log(chalk.bold(`Adapters: ${config.adapters.join(", ")}`));
  console.log();

  for (const [profileKey, profilePath] of Object.entries(config.profiles)) {
    const profile = parseProfile(path.join(hubRoot, profilePath));
    const { skills, mcps } = resolveProfile(profile, hubRoot);

    console.log(chalk.underline(`Profile "${profileKey}"`));

    if (skills.length === 0) {
      console.log(chalk.gray("  (no skills)"));
    }

    for (const skill of skills) {
      const statuses = config.adapters.map((adapterName) => {
        const applied = isSkillApplied(adapterName, skill, cwd);
        const icon = applied ? chalk.green("✓") : chalk.red("✗");
        return `${icon} ${adapterName}`;
      });
      console.log(`  ${chalk.cyan(skill.name)}  ${statuses.join("  ")}`);
    }

    if (mcps.length > 0) {
      console.log(chalk.gray(`  mcps: ${mcps.map((mcp) => mcp.name).join(", ")}`));
    }

    console.log();
  }
}
