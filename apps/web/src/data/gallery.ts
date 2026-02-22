import type { GalleryImageAsset, GalleryItem, ResponsiveImageFormat, ResponsiveImageVariant } from '../types'

type VariantName = 'thumb' | 'cover' | 'full'
type ImageFormat = 'avif' | 'webp' | 'jpg'

type ParsedImageModule = {
  path: string
  src: string
  folder: string
  stem: string
  variant: VariantName
  format: ImageFormat
  width: number
  height: number
}

type ImageRecord = {
  path: string
  stem: string
  variants: Partial<Record<VariantName, Partial<Record<ImageFormat, ResponsiveImageFormat>>>>
}

const descriptionModules = import.meta.glob('../assets/builded/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const optimizedImageModules = import.meta.glob(
  '../assets/builded-optimized/**/*.{avif,webp,jpg,jpeg,JPG,JPEG}',
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>

const normalizePath = (path: string) => path.replace(/\\/g, '/').normalize('NFC')

const getFolderName = (path: string) =>
  normalizePath(path).split('/').slice(-2, -1)[0] ?? ''

const isDescriptionFile = (path: string) =>
  normalizePath(path).endsWith('/Описание.md')

const parseDescription = (raw: string) => {
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/\r/g, '').trim())
    .filter(Boolean)
  const [title = '', locationLine = '', ...rest] = lines
  const location = locationLine.replace(/^Локация:\s*/i, '').trim()
  const description = rest.join(' ')
  return { title, location, description }
}

const parseImageModule = (path: string, src: string): ParsedImageModule | null => {
  const normalizedPath = normalizePath(path)
  const folder = getFolderName(normalizedPath)
  if (!folder) return null

  const fileName = normalizedPath.split('/').at(-1)
  if (!fileName) return null

  const match = fileName.match(/(.+)__(thumb|cover|full)__([0-9]+)x([0-9]+)\.(avif|webp|jpe?g)$/i)
  if (!match) return null

  const [, stem, variant, width, height, rawFormat] = match
  const normalizedFormat = rawFormat.toLowerCase() === 'jpeg' ? 'jpg' : rawFormat.toLowerCase()

  return {
    path: normalizedPath,
    src,
    folder,
    stem,
    variant: variant as VariantName,
    format: normalizedFormat as ImageFormat,
    width: Number(width),
    height: Number(height),
  }
}

const sortRecords = (records: ImageRecord[]) =>
  records.slice().sort((a, b) => {
    const aIsTitle = /title_photo/i.test(a.path)
    const bIsTitle = /title_photo/i.test(b.path)
    if (aIsTitle !== bIsTitle) return aIsTitle ? -1 : 1

    const aIsPlan = /plan/i.test(a.path)
    const bIsPlan = /plan/i.test(b.path)
    if (aIsPlan !== bIsPlan) return aIsPlan ? 1 : -1

    return a.path.localeCompare(b.path)
  })

const formatAlt = (title: string, stem: string, index: number) => {
  if (/plan/i.test(stem)) return `${title} — планировка`
  return `${title} — фото ${index + 1}`
}

const toVariant = (
  entry: Partial<Record<ImageFormat, ResponsiveImageFormat>>,
): ResponsiveImageVariant => {
  const jpg = entry.jpg ?? entry.webp
  const webp = entry.webp ?? entry.jpg

  if (!jpg || !webp) {
    throw new Error('Missing JPG/WEBP variant for optimized gallery image')
  }

  return {
    avif: entry.avif,
    webp,
    jpg,
  }
}

const toGalleryAsset = (
  title: string,
  record: ImageRecord,
  index: number,
): GalleryImageAsset => {
  const thumbEntry = record.variants.thumb
  const coverEntry = record.variants.cover
  const fullEntry = record.variants.full

  if (!thumbEntry || !coverEntry || !fullEntry) {
    throw new Error(`Missing one of thumb/cover/full variants for image ${record.path}`)
  }

  return {
    alt: formatAlt(title, record.stem, index),
    thumb: toVariant(thumbEntry),
    cover: toVariant(coverEntry),
    full: toVariant(fullEntry),
  }
}

const imagesByFolder = Object.entries(optimizedImageModules).reduce<Record<string, ImageRecord[]>>(
  (acc, [path, src]) => {
    const parsed = parseImageModule(path, src)
    if (!parsed) return acc

    const folderRecords = acc[parsed.folder] ?? []
    let existingRecord = folderRecords.find((record) => record.stem === parsed.stem)

    if (!existingRecord) {
      existingRecord = {
        path: parsed.path,
        stem: parsed.stem,
        variants: {},
      }
      folderRecords.push(existingRecord)
    }

    const variantEntry = existingRecord.variants[parsed.variant] ?? {}
    variantEntry[parsed.format] = {
      src: parsed.src,
      width: parsed.width,
      height: parsed.height,
    }

    existingRecord.variants[parsed.variant] = variantEntry
    acc[parsed.folder] = folderRecords
    return acc
  },
  {},
)

export const galleryItems: GalleryItem[] = Object.entries(descriptionModules)
  .filter(([path]) => isDescriptionFile(path))
  .map(([path, raw], index) => {
    const folder = getFolderName(path)
    const { title, location, description } = parseDescription(raw)
    const safeTitle = title || folder || `Проект ${index + 1}`
    const records = sortRecords(imagesByFolder[folder] ?? [])
    const photos = records.map((record, photoIndex) => toGalleryAsset(safeTitle, record, photoIndex))
    if (photos.length === 0) return null

    const coverIndex = records.findIndex((record) => /title_photo/i.test(record.path))
    const coverImage = coverIndex >= 0 ? photos[coverIndex] : photos[0]

    return {
      id: folder || `builded-${index + 1}`,
      title: safeTitle,
      location,
      description,
      cover: coverImage,
      photos,
    }
  })
  .filter((item): item is GalleryItem => item !== null)
  .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
