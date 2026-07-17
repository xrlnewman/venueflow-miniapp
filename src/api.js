const API_BASE = (import.meta.env.VITE_API_BASE || '/api/v1').replace(/\/$/, '')
export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.code !== 0) throw new Error(body.message || '接口请求失败')
  return body.data
}
function write(path, payload = {}) { return request(path, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(payload) }) }
export const fleetApi = {
  shipments: () => request('/shipments?page=1&pageSize=20'),
  exceptions: () => request('/exceptions?status=待处理'),
  assign: (id, driver) => write(`/shipments/${encodeURIComponent(id)}/assign`, { driver, actor: '周师傅' }),
  advance: (id, status) => write(`/shipments/${encodeURIComponent(id)}/status`, { status, actor: '周师傅', note: '场馆工作人员端操作' }),
  resolveException: (id) => write(`/exceptions/${encodeURIComponent(id)}/resolve`)
}

export const venueApi = {
  venues: () => request('/venues'),
  sessions: () => request('/sessions?page=1&pageSize=20'),
  session: (id) => request(`/sessions/${encodeURIComponent(id)}`),
  events: (id) => request(`/sessions/${encodeURIComponent(id)}/events`),
  publish: (id) => write(`/sessions/${encodeURIComponent(id)}/publish`, { actor: '运营主管' }),
  sell: (id, quantity = 1) => write(`/sessions/${encodeURIComponent(id)}/sell`, { quantity, actor: '运营主管' }),
  checkin: (id, ticketCode) => write(`/sessions/${encodeURIComponent(id)}/checkin`, { ticketCode, actor: '现场工作人员' }),
  advance: (id, status) => write(`/sessions/${encodeURIComponent(id)}/status`, { status, actor: '运营主管' }),
  settle: (id) => write(`/sessions/${encodeURIComponent(id)}/settle`, { actor: '运营主管' })
}
