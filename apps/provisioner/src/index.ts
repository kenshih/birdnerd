/**
 * TEMPORARY Phase 28 provision-file hand-off. This CLI writes only a local
 * draft Event Log JSON file, never database rows or projections. Phase 30 will
 * replace the hand-off with authenticated Supabase Event Admission and sync.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { encodeDraftEventLog } from '@birdnerd/events'
import { parsePendingMember, provisionWorkspace, type PendingMemberInput } from './provisioning.js'

type CliOptions = {
  workspace_name: string
  admin_email: string
  output: string
  pending_members: PendingMemberInput[]
}

export async function runCli(args: readonly string[]): Promise<string> {
  const options = parseArgs(args)
  const events = provisionWorkspace(options)
  const outputPath = resolve(options.output)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, encodeDraftEventLog(events), 'utf8')
  return outputPath
}

function parseArgs(args: readonly string[]): CliOptions {
  const values = new Map<string, string[]>()
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    if (flag === '--help' || flag === '-h') throw new Error(helpText())
    if (flag !== '--workspace-name' && flag !== '--admin-email' && flag !== '--member' && flag !== '--output') {
      throw new Error(`Unknown argument: ${flag}\n\n${helpText()}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`A value is required after ${flag}.`)
    values.set(flag, [...(values.get(flag) ?? []), value])
    index += 1
  }

  const workspaceName = requiredValue(values, '--workspace-name')
  const adminEmail = requiredValue(values, '--admin-email')
  const output = values.get('--output')?.at(-1) ?? './birdnerd-provisioning-events.json'
  return {
    workspace_name: workspaceName,
    admin_email: adminEmail,
    output,
    pending_members: (values.get('--member') ?? []).map(parsePendingMember),
  }
}

function requiredValue(values: ReadonlyMap<string, string[]>, flag: string): string {
  const value = values.get(flag)?.at(-1)
  if (!value) throw new Error(`Missing required ${flag}.\n\n${helpText()}`)
  return value
}

function helpText(): string {
  return [
    'Usage:',
    '  npm run provision -- --workspace-name "Cedar Creek" --admin-email admin@example.com [--member person@example.com:contributor] [--output ./events.json]',
    '',
    'The Provisioner emits a draft canonical event log. It never writes projections or database rows.',
  ].join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2))
    .then(outputPath => console.log(`Provisioned draft Event Log: ${outputPath}`))
    .catch(error => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
