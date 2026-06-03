import { leadSchema } from '../schemas.js'
import { buildTelegramMessage, sendTelegramMessageWithRetry } from '../services/telegram.js'
import { normalizeText } from '../services/text.js'

export const registerLeadRoute = (server, config) => {
  server.post('/api/lead', { schema: leadSchema }, async (request, reply) => {
    const {
      name,
      phone,
      message,
      projectId,
      projectName,
      source,
      consent,
      website,
      source_context,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer_domain,
      landing_page,
      first_utm_source,
      first_utm_medium,
      first_utm_campaign,
      first_utm_content,
      first_utm_term,
      first_referrer_domain,
      first_landing_page,
    } = request.body
    const isConsultation = source === 'consultation'
    const isCallback = source === 'callback'
    const normalizedMessage = normalizeText(message, 500)

    if (!consent) {
      reply.code(400).send({ error: 'Consent is required' })
      return
    }

    if (isConsultation && !normalizedMessage) {
      reply.code(400).send({ error: 'Message is required' })
      return
    }

    if (website) {
      reply.code(202).send({ ok: true })
      return
    }

    const payload = {
      name,
      phone,
      message: normalizedMessage,
      projectId,
      projectName,
      source,
      title: isConsultation ? 'Запрос консультации' : isCallback ? 'Заказ звонка' : undefined,
      attribution: {
        source_context,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer_domain,
        landing_page,
        first_utm_source,
        first_utm_medium,
        first_utm_campaign,
        first_utm_content,
        first_utm_term,
        first_referrer_domain,
        first_landing_page,
      },
    }

    const telegramMessage = buildTelegramMessage(payload)
    const botToken = isConsultation ? config.calcBotToken : config.telegramBotToken
    const chatId = isConsultation ? config.calcChatId : config.telegramChatId

    const sendResult = await sendTelegramMessageWithRetry({
      botToken,
      chatId,
      text: telegramMessage,
      logContext: isConsultation ? 'lead_consultation' : 'lead',
      timeoutMs: config.telegramTimeoutMs,
      retryAttempts: config.telegramRetryAttempts,
      retryBaseMs: config.telegramRetryBaseMs,
      logger: server.log,
    })

    if (!sendResult.ok) {
      reply.code(502).send({ error: 'Failed to deliver message' })
      return
    }

    server.log.info(
      {
        event: 'lead_sent',
        projectId: projectId || null,
        hasMessage: Boolean(normalizedMessage),
      },
      'Lead delivered',
    )

    reply.code(200).send({ ok: true })
  })
}
