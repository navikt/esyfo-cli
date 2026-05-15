/* eslint-disable no-console */

import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { cloneTeamRepos } from "./actions/clone-team-repos";
import { printLogo } from "./actions/logo";
import { openPrs } from "./actions/prs";
import { ourRepos } from "./actions/repos";
import { syncFilesAcrossRepos } from "./actions/sync-file.ts";
import { verifiserRepoer, verifiserRepoet } from "./actions/verifiser";

export const getYargsParser = (argv: string[]): Argv =>
  yargs(hideBin(argv))
    .scriptName("ecli")
    .middleware(() => printLogo())
    .command(
      "verifiser",
      "Verifiserer at repo har riktig innstillinger i GitHub",
      (yargs) =>
        yargs
          .option("repo", {
            alias: "r",
            description: "Repo som skal sjekkes",
            type: "string",
            requiresArg: true,
          })
          .option("all", {
            alias: "a",
            description: "Utfører kommandoen på alle konfigurerte repositories",
            type: "boolean",
          })
          .option("patch", {
            alias: "p",
            description: "Oppdaterer repo med riktig settings",
            type: "boolean",
          })
          .conflicts("all", "repo")
          .check((argv) => {
            if (argv.all || argv.repo) {
              return true; // tell Yargs that the arguments passed the check
            } else {
              throw new Error("Must specify -a or -r option");
            }
          }),
      (argv) =>
        argv.all
          ? verifiserRepoer(!!argv.patch)
          : verifiserRepoet(argv.repo ? argv.repo : "", !!argv.patch),
    )
    .command(
      "prs",
      "Vis åpne pull requests på tvers av teamets repos",
      (yargs) =>
        yargs
          .option("skip-bots", {
            type: "boolean",
            alias: "b",
            describe: "don't include bot pull requests",
          })
          .option("list-view", {
            type: "boolean",
            default: false,
            alias: "l",
            describe:
              "list all the pull requests instead of just counting them",
          })
          .option("urls", {
            type: "boolean",
            default: false,
            alias: "u",
            describe: "show repository /pulls URLs in table view",
          })
          .option("topics", {
            type: "boolean",
            default: false,
            alias: "t",
            describe: "show repository topics in table view",
          })
          .positional("drafts", {
            type: "boolean",
            default: false,
            describe: "include draft pull requests",
          }),
      async (args) =>
        openPrs(
          args.drafts,
          args.skipBots ?? false,
          args.listView ?? false,
          args.topics ?? false,
          args.urls ?? false,
        ),
    )
    .command(
      "sync-file <query>",
      "Kopier filer på tvers av repos (oppretter branch, commit og PR)",
      (yargs) =>
        yargs.positional("query", {
          type: "string",
          demandOption: true,
          describe:
            "execute this bash command in all repos and return all repos that give the error code 0",
        }),
      async (args) => syncFilesAcrossRepos(args.query),
    )
    .command(
      "repos",
      "List alle ikke-arkiverte repos for team-esyfo",
      (yargs) =>
        yargs
          .option("useMarkdown", {
            type: "boolean",
            alias: "b",
            describe: "write output in Markdown format",
          })
          .option("output", {
            alias: "o",
            description: "Output file path for file with repositories",
            type: "string",
            default: "repos.json",
          }),
      async (args) => ourRepos(args.output, args.useMarkdown ?? false),
    )
    .command(
      "clone-team-repos",
      "Klon alle repos eid av teamet til en lokal mappe",
      (yargs) =>
        yargs
          .option("team", {
            alias: "t",
            description: "GitHub team to clone repositories for",
            type: "string",
            default: "team-esyfo",
          })
          .option("destination", {
            alias: "d",
            description: "Destination file path for cloned repositories",
            type: "string",
            demandOption: true,
          })
          .option("use-sub-folders", {
            alias: "s",
            description:
              "Spread repos over subfolders by type (backend, frontend, etc.)",
            type: "boolean",
            default: false,
          }),
      async (args) =>
        cloneTeamRepos(args.team, args.destination, args.useSubFolders),
    );
