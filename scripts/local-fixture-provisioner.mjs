import { randomBytes } from 'node:crypto'

export const fixtureProvisionerRole = 'birdnerd_fixture_provisioner'

/**
 * Gives one operation a fresh, in-memory password for the local fixture's
 * restricted Provisioner login. Callers keep the local database connection;
 * the operation receives only the execute-only login, never a database URL.
 */
export async function withLocalFixtureProvisioner({ Client, databaseUrl, database, operation }) {
  const password = randomBytes(32).toString('hex')
  try {
    await database.query(`create role ${fixtureProvisionerRole} login nosuperuser nocreatedb nocreaterole noreplication inherit password '${password}'`)
  } catch (error) {
    if (error?.code !== '42710') throw error
    const existing = await database.query(
      'select rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolcanlogin, rolinherit from pg_roles where rolname = $1',
      [fixtureProvisionerRole],
    )
    const role = existing.rows[0]
    if (!role || role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolreplication || !role.rolcanlogin || !role.rolinherit) {
      throw new Error('Existing local Fixture Provisioner role is not restricted.')
    }
    await database.query(`alter role ${fixtureProvisionerRole} password '${password}'`)
  }
  await database.query(`grant birdnerd_provisioner to ${fixtureProvisionerRole}`)

  const connection = new URL(databaseUrl)
  connection.username = fixtureProvisionerRole
  connection.password = password
  const provisioner = new Client({ connectionString: connection.toString() })
  await provisioner.connect()
  try {
    return await operation(provisioner)
  } finally {
    await provisioner.end()
  }
}
