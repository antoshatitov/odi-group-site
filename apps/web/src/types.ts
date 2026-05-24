export type ResponsiveImageFormat = {
  src: string
  width: number
  height: number
}

export type ResponsiveImageVariant = {
  avif?: ResponsiveImageFormat
  webp: ResponsiveImageFormat
  jpg: ResponsiveImageFormat
}

export type GalleryImageAsset = {
  alt: string
  thumb: ResponsiveImageVariant
  cover: ResponsiveImageVariant
  full: ResponsiveImageVariant
}

export type GalleryItem = {
  id: string
  title: string
  location: string
  description: string
  cover: GalleryImageAsset
  photos: GalleryImageAsset[]
}
