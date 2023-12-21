/* eslint-disable no-console */

import yargs, { Argv } from 'yargs'
import { hideBin } from 'yargs/helpers'

export const getYargsParser = (argv: string[]): Argv =>
    yargs(hideBin(argv))
        .scriptName('ecli')
        .command('test', 'Dette er esyfos aller første kommando', async () => await console.log('Hello via Bun!'))
