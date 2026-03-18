import type { ResponsiveImageFormat } from '../types'

export const buildResponsiveSrcSet = (
  small: ResponsiveImageFormat | undefined,
  large: ResponsiveImageFormat | undefined,
) => {
  if (!small) return ''
  if (!large || large.src === small.src) {
    return `${small.src} ${small.width}w`
  }

  return `${small.src} ${small.width}w, ${large.src} ${large.width}w`
}
