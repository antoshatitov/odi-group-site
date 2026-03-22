const normalizeHash = (hash: string) => (hash.startsWith('#') ? hash : `#${hash}`)

export const resolveHomeSectionHref = (hash: string) => {
  const normalizedHash = normalizeHash(hash)

  if (typeof window === 'undefined') {
    return `/${normalizedHash}`
  }

  if (window.location.pathname === '/') {
    return `${window.location.pathname}${window.location.search}${normalizedHash}`
  }

  return `/${normalizedHash}`
}
