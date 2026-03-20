import fs from "node:fs";
import path from "node:path";

import chalk from "chalk";

import { log } from "../common/log.ts";

export async function copilotSetup(): Promise<void> {
  log(chalk.yellow("\n⚠️  Denne kommandoen er deprecated!\n"));
  log(chalk.yellow("  «copilot setup» er erstattet av «copilot sync»."));
  log(
    chalk.yellow(
      "  Agenter distribueres nå automatisk til hvert repo via copilot sync,",
    ),
  );
  log(
    chalk.yellow("  og trenger ikke lenger installeres lokalt som plugin.\n"),
  );
  log("  Kjør i stedet:");
  log(chalk.cyan("    ecli copilot sync --all\n"));

  await cleanupOldPluginFiles();
}

async function cleanupOldPluginFiles(): Promise<void> {
  const home = Bun.env.HOME ?? Bun.env.USERPROFILE;
  if (!home) return;

  const pluginDir = path.join(
    home,
    ".copilot",
    "installed-plugins",
    "_direct",
    "esyfo-agents",
  );

  if (!fs.existsSync(pluginDir)) return;

  try {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  } catch (e) {
    log(chalk.yellow(`  ⚠️ Klarte ikke fjerne ${pluginDir}: ${e}`));
    return;
  }
  log(chalk.green("  🧹 Fjernet gamle plugin-filer fra:"));
  log(chalk.green(`     ${pluginDir}`));
  log(chalk.dim("     Disse filene er ikke lenger nødvendige.\n"));
}
