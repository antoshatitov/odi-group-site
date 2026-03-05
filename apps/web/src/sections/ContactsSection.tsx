import type { RefObject } from 'react'

import Badge from '../components/Badge'
import Card from '../components/Card'
import Container from '../components/Container'
import Section from '../components/Section'
import { trackGoal } from '../utils/analytics'

type ContactsSectionProps = {
  mapContainerRef: RefObject<HTMLDivElement>
}

const ContactsSection = ({ mapContainerRef }: ContactsSectionProps) => {
  return (
    <Section id="contacts">
      <Container>
        <div className="contact-grid">
          <Card className="contact-card">
            <span className="eyebrow">Контакты</span>
            <h2 className="h2">Свяжитесь с нами удобным способом</h2>
            <div className="stack">
              <div>
                <strong>Телефон</strong>
                <div>
                  <a
                    href="tel:+79244422800"
                    onClick={() =>
                      trackGoal('contacts_phone_click', {
                        cta_location: 'contacts',
                        source_context: 'contacts_phone',
                      })
                    }
                  >
                    +7 924 442-28-00
                  </a>
                </div>
              </div>
              <div>
                <strong>Email</strong>
                <div>
                  <a href="mailto:bon2801@yandex.ru">bon2801@yandex.ru</a>
                </div>
              </div>
              <div>
                <strong>Мессенджеры</strong>
                <div className="hero-actions">
                  <a
                    className="btn btn-outline btn-sm"
                    href="https://t.me/o781781"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      trackGoal('contacts_telegram_click', {
                        cta_location: 'contacts',
                        source_context: 'contacts_telegram',
                      })
                    }
                  >
                    Telegram
                  </a>
                </div>
              </div>
              <div>
                <strong>Адрес</strong>
                <div>Калининград, ул. Третьяковская 2, офис 209</div>
              </div>
              <Badge>Работаем пн-сб с 9:00 до 19:00</Badge>
            </div>
          </Card>
          <div className="map-frame">
            <div className="map-widget" ref={mapContainerRef} />
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default ContactsSection
