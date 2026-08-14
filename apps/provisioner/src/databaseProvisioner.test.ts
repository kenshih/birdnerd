import { describe, expect, it, vi } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { bootstrapWorkspace } from './databaseProvisioner.js'

describe('database Provisioner adapter', () => {
  it('calls only the private bootstrap operation and returns its audit receipt', async () => {
    const workspace_id = '018f8c7b-0000-7000-8000-000000000001'
    const command_id = '018f8c7b-0000-7000-8000-000000000002'
    const actor = { kind: 'restricted-provisioner' as const, provisioner_id: 'phase-30-operator' }
    const receipt = {
      workspace_id,
      command_id,
      member_count: 2,
      events: [
        createEvent({ event_type: 'workspace.created', workspace_id, command_id, actor, payload: { workspace_id, name: 'Cedar Creek' } }),
        createEvent({ event_type: 'membership.preauthorized', workspace_id, command_id, actor, payload: { membership_id: '018f8c7b-0000-7000-8000-000000000003', email: 'admin@example.com', role: 'admin' } }),
        createEvent({ event_type: 'membership.preauthorized', workspace_id, command_id, actor, payload: { membership_id: '018f8c7b-0000-7000-8000-000000000004', email: 'member@example.com', role: 'contributor' } }),
      ],
    }
    const query = vi.fn(async () => ({ rows: [{ receipt }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] }))

    await expect(bootstrapWorkspace({ query }, {
      workspace_name: ' Cedar Creek ',
      members: [
        { email: 'Admin@Example.com', role: 'admin' },
        { email: 'member@example.com', role: 'contributor' },
      ],
    })).resolves.toEqual(receipt)
    expect(query).toHaveBeenCalledWith(
      'select birdnerd_private.bootstrap_workspace($1, $2::jsonb, $3) as receipt',
      ['Cedar Creek', JSON.stringify([
        { email: 'admin@example.com', role: 'admin' },
        { email: 'member@example.com', role: 'contributor' },
      ]), 'phase-30-operator'],
    )
  })

  it('rejects duplicate exact emails and bootstrap sets without an Admin before connecting', async () => {
    const query = vi.fn()
    await expect(bootstrapWorkspace({ query }, { workspace_name: 'Cedar', members: [
      { email: 'same@example.com', role: 'admin' },
      { email: 'SAME@example.com', role: 'contributor' },
    ] })).rejects.toThrow('already exists')
    await expect(bootstrapWorkspace({ query }, { workspace_name: 'Cedar', members: [
      { email: 'person@example.com', role: 'contributor' },
    ] })).rejects.toThrow('Admin')
    expect(query).not.toHaveBeenCalled()
  })

  it('rejects a malformed database audit receipt', async () => {
    const query = vi.fn(async () => ({
      rows: [{ receipt: { workspace_id: 'not-a-workspace', command_id: 'not-a-command', member_count: 1, events: [] } }],
      command: 'SELECT', rowCount: 1, oid: 0, fields: [],
    }))
    await expect(bootstrapWorkspace({ query }, {
      workspace_name: 'Cedar',
      members: [{ email: 'admin@example.com', role: 'admin' }],
    })).rejects.toThrow('invalid bootstrap audit receipt')
  })
})
