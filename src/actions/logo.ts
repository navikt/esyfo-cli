import gradient from 'gradient-string'

import { log } from '../common/log'

export async function printLogo() {
    const esyfo = gradient.pastel.multiline(
        [
            '                  __                  _ _ ',
            '  ___  ___ _   _ / _| ___         ___| (_)',
            ' / _ \\/ __| | | | |_ / _ \\ _____ / __| | |',
            '|  __/\\__ \\ |_| |  _| (_) |_____| (__| | |',
            ' \\___||___/\\__, |_|  \\___/       \\___|_|_|',
            '           |___/                             ',
        ].join('\n'),
    )
    log(esyfo)
}
