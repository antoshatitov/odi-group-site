import { useEffect, useRef } from 'react'

export const useDeferredMapScript = (scriptSrc: string) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container || container.dataset.mapInitialized === 'true') return

    const loadMap = () => {
      if (!container || container.dataset.mapInitialized === 'true') return

      const script = document.createElement('script')
      script.src = scriptSrc
      script.async = true
      script.charset = 'utf-8'
      container.appendChild(script)
      container.dataset.mapInitialized = 'true'
    }

    if (!('IntersectionObserver' in window)) {
      loadMap()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMap()
          observer.disconnect()
        }
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [scriptSrc])

  return mapContainerRef
}
