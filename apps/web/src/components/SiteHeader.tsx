import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Button from './Button'
import { SHOW_PROJECTS } from '../config/featureFlags'
import { trackGoal } from '../utils/analytics'
import { resolveHomeSectionHref } from '../utils/navigation'

const navLinks = [
  { label: 'О компании', hash: '#about' },
  { label: 'Услуги', hash: '#services' },
  { label: 'Проекты', hash: '#projects' },
  { label: 'Построено', hash: '#gallery' },
  { label: 'Контакты', hash: '#contacts' },
]

const mobileNavPanelId = 'mobile-nav-panel'

const SiteHeader = () => {
  const [open, setOpen] = useState(false)
  const mobileNavPanelRef = useRef<HTMLDivElement | null>(null)
  const menuToggleRef = useRef<HTMLButtonElement | null>(null)
  const visibleLinks = SHOW_PROJECTS
    ? navLinks
    : navLinks.filter((link) => link.hash !== '#projects')

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const toggleButton = menuToggleRef.current

    const getFocusableElements = () => {
      if (!mobileNavPanelRef.current) return []
      return Array.from(
        mobileNavPanelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'))
    }

    const focusInitial = () => {
      const focusableElements = getFocusableElements()
      const target = focusableElements[0] ?? mobileNavPanelRef.current
      target?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement as HTMLElement | null

      if (!mobileNavPanelRef.current?.contains(activeElement)) {
        event.preventDefault()
        first.focus()
        return
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const focusRaf = window.requestAnimationFrame(focusInitial)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.cancelAnimationFrame(focusRaf)
      toggleButton?.focus()
    }
  }, [open])

  const mobileNav = open
    ? createPortal(
        <div
          className="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Мобильное меню"
          onClick={() => setOpen(false)}
        >
          <div
            id={mobileNavPanelId}
            className="mobile-nav-panel"
            ref={mobileNavPanelRef}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-nav-header">
              <a className="logo" href="/" onClick={() => setOpen(false)}>
                <img src="/images/logo.png" alt="ОДИ" width={240} height={70} />
                <small>строительная компания</small>
              </a>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Закрыть
              </Button>
            </div>
            <div className="mobile-nav-links">
              {visibleLinks.map((link) => (
                <a
                  key={link.hash}
                  href={resolveHomeSectionHref(link.hash)}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mobile-nav-actions">
              <a
                className="btn btn-outline"
                href="tel:+79244422800"
                onClick={() => {
                  trackGoal('mobile_menu_call_click', {
                    cta_location: 'mobile_menu',
                    source_context: 'mobile_menu_phone',
                  })
                  setOpen(false)
                }}
              >
                +7 924 442-28-00
              </a>
              <a
                className="btn btn-outline"
                href="https://t.me/o781781"
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackGoal('mobile_menu_telegram_click', {
                    cta_location: 'mobile_menu',
                    source_context: 'mobile_menu_telegram',
                  })
                  setOpen(false)
                }}
              >
                Telegram
              </a>
              <a
                className="btn btn-primary"
                href={resolveHomeSectionHref('#consultation')}
                onClick={() => setOpen(false)}
              >
                Получить консультацию
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a className="logo" href="/">
            <img src="/images/logo.png" alt="ОДИ" width={240} height={70} />
            <small>строительная компания</small>
          </a>
          <nav className="nav-links" aria-label="Основная навигация">
            {visibleLinks.map((link) => (
              <a key={link.hash} href={resolveHomeSectionHref(link.hash)} className="nav-link">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <a
              className="btn btn-outline btn-sm header-phone"
              href="tel:+79244422800"
              aria-label="Позвонить"
              onClick={() =>
                trackGoal('header_phone_click', {
                  cta_location: 'header',
                  source_context: 'header_phone',
                })
              }
            >
              <span className="header-phone-text">+7 924 442-28-00</span>
            </a>
            <a
              className="btn btn-primary btn-sm"
              href={resolveHomeSectionHref('#consultation')}
              onClick={() =>
                trackGoal('header_consultation_click', {
                  cta_location: 'header',
                  source_context: 'header_consultation',
                })
              }
            >
              Получить консультацию
            </a>
            <Button
              ref={menuToggleRef}
              className="menu-toggle"
              variant="ghost"
              size="sm"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={mobileNavPanelId}
              onClick={() => setOpen(true)}
            >
              Меню
            </Button>
          </div>
        </div>
      </header>
      {mobileNav}
    </>
  )
}

export default SiteHeader
