import {
  type BaseRepoNode,
  getTeamRepositoriesOrThrow,
  ghGqlQuery,
  type OrgTeamResult,
  removeIgnoredArchivedAndNonAdmin,
} from "../common/octokit.ts";

import { blacklisted as copilotBlacklisted } from "./copilot-blacklist.ts";

export const TEAM = "team-esyfo";

export interface RepoNode {
  name: string;
  description?: string;
  defaultBranch: string;
}

type OrgTeamRepoPageResult = OrgTeamResult<{
  repositories: {
    nodes: BaseRepoNode<Record<string, never>>[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}>;

const teamReposQuery = /* GraphQL */ `
    query ($team: String!, $cursor: String) {
        organization(login: "navikt") {
            team(slug: $team) {
                repositories(first: 100, after: $cursor, orderBy: { field: PUSHED_AT, direction: ASC }) {
                    nodes {
                        name
                        description
                        isArchived
                        pushedAt
                        url
                        defaultBranchRef {
                            name
                        }
                        viewerPermission
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
    }
`;

async function fetchAllTeamRepoNodes(): Promise<
  BaseRepoNode<Record<string, never>>[]
> {
  const allRepoNodes: BaseRepoNode<Record<string, never>>[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const result: OrgTeamRepoPageResult = await ghGqlQuery(teamReposQuery, {
      team: TEAM,
      cursor,
    });
    const repositories = getTeamRepositoriesOrThrow(result, TEAM);
    allRepoNodes.push(...repositories.nodes);

    hasNextPage = repositories.pageInfo.hasNextPage;
    cursor = repositories.pageInfo.endCursor;
  }

  return allRepoNodes;
}

export async function fetchCopilotRepos(
  repoFilter?: string,
): Promise<RepoNode[]> {
  const repos = removeIgnoredArchivedAndNonAdmin(await fetchAllTeamRepoNodes())
    .filter(copilotBlacklisted)
    .filter((repo) => repo.defaultBranchRef != null)
    .map((repo) => ({
      name: repo.name,
      description: repo.description,
      defaultBranch: repo.defaultBranchRef.name,
    }));

  if (repoFilter) {
    return repos.filter((repo) => repo.name === repoFilter);
  }

  return repos;
}
