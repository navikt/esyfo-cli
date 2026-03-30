import chalk from "chalk";
import { parseISO } from "date-fns";
import * as R from "remeda";
import { coloredTimestamp } from "../common/date-utils.ts";
import { authorToColorAvatar } from "../common/format-utils.ts";
import { log } from "../common/log.ts";
import {
  BaseRepoNodeFragment,
  getTeamRepositoriesOrThrow,
  ghGqlQuery,
  type OrgTeamRepoResult,
  removeIgnoredArchivedAndNonAdmin,
} from "../common/octokit.ts";

interface PrNode {
  title: string;
  updatedAt: string;
  permalink: string;
  isDraft: boolean;
  author: {
    avatarUrl: string;
    login: string;
  };
}

interface RepoTopicNode {
  topic: {
    name: string;
  };
}

interface PullRequestNode {
  pullRequests: {
    nodes: PrNode[];
  };
  repositoryTopics: {
    nodes: RepoTopicNode[];
  };
}

interface RepoPrSummary {
  repo: string;
  topics: string;
  pullsUrl: string;
  prs: PrNode[];
}

interface RepoPrTableRow {
  repo: string;
  topics: string;
  pullsUrl: string;
  dependabot: number;
  other: number;
}

const DEPENDABOT_LOGIN = "dependabot";
const EXCLUDED_TOPIC = "team-esyfo";
const EMPTY_TOPICS = "N/A";
const REPO_HEADER = "Repo";
const TOPICS_HEADER = "Topics";
const DEPENDABOT_HEADER = "Dependabot";
const OTHER_HEADER = "Utvikler";
const PULLS_URL_HEADER = "Pulls URL";

const reposQuery = /* GraphQL */ `
  query OurRepos($team: String!) {
    organization(login: "navikt") {
      team(slug: $team) {
        repositories(orderBy: { field: PUSHED_AT, direction: DESC }) {
          nodes {
            ...BaseRepoNode
            viewerPermission
            repositoryTopics(first: 20) {
              nodes {
                topic {
                  name
                }
              }
            }
            pullRequests(
              first: 100
              orderBy: { field: UPDATED_AT, direction: DESC }
              states: OPEN
            ) {
              nodes {
                title
                updatedAt
                permalink
                isDraft
                author {
                  avatarUrl
                  login
                }
              }
            }
          }
        }
      }
    }
  }

  ${BaseRepoNodeFragment}
`;

async function getPrs(
  team: string,
  opts: { includeDrafts: boolean; noBot: boolean },
): Promise<RepoPrSummary[]> {
  log(
    chalk.green(
      `Getting all open prs for team ${team}${
        opts.includeDrafts ? " (including drafts)" : ""
      }${opts.noBot ? " (without bots)" : ""}`,
    ),
  );

  const queryResult = await ghGqlQuery<OrgTeamRepoResult<PullRequestNode>>(
    reposQuery,
    { team },
  );
  const repositories = getTeamRepositoriesOrThrow(queryResult, team);

  const openPrs = R.pipe(
    repositories.nodes,
    removeIgnoredArchivedAndNonAdmin,
    R.map((repo) => ({
      repo: repo.name,
      topics: formatTopics(repo.repositoryTopics.nodes),
      pullsUrl: `${repo.url}/pulls`,
      prs: R.pipe(
        repo.pullRequests.nodes,
        R.filter((pr) => opts.includeDrafts || !pr.isDraft),
        R.filter((pr) => !opts.noBot || !isDependabotPr(pr)),
      ),
    })),
    R.filter((repo) => repo.prs.length > 0),
  );

  log(
    `Found ${chalk.greenBright(
      openPrs.reduce((sum, repo) => sum + repo.prs.length, 0),
    )} open prs for team ${team}\n`,
  );

  return openPrs;
}

