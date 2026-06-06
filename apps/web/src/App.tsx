import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import SiteFooter from './components/SiteFooter'
import SiteHeader from './components/SiteHeader'
import { trackPageView } from './lib/analytics'
import Home from './pages/Home'

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
  return (
    <div>
      <ScrollToTop />
      <a className="skip-link" href="#main-content">
        Перейти к основному содержанию
      </a>
      <SiteHeader />
      <main id="main-content">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/cookies" element={<Cookies />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}

export default App
