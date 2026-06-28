import { Suspense, lazy, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import Badge from './components/Badge'
import SiteFooter from './components/SiteFooter'
import SiteHeader from './components/SiteHeader'
import Modal from './components/Modal'
import { trackPageView } from './lib/analytics'
import Home from './pages/Home'

const CostCalculator = lazy(() => import('./components/CostCalculator'))
const Policy = lazy(() => import('./pages/Policy'))
const Consent = lazy(() => import('./pages/Consent'))
const Cookies = lazy(() => import('./pages/Cookies'))

const ScrollToTop = () => {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    trackPageView(window.location.href)
  }, [pathname, search])

  return null
}

const App = () => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const openCalculator = () => setIsCalculatorOpen(true)
  const closeCalculator = () => setIsCalculatorOpen(false)

  return (
    <div>
      <ScrollToTop />
      <a className="skip-link" href="#main-content">
        Перейти к основному содержанию
      </a>
      <SiteHeader onOpenCalculator={openCalculator} />
      <main id="main-content">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home onOpenCalculator={openCalculator} />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/cookies" element={<Cookies />} />
          </Routes>
        </Suspense>
      </main>
      <Modal
        isOpen={isCalculatorOpen}
        title="Расчет стоимости строительства"
        onClose={closeCalculator}
        side={
          <div className="stack">
            <Badge>Персональный расчет</Badge>
            <p className="muted">
              Оценка носит ориентировочный характер. Финальную смету уточняем после консультации и
              анализа участка.
            </p>
            <div className="divider" />
            <div className="stack" style={{ gap: 'var(--space-3)' }}>
              <div>
                <strong>Ответ в течение 2 часов</strong>
                <div className="muted">Свяжемся по телефону и уточним детали проекта.</div>
              </div>
              <div>
                <strong>Безопасно и конфиденциально</strong>
                <div className="muted">Используем данные только для расчета и консультации.</div>
              </div>
              <div>
                <strong>Прозрачная смета</strong>
                <div className="muted">Покажем стоимость по этапам и закрепим в договоре.</div>
              </div>
            </div>
          </div>
        }
      >
        <Suspense fallback={<div className="muted">Загружаем…</div>}>
          <CostCalculator />
        </Suspense>
      </Modal>
      <SiteFooter />
    </div>
  )
}

export default App
