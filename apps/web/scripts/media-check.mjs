import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '..')

const budgetsPath = path.join(webDir, 'perf-budgets.json')
const gallerySourceDir = path.join(webDir, 'src', 'assets', 'builded')
const heroVideoPath = path.join(webDir, 'public', 'videos', 'hero-video.mp4')

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

const toBytesFromMb = (value) => Math.round(value * 1024 * 1024)
const formatMb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`

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

const run = async () => {
  const budgets = await readBudgets()
  const { maxOriginalImageMb, maxHeroVideoMb, maxGallerySourceTotalMb } = budgets.mediaBudgets

  const sourceFiles = await collectFiles(gallerySourceDir)
  const imageFiles = sourceFiles.filter((filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()))

  if (imageFiles.length === 0) {
    throw new Error('No gallery source images found in apps/web/src/assets/builded.')
  }

  const imageStats = await Promise.all(
    imageFiles.map(async (filePath) => {
      const stat = await fs.stat(filePath)
      return { filePath, size: stat.size }
    }),
  )

  const heroVideoStat = await fs.stat(heroVideoPath)

  const largestImageBytes = imageStats.reduce((largest, file) => Math.max(largest, file.size), 0)
  const totalGallerySourceBytes = imageStats.reduce((sum, file) => sum + file.size, 0)
  const heroVideoBytes = heroVideoStat.size

  const checks = [
    {
      label: 'Largest source image',
      actual: largestImageBytes,
      limit: toBytesFromMb(maxOriginalImageMb),
    },
    {
      label: 'Hero video',
      actual: heroVideoBytes,
      limit: toBytesFromMb(maxHeroVideoMb),
    },
    {
      label: 'Total source gallery images',
      actual: totalGallerySourceBytes,
      limit: toBytesFromMb(maxGallerySourceTotalMb),
    },
  ]

  const violations = checks.filter((check) => check.actual > check.limit)

  console.log('Media budget report')
  for (const check of checks) {
    const status = check.actual <= check.limit ? 'PASS' : 'FAIL'
    console.log(`- ${status} ${check.label}: ${formatMb(check.actual)} / limit ${formatMb(check.limit)}`)
  }

  if (violations.length > 0) {
    console.error('\nMedia budget check failed.')
    process.exitCode = 1
    return
  }

  console.log('\nMedia budget check passed.')
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
