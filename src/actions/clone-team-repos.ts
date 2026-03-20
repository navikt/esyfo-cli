import chalk from "chalk";
import {
  extractTypeFromTopics,
  getAllRepos,
  type RepoWithBranchAndTopics,
} from "../common/get-all-repos.ts";
import { Gitter } from "../common/git.ts";
import { log } from "../common/log.ts";
import {
  type BaseRepoNode,
  removeIgnoredArchivedAndNonAdmin,
} from "../common/octokit.ts";

async function cloneAllRepos(
  destination: string,
  team: string,
  useSubFolders: boolean,
): Promise<BaseRepoNode<unknown>[]> {
  const gitter = new Gitter({ type: "user-config", dir: destination });
  const repos = removeIgnoredArchivedAndNonAdmin(
    (await getAllRepos(team)) as BaseRepoNode<RepoWithBranchAndTopics>[],
  );
  const results = await Promise.all(
    repos.map((repo) => {
      const type = extractTypeFromTopics(repo);
      const localPath = useSubFolders ? `${type}/${repo.name}` : repo.name;
      return gitter.clone(repo.name, false, false, localPath);
    }),
  );

  log(
    `\nCloned ${chalk.yellow(results.filter((it) => it === "cloned").length)} repos\n`,
  );

  return repos;
}

export async function cloneTeamRepos(
  team: string,
  destination: string,
  useSubFolders: boolean,
): Promise<void> {
  log(
    chalk.green(
      `Preparing to clone git repositories for ${team} to ${destination}...`,
    ),
  );
  await cloneAllRepos(destination, team, useSubFolders);
  log(chalk.green(`Done`));
}
