import path from 'node:path'

import * as R from 'remeda'
import chalk from 'chalk'

import {
    BaseRepoNode,
    BaseRepoNodeFragment,
    ghGqlQuery,
    OrgTeamRepoResult,
    removeIgnoredAndArchived,
} from '../common/octokit.ts'
import { log } from '../common/log.ts'
import { Gitter } from '../common/git.ts'
import inquirer, { hackilyFixBackToBackPrompt } from '../common/inquirer.ts'
import { GIT_CACHE_DIR } from '../common/cache.ts'

import { branchCommitPush } from './branch-commit-push.ts'

const reposQuery = /* GraphQL */ `
    query ($team: String!) {
        organization(login: "navikt") {
            team(slug: $team) {
                repositories(orderBy: { field: PUSHED_AT, direction: DESC }) {
                    nodes {
                        ...BaseRepoNode
                    }
                }
            }
        }
    }

    ${BaseRepoNodeFragment}
`

async function getAllRepos(): Promise<BaseRepoNode<unknown>[]> {
    log(chalk.green(`Querying Github for all active repositories for team-esyfo...`))

    const result = await ghGqlQuery<OrgTeamRepoResult<unknown>>(reposQuery, {
        team: 'team-esyfo',
    })

    return removeIgnoredAndArchived(result.organization.team.repositories.nodes)
}

async function cloneAllRepos(): Promise<BaseRepoNode<unknown>[]> {
    const gitter = new Gitter('cache')
    const repos = await getAllRepos()
    const results = await Promise.all(repos.map((it) => gitter.cloneOrPull(it.name, it.defaultBranchRef.name, true)))

    log(
        `\nUpdated ${chalk.yellow(results.filter((it) => it === 'updated').length)} and cloned ${chalk.yellow(
            results.filter((it) => it === 'cloned').length,
        )} repos\n`,
    )

    return repos
}

function queryRepo(query: string, repo: string): boolean {
    const result = Bun.spawnSync(query.split(' '), {
        cwd: `${GIT_CACHE_DIR}/${repo}`,
    })

    return result.exitCode === 0
}

async function getTargetRepos<Repo extends { name: string }>(otherRepos: Repo[]): Promise<Repo[]> {
    const checkboxResponse = await inquirer.prompt<{ target: string[] }>({
        type: 'checkbox',
        name: 'target',
        message: 'Select repos to copy file to',
        choices: [
            { value: 'all', name: 'All repos' },
            ...otherRepos.map((it) => ({
                name: it.name,
                value: it.name,
            })),
        ],
    })

    if (checkboxResponse.target.includes('all')) {
        return otherRepos
    } else if (checkboxResponse.target.length !== 0) {
        return otherRepos.filter((it) => checkboxResponse.target.includes(it.name))
    } else {
        log(chalk.red('You must select at least one repo'))
        return getTargetRepos(otherRepos)
    }
}

export async function syncFilesAcrossRepos(query: string): Promise<void> {
    if (!query) throw new Error('Missing query')

    const repos = await cloneAllRepos()

    const relevantRepos = R.pipe(
        repos,
        R.map((it) => [it, queryRepo(query, it.name)] as const),
        R.filter(([, result]) => result),
        R.map(([name]) => name),
    )

    log(
        `\n Welcome to ${chalk.red(
            'Interactive File Sync',
        )}! \n\n We will pick a file from one repo and copy it to other repos. \n\n The steps are: \n   1. Select source repo \n   2. Select files to sync \n   3. Select target repos \n   4. Confirm \n   5. Write commit message \n   6. Select branch name \n   7. Choose to create PR \n   8. Choose to automerge PR \n\n`,
    )

    log(`! Your query ${chalk.yellow(query)} matched ${chalk.green(relevantRepos.length)} repos:`)

    // Step 1, selecting the source repo
    const sourceRepo = await inquirer.prompt<{ source: string }>([
        {
            type: 'autocomplete',
            name: 'source',
            message: 'Select source repository',
            source: (_: unknown, input: string) =>
                relevantRepos
                    .filter((it) => (input == null ? true : it.name.includes(input)))
                    .map((it) => ({ name: it.name, value: it.name })),
        },
    ])
    const filesToSync = []
    // Step 2, selecting valid files in the source repo
    do {
        await hackilyFixBackToBackPrompt()
        filesToSync.push(await getValidFileInSource(sourceRepo.source))
    } while (await addMoreFilesCheck(sourceRepo.source))

    // Step 3, selecting target repos
    await hackilyFixBackToBackPrompt()
    const otherRepos = relevantRepos.filter((it) => it.name !== sourceRepo.source)
    const targetRepos = await getTargetRepos(otherRepos)

    log(`The files "${chalk.yellow(filesToSync)}" will be synced across the following repos:`)
    log(targetRepos.map((it) => ` - ${it.name}`).join('\n'))

    // Step 5, confirm
    await hackilyFixBackToBackPrompt()
    const confirmResult = await inquirer.prompt({
        name: 'confirm',
        type: 'confirm',
        message: `Do you want to continue? This will create ${targetRepos.length} commits, one for each repo.`,
    })

    if (confirmResult.confirm) {
        await copyFilesToRepos(sourceRepo.source, targetRepos, filesToSync)
    } else {
        log(chalk.red('Aborting!'))
    }
}

async function getValidFileInSource(sourceRepo: string, initialValue?: string): Promise<string> {
    const file = await inquirer.prompt<{ file: string }>({
        type: 'input',
        name: 'file',
        default: initialValue,
        message: `Which file in ${sourceRepo} should be synced across? \n (Path should be root in repo)`,
    })

    const bunFile = Bun.file(path.join(GIT_CACHE_DIR, sourceRepo, file.file))
    log(path.join(GIT_CACHE_DIR, sourceRepo, file.file))
    if (await bunFile.exists()) {
        return file.file
    }

    log(chalk.red(`Could not find file ${file.file} in ${sourceRepo}`))

    return getValidFileInSource(sourceRepo, file.file)
}

async function addMoreFilesCheck(sourceRepo: string): Promise<boolean> {
    const check = await inquirer.prompt<{ confirm: boolean }>({
        type: 'confirm',
        name: 'confirm',
        message: `Do you want to sync additional files from ${sourceRepo}?`,
    })

    return check.confirm
}

async function copyFilesToRepos(
    sourceRepo: string,
    targetRepos: { name: string; url: string }[],
    filesToSync: string[],
): Promise<void> {
    const gitter = new Gitter('cache')

    filesToSync.forEach((file) => {
        const sourceFile = Bun.file(path.join(GIT_CACHE_DIR, sourceRepo, file))

        targetRepos.map((it) => {
            log(`Copying ${chalk.yellow(`${it.name}/${file}`)} from ${chalk.yellow(sourceRepo)}`)
            const targetFile = Bun.file(path.join(GIT_CACHE_DIR, it.name, file))
            Bun.write(targetFile, sourceFile)

            log(`${chalk.green(`Copied file to repo ${it.name}`)}`)

            gitter.createRepoGitClient(it.name).add(file)
        })
    })

    await branchCommitPush(true)
}
