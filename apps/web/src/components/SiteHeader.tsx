import { useEffect, useState } from 'react'

import Button from './Button'
import { SHOW_PROJECTS } from '../config/featureFlags'

const navLinks = [
  { label: 'О компании', href: '/#about' },
  { label: 'Услуги', href: '/#services' },
  { label: 'Проекты', href: '/#projects' },
  { label: 'Построено', href: '/#gallery' },
  { label: 'Контакты', href: '/#contacts' },
]

const SiteHeader = () => {
  const [open, setOpen] = useState(false)
  const visibleLinks = SHOW_PROJECTS
    ? navLinks
    : navLinks.filter((link) => link.href !== '/#projects')

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="logo" href="/">
          <img src="/images/logo.png" alt="ОДИ" width={240} height={70} />
          <small>строительная компания</small>
        </a>
        <nav className="nav-links" aria-label="Основная навигация">
          {visibleLinks.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a
            className="btn btn-outline btn-sm header-phone"
            href="tel:+79244422800"
            aria-label="Позвонить"
          >
            <span className="header-phone-text">+7 924 442-28-00</span>
          </a>
          <a className="btn btn-primary btn-sm" href="/#consultation">
            Получить консультацию
          </a>
          <Button
            className="menu-toggle"
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setOpen(true)}
          >
            Меню
          </Button>
        </div>
      </div>
      {open && (
        <div
          className="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Мобильное меню"
          onClick={() => setOpen(false)}
        >
          <div className="mobile-nav-panel" onClick={(event) => event.stopPropagation()}>
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
                <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mobile-nav-actions">
              <a className="btn btn-outline" href="tel:+79244422800">
                +7 924 442-28-00
              </a>
              <a className="btn btn-primary" href="/#consultation" onClick={() => setOpen(false)}>
                Получить консультацию
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default SiteHeader
