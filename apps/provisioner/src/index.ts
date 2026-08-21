/**
 * Deploy-only trusted-operator CLI. Its database login is distinct from the
 * migration deployer and can execute only BirdNerd's private bootstrap
 * function; the credential never belongs in Field or a browser bundle.
 */

import { Client } from 'pg'
import { bootstrapWorkspace, changeMembership, type ProvisioningMember } from './databaseProvisioner.js'
import { parsePendingMember } from './provisioning.js'

type CliOptions = {
  operation: 'bootstrap' | 'invite' | 'set-role' | 'deactivate' | 'reactivate'
  workspace_name: string
  admin_email: string
  provisioner_id: string
  pending_members: ProvisioningMember[]
  workspace_id?: string
  membership_id?: string
  email?: string
  role?: 'admin' | 'contributor'
}

export async function runCli(args: readonly string[], environment: NodeJS.ProcessEnv = process.env): Promise<unknown> {
  const options = parseCliOptions(args)
  const connectionString = environment.BIRDNERD_PROVISIONER_DATABASE_URL
  if (!connectionString) throw new Error('BIRDNERD_PROVISIONER_DATABASE_URL is required in the trusted operator environment.')
  const client = new Client({ connectionString })
  await client.connect()
  try {
    if (options.operation !== 'bootstrap') return changeMembership(client, options.operation, { ...options, workspace_id: options.workspace_id! })
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

/** Parse command grammar without connecting, so operator mistakes cannot reach the database. */
export function parseCliOptions(args: readonly string[]): CliOptions {
  const values = new Map<string, string[]>()
  const operation = (args[0] && !args[0].startsWith('--') ? args[0] : 'bootstrap') as CliOptions['operation']
  if (!['bootstrap', 'invite', 'set-role', 'deactivate', 'reactivate'].includes(operation)) throw new Error(`Unknown operation: ${operation}\n\n${helpText()}`)
  for (let index = operation === 'bootstrap' && args[0] !== 'bootstrap' ? 0 : 1; index < args.length; index += 1) {
    const flag = args[index]
    if (flag === '--help' || flag === '-h') throw new Error(helpText())
    if (!['--workspace-name', '--admin-email', '--member', '--provisioner-id', '--workspace-id', '--membership-id', '--email', '--role'].includes(flag)) {
      throw new Error(`Unknown argument: ${flag}\n\n${helpText()}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`A value is required after ${flag}.`)
    values.set(flag, [...(values.get(flag) ?? []), value])
    index += 1
  }

  if (operation !== 'bootstrap') return {
    operation, workspace_name: '', admin_email: '', pending_members: [], provisioner_id: values.get('--provisioner-id')?.at(-1) ?? 'phase-31-operator',
    workspace_id: requiredValue(values, '--workspace-id'), membership_id: values.get('--membership-id')?.at(-1), email: values.get('--email')?.at(-1), role: values.get('--role')?.at(-1) as CliOptions['role'],
  }
  const workspaceName = requiredValue(values, '--workspace-name')
  const adminEmail = requiredValue(values, '--admin-email')
  return {
    operation, workspace_name: workspaceName,
    admin_email: adminEmail,
    provisioner_id: values.get('--provisioner-id')?.at(-1) ?? 'phase-31-operator',
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
    '  ... provision -- bootstrap --workspace-name "Cedar Creek" --admin-email admin@example.com [--member person@example.com:contributor]',
    '  ... provision -- invite --workspace-id <uuid> --email person@example.com --role contributor',
    '  ... provision -- set-role|deactivate|reactivate --workspace-id <uuid> --membership-id <uuid> [--role admin|contributor]',
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
