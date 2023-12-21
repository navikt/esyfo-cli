/* eslint-disable no-console */

import { getYargsParser } from './yargs-parser.ts'

await getYargsParser(process.argv).demandCommand().strict().parse()
