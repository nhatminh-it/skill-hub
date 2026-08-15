import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { getConfigDir, readConfig } from "@skill-hub/core";

async function addSkill(name: string, hubRoot: string): Promise<void> {
  const answers = await inquirer.prompt<{
    description: string;
    tags: string;
    scope: "global" | "project";
    content: string;
  }>([
    {
      type: "input",
      name: "description",
      message: "Description:",
      validate: (value: string) => (value.trim().length > 0 ? true : "Description is required"),
    },
    {
      type: "input",
      name: "tags",
      message: "Tags (comma-separated):",
      default: "",
    },
    {
      type: "list",
      name: "scope",
      message: "Scope:",
      choices: ["global", "project"],
      default: "global",
    },
    {
      type: "editor",
      name: "content",
      message: "Skill content (opens editor):",
    },
  ]);

  const tags = answers.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const frontmatter = [
    "---",
    `name: ${name}`,
    `description: ${answers.description}`,
    `tags: [${tags.join(", ")}]`,
    "agents: []",
    `scope: ${answers.scope}`,
    "---",
    "",
    answers.content.trim(),
    "",
  ].join("\n");

  const filePath = path.join(hubRoot, "skills", `${name}.md`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (fs.existsSync(filePath)) {
    console.error(chalk.red(`Skill "${name}" already exists at ${filePath}`));
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(filePath, frontmatter, "utf-8");
  console.log(chalk.green(`Created skill ${chalk.bold(name)} at ${filePath}`));
}

async function addMcp(name: string, hubRoot: string): Promise<void> {
  const answers = await inquirer.prompt<{
    description: string;
    command: string;
    args: string;
    env: string;
  }>([
    {
      type: "input",
      name: "description",
      message: "Description:",
      default: "",
    },
    {
      type: "input",
      name: "command",
      message: "Command:",
      validate: (value: string) => (value.trim().length > 0 ? true : "Command is required"),
    },
    {
      type: "input",
      name: "args",
      message: "Args (comma-separated):",
      default: "",
    },
    {
      type: "input",
      name: "env",
      message: "Env vars (KEY=value, comma-separated):",
      default: "",
    },
  ]);

  const args = answers.args
    .split(",")
    .map((arg) => arg.trim())
    .filter(Boolean);

  const env: Record<string, string> = {};
  for (const pair of answers.env.split(",").map((entry) => entry.trim()).filter(Boolean)) {
    const [key, ...rest] = pair.split("=");
    if (key) {
      env[key.trim()] = rest.join("=").trim();
    }
  }

  const frontmatterLines = [
    "---",
    `name: ${name}`,
    `description: ${answers.description}`,
    `command: ${answers.command}`,
    `args: [${args.join(", ")}]`,
    "env:",
    ...Object.entries(env).map(([key, value]) => `  ${key}: ${value}`),
    "agents: []",
    "---",
    "",
  ];

  const filePath = path.join(hubRoot, "mcps", `${name}.md`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (fs.existsSync(filePath)) {
    console.error(chalk.red(`MCP "${name}" already exists at ${filePath}`));
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(filePath, frontmatterLines.join("\n"), "utf-8");
  console.log(chalk.green(`Created mcp ${chalk.bold(name)} at ${filePath}`));
}

export async function addCommand(kind: "skill" | "mcp", name: string): Promise<void> {
  const cwd = process.cwd();
  readConfig(cwd);
  const hubRoot = getConfigDir(cwd);

  if (kind === "skill") {
    await addSkill(name, hubRoot);
  } else {
    await addMcp(name, hubRoot);
  }
}
