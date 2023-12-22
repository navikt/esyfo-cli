import chalk from 'chalk'

import { config, skipEnforceAdmin } from '../config/config'
import { RepoConfig } from '../config/types'
import { log } from '../common/log'

import { octokit } from './octokit'

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function hentEllerLagRepo(r: RepoConfig) {
    try {
        return await octokit.request('GET /repos/{owner}/{repo}', {
            owner: config.owner,
            repo: r.name,
        })
    } catch (e: any) {
        if (r.patch && e.status === 404) {
            await octokit.request('POST /orgs/{org}/repos', {
                org: config.owner,
                name: r.name,
                private: false,
                auto_init: true,
                default_branch: 'main',
                visibility: 'public',
            })
            await sleep(4000)

            return await octokit.request('GET /repos/{owner}/{repo}', {
                owner: config.owner,
                repo: r.name,
            })
        } else {
            throw e
        }
    }
}

export async function verifiserRepo(r: RepoConfig) {
    log(chalk.green('\n\nVerifiserer repo ' + r.name))
    const repo = await hentEllerLagRepo(r)

    let ok = true

    function verifiser(key: string, forventet: any) {
        if ((repo.data as any)[key] !== forventet) {
            ok = false
            log(`${repo.data.full_name} ${key} != ${forventet}`)
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

    if (!(repo.data.topics as string[]).includes('team-esyfo')) {
        log(`${repo.data.full_name} mangler team-esyfo topic i ${repo.data.topics}`)
        if (r.patch) {
            await octokit.request('PUT /repos/{owner}/{repo}/topics', {
                owner: config.owner,
                repo: r.name,
                names: ['team-esyfo'],
            } as any)
        }
    }
    if (!ok) {
        if (r.patch) {
            log(`Oppdaterer repo innstillinger for ${r.name}`)

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
        } else {
            log(chalk.red(`Repo ${r.name} har feil oppsett`))
        }
    }
    await verifiserDefaultBranchProtection(r, repo.data.default_branch)

    await verifiserAdminTeams(r)
}

async function verifiserAdminTeams(r: RepoConfig) {
    log(chalk.green('Verifiserer admin teams'))
    const repoTeams = await octokit.request('GET /repos/{owner}/{repo}/teams', {
        owner: config.owner,
        repo: r.name,
    })

    const adminTeams = repoTeams.data.filter((team) => team.permission === 'admin').map((team) => team.name)

    const aksepterteTeams = ['team-esyfo']
    for (const team of adminTeams) {
        if (!aksepterteTeams.includes(team)) {
            log(chalk.red(`Team ${team} har admin tilgang til ${r.name}`))
            process.exit(1)
        }
    }

    if (r.patch) {
        for (const team of aksepterteTeams) {
            if (!adminTeams.includes(team) && r.patch) {
                log('Gir admin tilgang til team: ' + team + ' for repo: ' + r.name + '')
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
}

async function verifiserDefaultBranchProtection(repo: RepoConfig, branch: string): Promise<void> {
    log(chalk.green('Verifiserer branch protection rules'))

    try {
        const branchProtection = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}/protection', {
            owner: config.owner,
            repo: repo.name,
            branch,
        })

        let ok = true

        function verifiser(key: string, subKey: string, forventet: any) {
            const value = (branchProtection.data as any)[key]
            if (value[subKey] !== forventet) {
                ok = false
                log(`${key}.${subKey} != ${forventet}`)
            }
        }

        function verifiserNull(key: string) {
            const value = (branchProtection.data as any)[key]
            if (value != null) {
                ok = false
                log(`${key} != null`)
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

        if (!ok) log(chalk.red(`Repo ${repo.name} har feil branch protection`))
    } catch (e) {
        log(chalk.red('Repo har ikke satt opp branch protection', e))
    }

    try {
        if (repo.patch) {
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
