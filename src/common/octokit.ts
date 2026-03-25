import type { GraphQlResponse } from "@octokit/graphql/dist-types/types";
import chalk from "chalk";
import { Octokit } from "octokit";
import * as R from "remeda";

import { log } from "./log.ts";
import { blacklisted } from "./repoBlacklist.ts";

let octokit: Octokit | null = null;
export function getOctokitClient(auth: "cli" | "package" = "cli"): Octokit {
  if (octokit === null) {
    octokit = new Octokit({
      auth: auth === "cli" ? getGithubCliToken() : Bun.env.NPM_AUTH_TOKEN,
    });
  }

  return octokit;
}

/**
 * Wrapper to enforce types
 */
export async function ghGqlQuery<Result = never>(
  query: string,
  variables?: Record<string, unknown>,
): GraphQLResponse<Result> {
  return getOctokitClient().graphql<GraphQLResponse<Result>>(query, variables);
}

export function getGithubCliToken(): string {
  const subProcess = Bun.spawnSync("gh auth status --show-token".split(" "));
  const stdout = subProcess.stdout.toString();
  const stderr = subProcess.stderr.toString();

  // gh-cli puts the token on stderr, probably because security, but only on linux??? Lol
  const output = stdout.includes("Logged in to github.com") ? stdout : stderr;
  const data: string | null = output.match(/Token: (.*)/)?.[1] ?? null;

  if (!data?.trim()) {
    log(
      chalk.red(
        `Could not get github cli token. Please run 'gh auth login' and try again.`,
      ),
    );
    process.exit(1);
  }

  return data;
}

export type GraphQLResponse<Data> = GraphQlResponse<Data>;

export const BaseRepoNodeFragment = /* GraphQL */ `
    fragment BaseRepoNode on Repository {
        name
        isArchived
        pushedAt
        url
        defaultBranchRef {
            name
        }
    }
`;

export type BaseRepoNode<AdditionalRepoProps> = {
  name: string;
  description?: string;
  isArchived: boolean;
  pushedAt: string;
  url: string;
  defaultBranchRef: {
    name: string;
  };
  viewerPermission: string;
} & AdditionalRepoProps;

export type OrgTeamResult<Result> = {
  organization: {
    team: Result | null;
  };
};

export type OrgTeamRepoResult<AdditionalRepoProps> = OrgTeamResult<{
  repositories: {
    nodes: BaseRepoNode<AdditionalRepoProps>[];
  };
}>;

export function getTeamRepositoriesOrThrow<Repositories>(
  result: OrgTeamResult<{ repositories: Repositories }>,
  team: string,
): Repositories {
  const repositories = result.organization.team?.repositories;
  if (repositories == null) {
    const message = `Could not access team '${team}' in organization 'navikt'. Check that the team exists and you have permission to view it. Run 'gh auth status' to verify your authentication.`;
    log(chalk.red(message));
    throw new Error(message);
  }

  return repositories;
}

export const removeIgnoredAndArchived: <AdditionalRepoProps>(
  nodes: BaseRepoNode<AdditionalRepoProps>[],
) => BaseRepoNode<AdditionalRepoProps>[] = R.createPipe(
  R.filter((it) => !it.isArchived),
  R.filter(blacklisted),
);

export const removeIgnoredArchivedAndNonAdmin: <AdditionalRepoProps>(
  nodes: BaseRepoNode<AdditionalRepoProps>[],
) => BaseRepoNode<AdditionalRepoProps>[] = R.createPipe(
  R.filter((it) => !it.isArchived),
  R.filter((it) => it.viewerPermission === "ADMIN"),
  R.filter(blacklisted),
);