export async function openPrs(
  includeDrafts: boolean,
  noBot: boolean,
  listView: boolean,
  showTopics: boolean,
  urls: boolean,
): Promise<void> {
  const openPrs = await getPrs("team-esyfo", { includeDrafts, noBot });

  if (listView) {
    R.pipe(
      openPrs,
      R.sortBy([(repo) => R.first(repo.prs)?.updatedAt ?? "", "desc"]),
      R.forEach(({ repo, prs }) => {
        log(chalk.greenBright(repo));
        prs.forEach((pr) => {
          log(
            `\t${pr.title} (${pr.permalink})\n\tBy ${authorToColorAvatar(
              pr.author.login,
            )} ${pr.author.login} ${coloredTimestamp(
              parseISO(pr.updatedAt),
            )} ago${pr.isDraft ? " (draft)" : ""}`,
          );
        });
      }),
    );
    return;
  }

  renderPrTable(
    R.pipe(
      openPrs,
      R.map(({ repo, topics, pullsUrl, prs }) => ({
        repo,
        topics,
        pullsUrl,
        dependabot: countDependabotPrs(prs),
        other: countOtherPrs(prs),
      })),
      R.sortBy((repo) => repo.repo),
    ),
    showTopics,
    urls,
  );
}

function isDependabotPr(pr: PrNode): boolean {
  const login = pr.author.login.toLowerCase();
  return login === DEPENDABOT_LOGIN || login.startsWith(`${DEPENDABOT_LOGIN}[bot`);
}

function countDependabotPrs(prs: PrNode[]): number {
  return prs.filter(isDependabotPr).length;
}

function countOtherPrs(prs: PrNode[]): number {
  return prs.length - countDependabotPrs(prs);
}

function formatTopics(repoTopics: RepoTopicNode[]): string {
  const topics = repoTopics
    .map((repoTopic) => repoTopic.topic.name)
    .filter((topic) => topic !== EXCLUDED_TOPIC);

  return topics.length > 0 ? topics.join(" / ") : EMPTY_TOPICS;
}

function renderPrTable(
  rows: RepoPrTableRow[],
  includeTopics: boolean,
  includeUrls: boolean,
): void {
  const maxRepo = Math.max(
    REPO_HEADER.length,
    ...rows.map((row) => row.repo.length),
  );
  const maxTopics = includeTopics
    ? Math.max(TOPICS_HEADER.length, ...rows.map((row) => row.topics.length))
    : 0;
  const maxDependabot = Math.max(
    DEPENDABOT_HEADER.length,
    ...rows.map((row) => String(row.dependabot).length),
  );
  const maxOther = Math.max(
    OTHER_HEADER.length,
    ...rows.map((row) => String(row.other).length),
  );

  const header = [
    `  ${REPO_HEADER.padEnd(maxRepo)}`,
    includeTopics ? TOPICS_HEADER.padEnd(maxTopics) : undefined,
    DEPENDABOT_HEADER.padEnd(maxDependabot),
    OTHER_HEADER.padEnd(maxOther),
    includeUrls ? PULLS_URL_HEADER : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join("  ");

  log(chalk.bold(header));
  log(chalk.dim("  " + "─".repeat(header.length - 2)));

  for (const row of rows) {
    const cells = [
      `  ${row.repo.padEnd(maxRepo)}`,
      includeTopics ? chalk.dim(row.topics.padEnd(maxTopics)) : undefined,
      String(row.dependabot).padEnd(maxDependabot),
      String(row.other).padEnd(maxOther),
      includeUrls ? chalk.dim(row.pullsUrl) : undefined,
    ].filter((value): value is string => value !== undefined);

    log(cells.join("  "));
  }

  const totalDependabot = rows.reduce((sum, row) => sum + row.dependabot, 0);
  const totalOther = rows.reduce((sum, row) => sum + row.other, 0);

  log("");
  log(chalk.bold("Summary:"));
  log(`  ${DEPENDABOT_HEADER}: ${chalk.cyan(totalDependabot)}`);
  log(`  ${OTHER_HEADER}: ${chalk.cyan(totalOther)}`);
}
