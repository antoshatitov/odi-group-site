export type ImageAsset = {
  src: string
  alt: string
}

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

export type Project = {
  id: string
  name: string
  area: number
  floors: number
  bedrooms: number
  rooms: number
  material: string
  priceFrom: number
  duration: string
  highlight: string
  description: string
  equipment: string[]
  features: string[]
  image: ImageAsset
  gallery: ImageAsset[]
  plans: ImageAsset[]
}

export type GalleryItem = {
  id: string
  title: string
  location: string
  description: string
  cover: GalleryImageAsset
  photos: GalleryImageAsset[]
}
