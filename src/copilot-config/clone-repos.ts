import chalk from "chalk";

import { Gitter } from "../common/git.ts";
import { log } from "../common/log.ts";

interface CloneRepoInput {
  name: string;
  defaultBranch: string;
}

interface CloneReposResult<TRepo extends CloneRepoInput> {
  succeeded: TRepo[];
  failed: string[];
}

export async function cloneRepos<TRepo extends CloneRepoInput>(
  repos: TRepo[],
): Promise<CloneReposResult<TRepo>> {
  log(chalk.green("Cloning/pulling repositories..."));

  const gitter = new Gitter("cache");
  const cloneResults = await Promise.allSettled(
    repos.map((repo) =>
      gitter.cloneOrPull(repo.name, repo.defaultBranch, true),
    ),
  );

  const failed: string[] = [];
  const succeeded = repos.filter((repo, index) => {
    const result = cloneResults[index];
    if (result.status === "rejected") {
      failed.push(repo.name);
      log(
        chalk.red(
          `  ✗ ${repo.name}: ${(result.reason as Error).message ?? result.reason}`,
        ),
      );
      return false;
    }
    if (typeof result.value === "object" && result.value.type === "error") {
      failed.push(repo.name);
      log(chalk.red(`  ✗ ${repo.name}: ${result.value.message}`));
      return false;
    }
    return true;
  });

  if (failed.length > 0) {
    log(
      chalk.red(
        `\n  ${failed.length} repo(s) feilet clone/pull: ${failed.join(", ")}`,
      ),
    );
  }

  return {
    succeeded,
    failed,
  };
}
