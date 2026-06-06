import type { ContactIconName } from '../components/ContactIcon'
import { analyticsGoals, type AnalyticsGoal } from '../lib/analytics'

export type ContactChannel = {
  label: string
  href: string
  icon: ContactIconName
  analyticsGoal: AnalyticsGoal
  isExternal?: boolean
}

export const messengerChannels: ContactChannel[] = [
  {
    label: 'Telegram',
    href: 'https://t.me/o781781',
    icon: 'telegram',
    analyticsGoal: analyticsGoals.messengerTelegramClick,
    isExternal: true,
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/79244422800',
    icon: 'whatsapp',
    analyticsGoal: analyticsGoals.messengerWhatsappClick,
    isExternal: true,
  },
  {
    label: 'Max',
    href: 'https://max.ru/join/fdrnM62z2f4uZVGWfSkErLawYek94U1XwY-_BbbZJQU',
    icon: 'max',
    analyticsGoal: analyticsGoals.messengerMaxClick,
    isExternal: true,
  },
  {
    label: 'VK',
    href: 'https://vk.com/club237637702',
    icon: 'vk',
    analyticsGoal: analyticsGoals.messengerVkClick,
    isExternal: true,
  },
]

export const heroContactChannels: ContactChannel[] = [
  messengerChannels[0],
  messengerChannels[1],
  messengerChannels[2],
  messengerChannels[3],
]
