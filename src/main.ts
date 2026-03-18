import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as utils from './utils'
import {inspect} from 'util'

async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let repoPrivate: boolean | undefined

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
    repoPrivate = eventData?.repository?.private
  }

  const upstream = 'peter-evans/create-issue-from-file'
  const action = process.env.GITHUB_ACTION_REPOSITORY
  const docsUrl =
    'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions'

  core.info('')
  core.info('\u001B[1;36mStepSecurity Maintained Action\u001B[0m')
  core.info(`Secure drop-in replacement for ${upstream}`)
  if (repoPrivate === false) {
    core.info('\u001B[32m\u2713 Free for public repositories\u001B[0m')
  }
  core.info(`\u001B[36mLearn more:\u001B[0m ${docsUrl}`)
  core.info('')

  if (repoPrivate === false) return

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const body: {action: string; ghes_server?: string} = {action: action || ''}

  if (serverUrl !== 'https://github.com') {
    body.ghes_server = serverUrl
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (response.status === 403) {
      core.error(
        '\u001B[1;31mThis action requires a StepSecurity subscription for private repositories.\u001B[0m'
      )
      core.error(
        `\u001B[31mLearn how to enable a subscription: ${docsUrl}\u001B[0m`
      )
      process.exit(1)
    }
  } catch {
    core.info('Timeout or API not reachable. Continuing to next step.')
  }
}

function truncateBody(body: string) {
  // 65536 characters is the maximum allowed for issues.
  const truncateWarning = '...*[Issue body truncated]*'
  if (body.length > 65536) {
    core.warning(`Issue body is too long. Truncating to 65536 characters.`)
    return body.substring(0, 65536 - truncateWarning.length) + truncateWarning
  }
  return body
}

async function run(): Promise<void> {
  try {
    await validateSubscription()

    const inputs = {
      token: core.getInput('token'),
      repository: core.getInput('repository'),
      issueNumber: Number(core.getInput('issue-number')),
      title: core.getInput('title'),
      contentFilepath: core.getInput('content-filepath'),
      labels: utils.getInputAsArray('labels'),
      assignees: utils.getInputAsArray('assignees')
    }
    core.debug(`Inputs: ${inspect(inputs)}`)

    const [owner, repo] = inputs.repository.split('/')
    core.debug(`Repo: ${inspect(repo)}`)

    const octokit = github.getOctokit(inputs.token)

    // Check the file exists
    let fileExists = false
    try {
      await fs.promises.access(inputs.contentFilepath, fs.constants.R_OK)
      fileExists = true
    } catch {
      fileExists = false
    }

    if (fileExists) {
      // Fetch the file content
      let fileContent = await fs.promises.readFile(inputs.contentFilepath, {
        encoding: 'utf8'
      })

      fileContent = truncateBody(fileContent)

      const issueNumber = await (async (): Promise<number> => {
        if (inputs.issueNumber) {
          // Update an existing issue
          await octokit.rest.issues.update({
            owner: owner,
            repo: repo,
            issue_number: inputs.issueNumber,
            title: inputs.title,
            body: fileContent
          })
          core.info(`Updated issue #${inputs.issueNumber}`)
          return inputs.issueNumber
        } else {
          // Create an issue
          const {data: issue} = await octokit.rest.issues.create({
            owner: owner,
            repo: repo,
            title: inputs.title,
            body: fileContent
          })
          core.info(`Created issue #${issue.number}`)
          return issue.number
        }
      })()

      // Apply labels
      if (inputs.labels.length > 0) {
        core.info(`Applying labels '${inputs.labels}'`)
        await octokit.rest.issues.addLabels({
          owner: owner,
          repo: repo,
          issue_number: issueNumber,
          labels: inputs.labels
        })
      }
      // Apply assignees
      if (inputs.assignees.length > 0) {
        core.info(`Applying assignees '${inputs.assignees}'`)
        await octokit.rest.issues.addAssignees({
          owner: owner,
          repo: repo,
          issue_number: issueNumber,
          assignees: inputs.assignees
        })
      }

      // Set output
      core.setOutput('issue-number', issueNumber)
    } else {
      core.info(`File not found at path '${inputs.contentFilepath}'`)
    }
  } catch (error) {
    core.debug(inspect(error))
    core.setFailed(utils.getErrorMessage(error))
  }
}

run()
