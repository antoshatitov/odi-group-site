export const verifyCaptchaToken = async ({
  enabled,
  secretKey,
  verifyUrl,
  expectedHostname,
  token,
  ip,
  timeoutMs,
  fetchImpl = globalThis.fetch,
}) => {
  if (!enabled) return { ok: true, skipped: true }
  if (!secretKey) return { ok: false, misconfigured: true }

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const payload = new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: ip || '',
    })

    const response = await fetchImpl(verifyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: payload,
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false, transient: true }
    }

    const data = await response.json()
    if (!data?.success) {
      return { ok: false }
    }

    if (expectedHostname && data.hostname && data.hostname !== expectedHostname) {
      return { ok: false }
    }

    return { ok: true }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, transient: true }
    }
    return { ok: false, transient: true }
  } finally {
    clearTimeout(timeout)
  }
}
