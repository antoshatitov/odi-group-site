import { useEffect } from 'react'

import Card from '../components/Card'
import Container from '../components/Container'
import Section from '../components/Section'

type LegalPageProps = {
  title: string
  updated: string
  children: React.ReactNode
}

const LegalPage = ({ title, updated, children }: LegalPageProps) => {
  useEffect(() => {
    document.title = `${title} — ОДИ`
  }, [title])

  return (
    <Section className="legal-page">
      <Container>
        <Card>
          <div className="stack">
            <span className="eyebrow">Правовая информация</span>
            <h1 className="h2">{title}</h1>
            <span className="muted">Обновлено: {updated}</span>
            <div className="divider" />
            <div className="stack" style={{ gap: 'var(--space-4)' }}>
              {children}
              <div className="stack">
                <strong>Реквизиты компании</strong>
                <p>
                  ООО «ОДИГРУПП»
                  <br />
                  ОГРН: 1232000006754
                  <br />
                  ИНН: 2016007291
                  <br />
                  Дата регистрации: 09.08.2023
                  <br />
                  КПП: 201601001
                </p>
              </div>
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  )
}

export default LegalPage
