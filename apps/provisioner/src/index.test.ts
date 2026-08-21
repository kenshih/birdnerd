import { describe, expect, it } from 'vitest'
import { parseCliOptions } from './index.js'

describe('Provisioner CLI grammar', () => {
  it('parses an invite without treating it as a bootstrap', () => {
    expect(parseCliOptions(['invite', '--workspace-id', '018f8c7b-0000-7000-8000-000000000001', '--email', 'member@example.com', '--role', 'contributor'])).toMatchObject({ operation: 'invite', workspace_id: '018f8c7b-0000-7000-8000-000000000001', email: 'member@example.com', role: 'contributor' })
  })

  it('requires a workspace for every lifecycle command', () => {
    expect(() => parseCliOptions(['reactivate', '--membership-id', '018f8c7b-0000-7000-8000-000000000003'])).toThrow('workspace-id')
    expect(() => parseCliOptions(['unknown'])).toThrow('Unknown operation')
  })
})
