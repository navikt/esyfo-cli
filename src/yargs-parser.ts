/* eslint-disable no-console */

import yargs, { Argv } from 'yargs'
import { hideBin } from 'yargs/helpers'

import { verifiserRepoer, verifiserRepoet } from './actions/verifiser'

export const getYargsParser = (argv: string[]): Argv =>
    yargs(hideBin(argv))
        .scriptName('ecli')
        .command('test', 'Dette er esyfos aller første kommando', async () => await console.log('Hello via Bun!'))
        .command(
            'verifiser',
            'Verifiserer at repo har riktig innstillinger',
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
