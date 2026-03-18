import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean)

const issues = new Set()

const forbiddenPathRules = [
  {
    test: (filePath) =>
      (/\/?\.env(\..+)?$/i.test(filePath) || filePath === '.env') &&
      !filePath.endsWith('.env.example'),
    message: 'Tracked environment files are forbidden outside *.env.example',
  },
  {
    test: (filePath) => /^docs\/work\//.test(filePath),
    message: 'Working materials under docs/work must stay out of the public repository',
  },
  {
    test: (filePath) => /(^|\/)\.DS_Store$/i.test(filePath),
    message: 'OS metadata files must not be tracked',
  },
  {
    test: (filePath) => /\.(pem|key|crt|p12|pub)$/i.test(filePath),
    message: 'Secret and certificate file types must not be tracked',
  },
]

for (const filePath of trackedFiles) {
  if (!fs.existsSync(filePath)) continue
  for (const rule of forbiddenPathRules) {
    if (rule.test(filePath)) {
      issues.push(`${filePath}: ${rule.message}`)
    }
  }
}

const publicDocs = trackedFiles.filter((filePath) =>
  /^(README\.md|SECURITY\.md|docs\/.*\.md)$/.test(filePath),
)

const forbiddenPublicDocPatterns = [
  { pattern: /~\/\.ssh\b/, message: 'operator-specific SSH paths must stay private' },
  { pattern: /\bssh-keygen\b/, message: 'SSH key generation instructions must stay private' },
  { pattern: /\bscp\b/, message: 'SCP instructions must stay private' },
  { pattern: /\bcertbot\b/, message: 'certificate issuance instructions must stay private' },
  { pattern: /\/var\/www\/sites\//, message: 'production filesystem layout must stay private' },
  { pattern: /\/etc\/systemd\/system\//, message: 'production service paths must stay private' },
  { pattern: /\bIdentityFile\b/, message: 'SSH config snippets must stay private' },
  { pattern: /\bHostName\b/, message: 'SSH host config details must stay private' },
]

for (const filePath of publicDocs) {
  if (!fs.existsSync(filePath)) continue
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rule of forbiddenPublicDocPatterns) {
    if (rule.pattern.test(content)) {
      issues.push(`${filePath}: ${rule.message}`)
    }
  }
}

const secretContentPatterns = [
  /BEGIN OPENSSH PRIVATE KEY/,
  /BEGIN RSA PRIVATE KEY/,
  /BEGIN EC PRIVATE KEY/,
  /BEGIN CERTIFICATE/,
]

const contentScanIgnoreList = new Set(['scripts/repo-safety.mjs'])

for (const filePath of trackedFiles) {
  if (!fs.existsSync(filePath)) continue
  if (contentScanIgnoreList.has(filePath)) continue
  const stat = fs.statSync(filePath)
  if (!stat.isFile() || stat.size > 1024 * 1024) continue

  let content = ''
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch {
    continue
  }

  for (const pattern of secretContentPatterns) {
    if (pattern.test(content)) {
      issues.add(`${filePath}: secret material detected by content signature`)
    }
  }
}

if (issues.size > 0) {
  console.error('Repository safety check failed:\n')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  process.exitCode = 1
} else {
  console.log('Repository safety check passed.')
}
