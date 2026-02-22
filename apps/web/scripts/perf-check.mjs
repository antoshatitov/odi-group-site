import { gzipSync } from 'node:zlib'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '..')

const budgetsPath = path.join(webDir, 'perf-budgets.json')
const distAssetsDir = path.join(webDir, 'dist', 'assets')

const toBytesFromKb = (value) => Math.round(value * 1024)
const formatKb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

const readBudgets = async () => {
  const raw = await fs.readFile(budgetsPath, 'utf8')
  return JSON.parse(raw)
}

const collectFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)))
      continue
    }
    files.push(fullPath)
  }

  return files
}

const pickMainAsset = (files, extension) => {
  const byExt = files.filter((file) => file.endsWith(extension))
  if (byExt.length === 0) return null

  const indexEntry = byExt.find((file) => /\/index-[^/]+\./.test(file))
  if (indexEntry) return indexEntry

  return byExt.sort().at(0) ?? null
}

const run = async () => {
  const budgets = await readBudgets()
  const {
    maxMainJsGzipKb,
    maxMainCssKb,
    maxTotalDistAssetsKb,
    maxLargestDistAssetKb,
  } = budgets.assetBudgets

  const files = await collectFiles(distAssetsDir)
  if (files.length === 0) {
    throw new Error('No build assets found in apps/web/dist/assets. Run build first.')
  }

  const fileStats = await Promise.all(
    files.map(async (filePath) => {
      const stat = await fs.stat(filePath)
      return { filePath, size: stat.size }
    }),
  )

  const mainJsPath = pickMainAsset(files, '.js')
  const mainCssPath = pickMainAsset(files, '.css')

  if (!mainJsPath || !mainCssPath) {
    throw new Error('Unable to locate main JS/CSS assets in build output.')
  }

  const [mainJsContent, mainCssStat] = await Promise.all([
    fs.readFile(mainJsPath),
    fs.stat(mainCssPath),
  ])

  const mainJsGzipBytes = gzipSync(mainJsContent).byteLength
  const mainCssBytes = mainCssStat.size
  const totalDistAssetsBytes = fileStats.reduce((sum, file) => sum + file.size, 0)
  const largestDistAssetBytes = fileStats.reduce((largest, file) => Math.max(largest, file.size), 0)

  const checks = [
    {
      label: 'Main JS gzip',
      actual: mainJsGzipBytes,
      limit: toBytesFromKb(maxMainJsGzipKb),
    },
    {
      label: 'Main CSS',
      actual: mainCssBytes,
      limit: toBytesFromKb(maxMainCssKb),
    },
    {
      label: 'Total dist assets',
      actual: totalDistAssetsBytes,
      limit: toBytesFromKb(maxTotalDistAssetsKb),
    },
    {
      label: 'Largest dist asset',
      actual: largestDistAssetBytes,
      limit: toBytesFromKb(maxLargestDistAssetKb),
    },
  ]

  const violations = checks.filter((check) => check.actual > check.limit)

  console.log('Performance budget report')
  for (const check of checks) {
    const status = check.actual <= check.limit ? 'PASS' : 'FAIL'
    console.log(
      `- ${status} ${check.label}: ${formatKb(check.actual)} / limit ${formatKb(check.limit)}`,
    )
  }

  if (violations.length > 0) {
    console.error('\nPerformance budget check failed.')
    process.exitCode = 1
    return
  }

  console.log('\nPerformance budget check passed.')
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
