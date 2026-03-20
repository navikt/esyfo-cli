import { cpSync, rmSync } from "node:fs";

import chalk from "chalk";

import { version } from "../esyfo-cli/package.json";

const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  target: "bun",
  define: {
    "process.env.COMPILED_BINARY": '"true"',
  },
});

if (result.outputs.length > 1) {
  throw new Error("Expected only one output");
}

const [artifact] = result.outputs;
const outputWriter = Bun.file("./esyfo-cli/bin/ecli").writer();

outputWriter.write("#!/usr/bin/env bun\n");
outputWriter.write(await artifact.text());

Bun.spawnSync("chmod +x ./esyfo-cli/bin/ecli".split(" "), {
  stdout: "inherit",
});

// Copy copilot-config templates into the distributable package (clean first to remove stale files)
rmSync("./esyfo-cli/copilot-config", { recursive: true, force: true });
cpSync("./copilot-config", "./esyfo-cli/copilot-config", { recursive: true });

/* eslint-disable no-console */
console.info(
  `Built ${version} (${chalk.green(`${(artifact.size / 1024).toFixed(0)}KB`)}) bytes to ${chalk.yellow(
    "./esyfo-cli/bin/ecli",
  )}`,
);
console.info(
  `Copied copilot-config/ → ${chalk.yellow("./esyfo-cli/copilot-config/")}`,
);

// Copy config files into the distributable package
cpSync("./config.yml", "./esyfo-cli/config.yml");
cpSync("./skip-enforce-admins.yml", "./esyfo-cli/skip-enforce-admins.yml");
console.info(
  `Copied config.yml, skip-enforce-admins.yml → ${chalk.yellow("./esyfo-cli/")}`,
);
