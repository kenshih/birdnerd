/**
 * Deploy-only trusted-operator CLI. Its database login is distinct from the
 * migration deployer and can execute only BirdNerd's private bootstrap
 * function; the credential never belongs in Field or a browser bundle.
 */

import { Client } from 'pg'
import { bootstrapWorkspace, type ProvisioningMember } from './databaseProvisioner.js'
import { parsePendingMember } from './provisioning.js'

type CliOptions = {
  workspace_name: string
  admin_email: string
  provisioner_id: string
  pending_members: ProvisioningMember[]
}

export async function runCli(args: readonly string[], environment: NodeJS.ProcessEnv = process.env): Promise<unknown> {
  const options = parseArgs(args)
  const connectionString = environment.BIRDNERD_PROVISIONER_DATABASE_URL
  if (!connectionString) throw new Error('BIRDNERD_PROVISIONER_DATABASE_URL is required in the trusted operator environment.')
  const client = new Client({ connectionString })
  await client.connect()
  try {
    return await bootstrapWorkspace(client, {
      workspace_name: options.workspace_name,
      provisioner_id: options.provisioner_id,
      members: [
        { email: options.admin_email, role: 'admin' },
        ...options.pending_members,
      ],
    })
  } finally {
    await client.end()
  }
}

function parseArgs(args: readonly string[]): CliOptions {
  const values = new Map<string, string[]>()
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    if (flag === '--help' || flag === '-h') throw new Error(helpText())
    if (flag !== '--workspace-name' && flag !== '--admin-email' && flag !== '--member' && flag !== '--provisioner-id') {
      throw new Error(`Unknown argument: ${flag}\n\n${helpText()}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`A value is required after ${flag}.`)
    values.set(flag, [...(values.get(flag) ?? []), value])
    index += 1
  }

  const workspaceName = requiredValue(values, '--workspace-name')
  const adminEmail = requiredValue(values, '--admin-email')
  return {
    workspace_name: workspaceName,
    admin_email: adminEmail,
    provisioner_id: values.get('--provisioner-id')?.at(-1) ?? 'phase-30-operator',
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
    '  BIRDNERD_PROVISIONER_DATABASE_URL=postgresql://... npm run provision -- --workspace-name "Cedar Creek" --admin-email admin@example.com [--member person@example.com:contributor]',
    '',
    'The credential must be a login granted only the birdnerd_provisioner role.',
  ].join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2))
    .then(receipt => console.log(JSON.stringify(receipt, null, 2)))
    .catch(error => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
