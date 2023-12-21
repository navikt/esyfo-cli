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

console.info(
  `Built ${version} (${chalk.green(
    `${(artifact.size / 1024).toFixed(0)}KB`,
  )}) bytes to ${chalk.yellow("./esyfo-cli/bin/ecli")}`,
);
