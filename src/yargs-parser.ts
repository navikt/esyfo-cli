/* eslint-disable no-console */

import yargs, { Argv } from 'yargs'
import { hideBin } from 'yargs/helpers'

import { verifiserRepoer, verifiserRepoet } from './actions/verifiser'
import { printLogo } from './actions/logo'
import { openPrs } from './actions/prs'
import { ourRepos } from './actions/repos'
import { syncFilesAcrossRepos } from './actions/sync-file.ts'

export const getYargsParser = (argv: string[]): Argv =>
    yargs(hideBin(argv))
        .scriptName('ecli')
        .middleware(() => printLogo())
        .command(
            'verifiser',
            'Verifiserer at repo har riktig innstillinger i GitHub',
            (yargs) =>
                yargs
                    .option('repo', {
                        alias: 'r',
                        description: 'Repo som skal sjekkes',
                        type: 'string',
                        requiresArg: true,
                    })
                    .option('all', {
                        alias: 'a',
                        description: 'Utfører kommandoen på alle konfigurerte repositories',
                        type: 'boolean',
                    })
                    .option('patch', {
                        alias: 'p',
                        description: 'Oppdaterer repo med riktig settings',
                        type: 'boolean',
                    })
                    .conflicts('all', 'repo')
                    .check((argv) => {
                        if (argv.all || argv.repo) {
                            return true // tell Yargs that the arguments passed the check
                        } else {
                            throw new Error('Must specify -a or -r option')
                        }
                    }),
            (argv) =>
                argv.all ? verifiserRepoer(!!argv.patch) : verifiserRepoet(argv.repo ? argv.repo : '', !!argv.patch),
        )
        .command(
            'prs',
            'get all open pull requests',
            (yargs) =>
                yargs
                    .option('skip-bots', { type: 'boolean', alias: 'b', describe: "don't include bot pull requests" })
                    .positional('drafts', { type: 'boolean', default: false, describe: 'include draft pull requests' }),
            async (args) => openPrs(args.drafts, args.skipBots ?? false),
        )
        .command(
            'sync-file <query>',
            'sync files across specified repos',
            (yargs) =>
                yargs.positional('query', {
                    type: 'string',
                    demandOption: true,
                    describe: 'execute this bash command in all repos and return all repos that give the error code 0',
                }),
            async (args) => syncFilesAcrossRepos(args.query),
        )
        .command(
            'repos',
            'get all non-archived repos for team-esyfo',
            (yargs) =>
                yargs.option('output', {
                    alias: 'o',
                    description: 'Output file path for repositories JSON',
                    type: 'string',
                    default: 'repos.json',
                }),
            async (args) => ourRepos(args.output),
        )
