import chalk from 'chalk'
import { OctokitResponse } from '@octokit/types'

import { config, skipEnforceAdmin } from '../config/config'
import { RepoConfig } from '../config/types'
import { log } from '../common/log'

import { octokit } from './octokit'

async function hentRepo(r: RepoConfig) {
    try {
        return await octokit.request('GET /repos/{owner}/{repo}', {
            owner: config.owner,
            repo: r.name,
        })
    } catch (e: any) {
        log(chalk.red(`Repo ${r.name} finnes ikke`))
        process.exit(1)
    }
}

export async function verifiserRepo(r: RepoConfig) {
    log('\n\n* Verifiserer repo-instillinger *')
    const repo = await hentRepo(r)

    let ok = true

    function verifiser(key: string, forventet: any) {
        if ((repo.data as any)[key] !== forventet) {
            ok = false
            log(`${repo.data.full_name} ${key} har ikke forventet verdi: ${forventet}`)
        }
    }

    verifiser('default_branch', 'main')
    verifiser('allow_auto_merge', true)
    verifiser('delete_branch_on_merge', true)
    verifiser('allow_rebase_merge', false)
    verifiser('allow_merge_commit', false)
    verifiser('allow_squash_merge', true)
    verifiser('archived', false)
    verifiser('has_issues', false)
    verifiser('has_projects', false)
    verifiser('has_wiki', false)

    if (ok) {
        log(chalk.green(`Repo-instillinger er ok`))
    } else {
        const foreslaaPatch = !r.patch ? ` Kjør med -p flagg for å fikse.` : ``
        log(chalk.red(`Repo ${r.name} har feil oppsett. ${foreslaaPatch}`))
        if (r.patch) {
            log(chalk.cyan(`Fikser repo-innstillinger for ${r.name}`))

            await octokit.request('PATCH /repos/{owner}/{repo}', {
                owner: config.owner,
                repo: r.name,
                allow_auto_merge: true,
                default_branch: 'main',
                delete_branch_on_merge: true,
                allow_rebase_merge: false,
                allow_merge_commit: false,
                allow_squash_merge: true,
                has_issues: false,
                has_projects: false,
                has_wiki: false,
            })
        }
    }

    await verifiserTopic(r, repo)
    await verifiserDefaultBranchProtection(r, repo.data.default_branch)
    await verifiserAdminTeams(r)
}

async function verifiserTopic(r: RepoConfig, repo: OctokitResponse<any>) {
    log('* Verfiserer topic *')

    if ((repo.data.topics as string[]).includes('team-esyfo')) {
        log(chalk.green('Topic-innstillinger er ok'))
    } else {
        const foreslaaPatch = !r.patch ? ` Kjør med -p flagg for å fikse.` : ``
        log(chalk.red(`${repo.data.full_name} mangler team-esyfo topic. ${foreslaaPatch}`))
        if (r.patch) {
            log(chalk.cyan('Legger til team-esyfo topic'))
            await octokit.request('PUT /repos/{owner}/{repo}/topics', {
                owner: config.owner,
                repo: r.name,
                names: ['team-esyfo'],
            } as any)
        }
    }
}

async function verifiserAdminTeams(r: RepoConfig) {
    log('* Verifiserer admin teams *')
    const repoTeams = await octokit.request('GET /repos/{owner}/{repo}/teams', {
        owner: config.owner,
        repo: r.name,
    })

    const adminTeams = repoTeams.data.filter((team) => team.permission === 'admin').map((team) => team.name)

    const aksepterteTeams = ['team-esyfo']
    for (const team of adminTeams) {
        if (!aksepterteTeams.includes(team)) {
            log(chalk.red(`Team ${team} har admin tilgang til ${r.name}. Du må fjerne dem i GitHub manuelt`))
            process.exit(1)
        }
    }

    let ok = true

    for (const team of aksepterteTeams) {
        if (!adminTeams.includes(team)) {
            const foreslaaPatch = !r.patch ? ` Kjør med -p flagg for å fikse.` : ``
            log(chalk.red(`Team ${team} har ikke admin-tilgang. ${foreslaaPatch}`))
            ok = false
            if (r.patch) {
                log(chalk.cyan('Gir admin tilgang til team: ' + team + ' for repo: ' + r.name + ''))
                await octokit.request('PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}', {
                    org: config.owner,
                    team_slug: team,
                    owner: config.owner,
                    repo: r.name,
                    permission: 'admin',
                })
            }
        }
    }

    if (ok) {
        log(chalk.green('Admin team-innstillinger er ok'))
    }
}

async function verifiserDefaultBranchProtection(repo: RepoConfig, branch: string): Promise<void> {
    log('* Verifiserer branch protection rules *')

    let ok = true
    try {
        const branchProtection = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}/protection', {
            owner: config.owner,
            repo: repo.name,
            branch,
        })

        function verifiser(key: string, subKey: string, forventet: any) {
            const value = (branchProtection.data as any)[key]
            if (value == null) {
                ok = false
                log(`${key} er ikke satt`)
            } else if (value[subKey] !== forventet) {
                ok = false
                log(`${key}.${subKey} har ikke forventet verdi: ${forventet}`)
            }
        }

        function verifiserNull(key: string) {
            const value = (branchProtection.data as any)[key]
            if (value != null) {
                ok = false
                log(`${key} skal ikke være satt`)
            }
        }

        //mangler checks
        verifiser('required_status_checks', 'strict', false)
        verifiser('enforce_admins', 'enabled', !skipEnforceAdmin.includes(repo.name))
        verifiser('required_pull_request_reviews', 'dismiss_stale_reviews', false)
        verifiser('required_pull_request_reviews', 'require_code_owner_reviews', false)
        verifiser('required_pull_request_reviews', 'required_approving_review_count', 1)
        verifiserNull('restrictions')
        verifiser('required_linear_history', 'enabled', true)
        verifiser('allow_force_pushes', 'enabled', false)
        verifiser('allow_deletions', 'enabled', false)
        verifiser('required_conversation_resolution', 'enabled', true)

        if (ok) {
            log(chalk.green('Branch protection-innstillinger er ok'))
        } else {
            const foreslaaPatch = !repo.patch ? ` Kjør med -p flagg for å fikse.` : ``
            log(chalk.red(`Repo ${repo.name} har feil branch protection. ${foreslaaPatch}`))
        }
    } catch (e) {
        const foreslaaPatch = !repo.patch ? ` Kjør med -p flagg for å fikse.` : ``
        log(chalk.red(`Repo har ikke satt opp branch protection. ${foreslaaPatch}`, e))
    }

    try {
        if (repo.patch && !ok) {
            log(chalk.cyan('Fikser branch protection-innstillinger'))
            await octokit.request('PUT /repos/{owner}/{repo}/branches/{branch}/protection', {
                owner: config.owner,
                repo: repo.name,
                branch,
                required_status_checks: {
                    strict: false,
                    contexts: repo.checks || [],
                },
                enforce_admins: !skipEnforceAdmin.includes(repo.name),
                required_pull_request_reviews: {
                    dismiss_stale_reviews: false,
                    require_code_owner_reviews: false,
                    required_approving_review_count: 1,
                },
                restrictions: null,
                required_linear_history: true,
                allow_force_pushes: false,
                allow_deletions: false,
                required_conversation_resolution: true,
            })
        }
    } catch (e) {
        log(chalk.red('Feil med oppdatering av branch protection', e))
    }
}
