import assert from 'node:assert/strict'
import test from 'node:test'
import { installLocalEmailSignupGuard } from './local-auth-hook.mjs'

test('installs the email-registration guard only through an existing verified local database connection', async () => {
  const statements = []
  await installLocalEmailSignupGuard({ query: async statement => { statements.push(statement) } })

  assert.equal(statements.length, 1)
  assert.match(statements[0], /create or replace function birdnerd_private\.birdnerd_reject_email_signup/u)
  assert.match(statements[0], /provider' = 'email'/u)
  assert.match(statements[0], /grant execute on function birdnerd_private\.birdnerd_reject_email_signup\(jsonb\) to supabase_auth_admin/u)
  assert.match(statements[0], /revoke all on function birdnerd_private\.birdnerd_reject_email_signup\(jsonb\) from public, anon, authenticated/u)
})
