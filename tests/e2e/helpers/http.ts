const requestRetryDelayMs = 500
const requestRetryAttempts = 20

export async function e2eFetch(baseURL: string, pathname: string, init?: RequestInit) {
  const url = `${baseURL}${pathname}`
  let lastError: unknown

  for (let attempt = 1; attempt <= requestRetryAttempts; attempt += 1) {
    try {
      const response = await fetch(url, init)
      if (response.status < 500) return response

      lastError = new Error(`HTTP ${response.status}: ${await response.text()}`)
    } catch (error) {
      lastError = error
    }

    if (attempt < requestRetryAttempts) await delay(requestRetryDelayMs)
  }

  throw new Error(`E2E request failed after ${requestRetryAttempts} attempts: ${url}`, { cause: lastError })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
