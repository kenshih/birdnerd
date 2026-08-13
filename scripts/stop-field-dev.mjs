#!/usr/bin/env node
/**
 * Stops only a Vite server on port 5173 whose working directory is the Field
 * workspace. It deliberately refuses to signal an unrelated process.
 */
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const usage = 'Usage: npm run kill:dev [-- --dry-run]'
const args = process.argv.slice(2)

if (args.some((arg) => arg !== '--dry-run')) {
  console.error(usage)
  process.exitCode = 1
} else {
  const dryRun = args.includes('--dry-run')
  const scriptDirectory = dirname(fileURLToPath(import.meta.url))
  const fieldDirectory = realpathSync(resolve(scriptDirectory, '../apps/field'))
  const port = '5173'
  const pids = listeningProcessIds(port)

  if (pids.length === 0) {
    console.log(`No development server is listening on port ${port}.`)
  } else {
    const fieldPids = pids.filter((pid) => processWorkingDirectory(pid) === fieldDirectory)
    const unrelatedPids = pids.filter((pid) => !fieldPids.includes(pid))

    if (unrelatedPids.length > 0) {
      const descriptions = unrelatedPids.map((pid) => `${pid} (${processWorkingDirectory(pid) ?? 'unknown cwd'})`)
      console.error(
        `Refusing to stop process${unrelatedPids.length === 1 ? '' : 'es'} on port ${port}: ${descriptions.join(', ')}.\n` +
          'They are not running from apps/field.',
      )
      process.exitCode = 1
    } else if (dryRun) {
      console.log(`Would send SIGTERM to Field development server PID${fieldPids.length === 1 ? '' : 's'} ${fieldPids.join(', ')} on port ${port}.`)
    } else {
      for (const pid of fieldPids) {
        process.kill(Number(pid), 'SIGTERM')
      }
      console.log(`Sent SIGTERM to Field development server PID${fieldPids.length === 1 ? '' : 's'} ${fieldPids.join(', ')} on port ${port}.`)
    }
  }
}

function listeningProcessIds(port) {
  const output = runLsof(['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp'])
  return [...new Set(output.split('\n').flatMap((line) => (line.startsWith('p') ? [line.slice(1)] : [])))]
}

function processWorkingDirectory(pid) {
  const output = runLsof(['-a', '-p', pid, '-d', 'cwd', '-Fn'])
  const directory = output.split('\n').find((line) => line.startsWith('n'))?.slice(1)
  return directory ? realpathSync(directory) : undefined
}

function runLsof(args) {
  try {
    return execFileSync('lsof', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (error) {
    if (error.status === 1) {
      return ''
    }

    throw error
  }
}
