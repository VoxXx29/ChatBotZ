export async function connect(match) {
  const endpoint = process.env.CDP_ENDPOINT || 'http://localhost:9222'
  const targets = await (await fetch(`${endpoint}/json`)).json()
  const target = targets.find((t) => t.type === 'page' && (!match || t.url.includes(match)))
  if (!target)
    throw new Error(
      'Open a Chromium page with remote debugging enabled before running browser tests.',
    )
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const waiting = new Map()
  const events = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id) {
      waiting.get(m.id)?.(m)
      waiting.delete(m.id)
    } else events.push(m)
  })
  async function c(method, params = {}) {
    const key = ++id
    const p = new Promise((r) => waiting.set(key, r))
    ws.send(JSON.stringify({ id: key, method, params }))
    const m = await p
    if (m.error) throw Error(JSON.stringify(m.error))
    return m.result
  }
  async function js(expression) {
    const r = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  return { ws, c, js, events }
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms))
export function assert(test, label) {
  if (!test) throw Error(label)
  console.log('PASS', label)
}
