import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseOperationalFixture } from './fixture-loader.mjs'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = resolve(rootDirectory, 'data/fixtures/operational-workspace.yaml')

const actionLabels = {
  admin: 'Continue as Fixture Admin',
  contributor: 'Continue as Fixture Contributor',
}

/**
 * Derives the two browser-local sign-in profiles from the sole versioned
 * fixture declaration. The launcher, not an ambient Vite env file, owns this
 * short-lived development configuration.
 */
export function localFixtureAuthProfiles() {
  const fixture = parseOperationalFixture(readFileSync(fixturePath, 'utf8'))
  return fixture.members.map(member => ({
    id: `fixture-${member.key}`,
    label: actionLabels[member.key],
    email: member.email,
    password: member.password,
  }))
}
