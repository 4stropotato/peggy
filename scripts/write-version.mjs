import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function tryExec(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

const buildId = tryExec('git rev-parse --short HEAD') || `dev-${Date.now().toString(36)}`
const buildTime = new Date().toISOString()

const payload = {
  buildId,
  buildTime,
}

const outPath = path.join(process.cwd(), 'public', 'version.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Wrote ${outPath}: ${buildId}`)

