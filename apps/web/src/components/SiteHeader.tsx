import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Button from './Button'
import LeadForm from './LeadForm'
import Modal from './Modal'
import ContactIcon from './ContactIcon'
import { messengerChannels } from '../data/contactChannels'
import { SHOW_SALE_SECTION } from '../data/showcaseGalleries'
import { trackGoal } from '../utils/analytics'
import { resolveHomeSectionHref } from '../utils/navigation'

const navLinks = [
  { label: 'Построено', hash: '#gallery' },
  ...(SHOW_SALE_SECTION ? [{ label: 'Продажа', hash: '#sale' }] : []),
  { label: 'Проекты', hash: '#projects' },
  { label: 'О компании', hash: '#about' },
  { label: 'Услуги', hash: '#services' },
  { label: 'Контакты', hash: '#contacts' },
]

const mobileNavPanelId = 'mobile-nav-panel'

type BodyScrollLockStyles = {
  left: string
  overflow: string
  position: string
  right: string
  top: string
  width: string
}

const SiteHeader = () => {
  const [open, setOpen] = useState(false)
  const [isCallbackOpen, setIsCallbackOpen] = useState(false)
  const mobileNavPanelRef = useRef<HTMLDivElement | null>(null)
  const menuToggleRef = useRef<HTMLButtonElement | null>(null)
  const lockedScrollYRef = useRef(0)
  const previousBodyStylesRef = useRef<BodyScrollLockStyles | null>(null)
  const skipScrollRestoreRef = useRef(false)

  const openMenu = () => {
    skipScrollRestoreRef.current = false
    setOpen(true)
  }

  const closeMenu = ({ restoreScroll = true }: { restoreScroll?: boolean } = {}) => {
    skipScrollRestoreRef.current = !restoreScroll
    setOpen(false)
  }

  const openCallbackModal = () => {
    trackGoal('header_callback_click', {
      cta_location: 'header',
      source_context: 'header_callback',
    })
    setIsCallbackOpen(true)
  }

  useEffect(() => {
    if (!open) return

    const bodyStyle = document.body.style
    lockedScrollYRef.current = window.scrollY
    previousBodyStylesRef.current = {
      left: bodyStyle.left,
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      right: bodyStyle.right,
      top: bodyStyle.top,
      width: bodyStyle.width,
    }

    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${lockedScrollYRef.current}px`
    bodyStyle.left = '0'
    bodyStyle.right = '0'
    bodyStyle.width = '100%'
    bodyStyle.overflow = 'hidden'

    return () => {
      const previousBodyStyles = previousBodyStylesRef.current
      if (previousBodyStyles) {
        bodyStyle.position = previousBodyStyles.position
        bodyStyle.top = previousBodyStyles.top
        bodyStyle.left = previousBodyStyles.left
        bodyStyle.right = previousBodyStyles.right
        bodyStyle.width = previousBodyStyles.width
        bodyStyle.overflow = previousBodyStyles.overflow
      }
      previousBodyStylesRef.current = null

      if (!skipScrollRestoreRef.current) {
        const rootStyle = document.documentElement.style
        const previousScrollBehavior = rootStyle.scrollBehavior
        rootStyle.scrollBehavior = 'auto'
        window.scrollTo(0, lockedScrollYRef.current)
        rootStyle.scrollBehavior = previousScrollBehavior
      }

      skipScrollRestoreRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const toggleButton = menuToggleRef.current
    mobileNavPanelRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    const getFocusableElements = () => {
      if (!mobileNavPanelRef.current) return []
      return Array.from(
        mobileNavPanelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'))
    }

    const focusInitial = () => {
      if (mobileNavPanelRef.current) {
        mobileNavPanelRef.current.scrollTop = 0
      }
      const focusableElements = getFocusableElements()
      const target = focusableElements[0] ?? mobileNavPanelRef.current
      target?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
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
          onClick={() => closeMenu()}
        >
          <div
            id={mobileNavPanelId}
            className="mobile-nav-panel"
            ref={mobileNavPanelRef}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-nav-header">
              <a className="logo" href="/" onClick={() => closeMenu()}>
                <img src="/images/logo.png" alt="ОДИ" width={240} height={70} />
                <small>строительная компания</small>
              </a>
              <Button variant="ghost" size="sm" onClick={() => closeMenu()}>
                Закрыть
              </Button>
            </div>
            <div className="mobile-nav-links">
              {navLinks.map((link) => (
                <a
                  key={link.hash}
                  href={resolveHomeSectionHref(link.hash)}
                  onClick={() => closeMenu({ restoreScroll: false })}
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
                  closeMenu()
                }}
              >
                +7 924 442-28-00
              </a>
              <div className="mobile-nav-messengers" aria-label="Мессенджеры ОДИ">
                {messengerChannels.map((channel) => {
                  const goalKey = channel.label.toLowerCase()

                  return (
                    <a
                      className="contact-channel-link mobile-nav-messenger"
                      href={channel.href}
                      key={channel.label}
                      target={channel.isExternal ? '_blank' : undefined}
                      rel={channel.isExternal ? 'noreferrer' : undefined}
                      onClick={() => {
                        trackGoal(`mobile_menu_${goalKey}_click`, {
                          cta_location: 'mobile_menu',
                          source_context: `mobile_menu_${goalKey}`,
                        })
                        closeMenu()
                      }}
                    >
                      <ContactIcon icon={channel.icon} className="contact-channel-icon" />
                      <span>{channel.label}</span>
                    </a>
                  )
                })}
              </div>
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
            {navLinks.map((link) => (
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
            <Button className="btn-sm" onClick={openCallbackModal} type="button">
              Заказать звонок
            </Button>
            <Button
              ref={menuToggleRef}
              className="menu-toggle"
              variant="ghost"
              size="sm"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={mobileNavPanelId}
              onClick={openMenu}
            >
              Меню
            </Button>
          </div>
        </div>
      </header>
      {mobileNav}
      <Modal
        isOpen={isCallbackOpen}
        title="Заказать звонок"
        onClose={() => setIsCallbackOpen(false)}
      >
        <div className="callback-modal-content">
          <p className="callback-modal-lead">
            Оставьте заявку, и мы свяжемся с вами в ближайшее время.
          </p>
          <LeadForm
            className="callback-form"
            source="callback"
            messageMode="hidden"
            autoPrefixRussianPhone
            submitLabel="Заказать звонок"
            successMessage="Спасибо! Мы перезвоним вам в ближайшее время."
          />
        </div>
      </Modal>
    </>
  )
}

export default SiteHeader
