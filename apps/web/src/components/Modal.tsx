import { useEffect, useRef } from 'react'

import type { ReactNode } from 'react'

type ModalProps = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  side?: ReactNode
  variant?: 'default' | 'lightbox'
  showTitle?: boolean
}

const Modal = ({
  isOpen,
  title,
  onClose,
  children,
  side,
  variant = 'default',
  showTitle = true,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const getFocusableElements = () => {
      if (!modalRef.current) return []
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'))
    }

    const focusInitial = () => {
      const focusable = getFocusableElements()
      const target = closeButtonRef.current ?? focusable[0]
      target?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusableElements()
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!modalRef.current?.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    focusInitial()
    const focusRaf = window.requestAnimationFrame(focusInitial)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      window.cancelAnimationFrame(focusRaf)
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null
  const modalClassName = [
    'modal',
    variant === 'lightbox' ? 'modal-lightbox' : '',
    side ? '' : 'modal-single-column',
  ]
    .filter(Boolean)
    .join(' ')
  const modalBodyClassName =
    `modal-body ${variant === 'lightbox' ? 'modal-body-lightbox' : ''}`.trim()

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className={modalClassName} onClick={(event) => event.stopPropagation()} ref={modalRef}>
        <div className={modalBodyClassName}>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Закрыть модальное окно"
            ref={closeButtonRef}
          >
            ✕
          </button>
          <div className="stack">
            {showTitle ? <h2 className="h2">{title}</h2> : null}
            {children}
          </div>
        </div>
        {side && <aside className="modal-side">{side}</aside>}
      </div>
    </div>
  )
}

export default Modal
