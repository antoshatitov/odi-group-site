import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '..')

const sourceRoot = path.join(webDir, 'src', 'assets', 'builded')
const outputRoot = path.join(webDir, 'src', 'assets', 'builded-optimized')

const sourceExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const execFileAsync = promisify(execFile)

const variantProfiles = [
  {
    name: 'thumb',
    maxWidth: 320,
    avifQuality: 48,
    webpQuality: 64,
    jpgQuality: 70,
  },
  {
    name: 'cover',
    maxWidth: 960,
    avifQuality: 52,
    webpQuality: 70,
    jpgQuality: 74,
  },
  {
    name: 'full',
    maxWidth: 1920,
    avifQuality: 58,
    webpQuality: 76,
    jpgQuality: 78,
  },
]

const collectSourceImages = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceImages(fullPath)))
      continue
    }

    const extension = path.extname(entry.name).toLowerCase()
    if (!sourceExtensions.has(extension)) continue
    files.push(fullPath)
  }

  return files
}

const buildResizeConfig = (maxWidth) => ({
  width: maxWidth,
  fit: 'inside',
  withoutEnlargement: true,
})

const makeTempFilePath = () => {
  const random = Math.random().toString(36).slice(2, 10)
  return path.join(os.tmpdir(), `odi-media-${Date.now()}-${random}.jpg`)
}

const run = async () => {
  const sourceImages = await collectSourceImages(sourceRoot)
  if (sourceImages.length === 0) {
    throw new Error('No source images found in apps/web/src/assets/builded.')
  }

  await fs.rm(outputRoot, { recursive: true, force: true })

  let avifEnabled = true
  const fallbackPaths = []

  for (const sourcePath of sourceImages) {
    const relativePath = path.relative(sourceRoot, sourcePath)
    const parsed = path.parse(relativePath)
    const outputDir = path.join(outputRoot, parsed.dir)
    const baseName = parsed.name

    await fs.mkdir(outputDir, { recursive: true })

    const processProfiles = async (inputPath) => {
      for (const profile of variantProfiles) {
        const resizeConfig = buildResizeConfig(profile.maxWidth)

        const jpgResult = await sharp(inputPath)
          .rotate()
          .resize(resizeConfig)
          .jpeg({ quality: profile.jpgQuality, mozjpeg: true })
          .toBuffer({ resolveWithObject: true })

        const width = jpgResult.info.width
        const height = jpgResult.info.height
        const outputName = `${baseName}__${profile.name}__${width}x${height}`

        const jpgPath = path.join(outputDir, `${outputName}.jpg`)
        await fs.writeFile(jpgPath, jpgResult.data)

        const webpBuffer = await sharp(inputPath)
          .rotate()
          .resize(resizeConfig)
          .webp({ quality: profile.webpQuality })
          .toBuffer()

        const webpPath = path.join(outputDir, `${outputName}.webp`)
        await fs.writeFile(webpPath, webpBuffer)

        if (avifEnabled) {
          try {
            const avifBuffer = await sharp(inputPath)
              .rotate()
              .resize(resizeConfig)
              .avif({ quality: profile.avifQuality })
              .toBuffer()

            const avifPath = path.join(outputDir, `${outputName}.avif`)
            await fs.writeFile(avifPath, avifBuffer)
          } catch (error) {
            avifEnabled = false
            console.warn(`AVIF generation disabled: ${error.message}`)
          }
        }
      }
    }

    try {
      await processProfiles(sourcePath)
    } catch (error) {
      if (process.platform !== 'darwin') {
        throw error
      }

      const tempPath = makeTempFilePath()
      await execFileAsync('sips', ['-s', 'format', 'jpeg', sourcePath, '--out', tempPath])
      fallbackPaths.push(tempPath)
      await processProfiles(tempPath)
    }
  }

  const generatedFiles = await collectSourceImages(outputRoot)
  console.log(`Optimized media generated: ${sourceImages.length} source images -> ${generatedFiles.length} files.`)

  await Promise.all(fallbackPaths.map((tempPath) => fs.rm(tempPath, { force: true })))
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
