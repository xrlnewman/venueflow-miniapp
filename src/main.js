import './styles.css'
import './extra.css'
import { fleetApi, venueApi } from './api'

const fallback = [
  { id: 'VN-260716-018', route: '会展中心 → A 厅', cargo: '品牌发布会 · 500 人', status: '进行中', eta: '14:35', tone: 'blue' },
  { id: 'VN-260716-017', route: '艺术馆 → B 厅', cargo: '艺术展览 · 300 人', status: '已锁场', eta: '15:10', tone: 'orange' },
  { id: 'VN-260716-016', route: '城市公园 → 草坪', cargo: '音乐节 · 800 人', status: '已完成', eta: '已撤场', tone: 'green' }
]
const sessionFallback = [
  { id: 'VS-DEMO-001', title: '城市夜跑 · 夏季站', venueId: 'VEN-001', venueName: '云栖会展中心', startsAt: '2026-07-20T18:00:00Z', endsAt: '2026-07-20T21:00:00Z', capacity: 500, sold: 326, checkedIn: 188, price: 99, status: '售票中' },
  { id: 'VS-DEMO-002', title: '独立摄影展导览', venueId: 'VEN-002', venueName: '星河艺术馆', startsAt: '2026-07-21T14:00:00Z', endsAt: '2026-07-21T17:30:00Z', capacity: 240, sold: 240, checkedIn: 0, price: 68, status: '已排期' }
]
const app = document.querySelector('#app')
const state = { shipments: fallback, sessions: sessionFallback, venues: [], ticket: null, exceptions: [{ id: 'EX-041', shipmentId: fallback[0].id, text: '预计晚到 18 分钟', level: '高', type: '设备告警' }], live: false, toastTimer: null }
const tone = (status) => ({ 进行中: 'blue', 已锁场: 'orange', 待预订: 'purple', 待结算: 'blue', 已完成: 'green' }[status] || 'orange')
const nextStatus = (status) => ({ 进行中: '待结算', 待结算: '已完成' }[status] || '')
function toast(message) { const el = document.querySelector('.toast'); el.textContent = message; el.hidden = false; clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => { el.hidden = true }, 1900) }
async function load() { try { const [shipments, exceptions, venues, sessions] = await Promise.all([fleetApi.shipments(), fleetApi.exceptions(), venueApi.venues(), venueApi.sessions()]); state.shipments = shipments.list.map((item) => ({ ...item, tone: tone(item.status) })); state.exceptions = exceptions.list.map((item) => ({ ...item, shipmentId: item.shipmentId || item.id, type: item.type || '场地事件提醒', text: item.text || item.note || '待核对现场异常' })); state.venues = venues.list; state.sessions = sessions.list.map((item) => ({ ...item, tone: tone(item.status), venueName: state.venues.find((venue) => venue.id === item.venueId)?.name || item.venueId })); state.live = true; render(); toast('已同步线上活动与场馆') } catch { state.live = false; render() } }
async function run(action) {
  try { await action(); await load() } catch (error) { toast(error.message) }
}
async function buySession(id) {
  try { const result = await venueApi.sell(id, 1); state.ticket = result.tickets?.[0] || null; await load(); render(); toast(state.ticket ? `票码 ${state.ticket.code} 已生成` : '购票成功') } catch (error) { toast(error.message) }
}
async function checkinTicket() {
  if (!state.ticket) return
  try { state.ticket = await venueApi.checkin(state.ticket.sessionId, state.ticket.code); render(); toast('票码核销成功，已记录入场') } catch (error) { toast(error.message) }
}
function card(item) {
  const action = item.status === '待预订' || item.status === '已锁场' ? `<button class="track action" data-action="assign" data-id="${item.id}">确认锁场　→</button>` : item.status === '进行中' || item.status === '待结算' ? `<button class="track action" data-action="advance" data-id="${item.id}">${item.status === '进行中' ? '提交结算　→' : '完成归档　→'}</button>` : '<div class="closed">✓ 已完成闭环</div>'
  return `<article class="shipment ${item.tone}"><div class="card-top"><span class="code">${item.id}</span><b>${item.status}</b></div><h4>${item.route}</h4><p>${item.cargo} · ${item.eta}</p><div class="route"><span>入场点</span><i></i><span>${item.status}</span><i></i><span>撤场点</span></div>${action}</article>`
}
function sessionCard(item) {
  const soldRate = item.capacity ? Math.round((item.sold / item.capacity) * 100) : 0
  const action = item.status === '已排期' ? `<button class="session-action" data-action="sell-session" data-id="${item.id}">购票　→</button>` : item.status === '售票中' ? `<button class="session-action" data-action="sell-session" data-id="${item.id}">再买 1 张　→</button>` : item.status === '活动中' ? `<button class="session-action" data-action="pending-settlement" data-id="${item.id}">进入结算　→</button>` : item.status === '待结算' ? `<button class="session-action" data-action="settle-session" data-id="${item.id}">完成日结　→</button>` : '<span class="session-done">状态已同步</span>'
  return `<article class="session-card"><div class="session-meta"><span>${item.id}</span><b class="session-status ${item.tone || 'orange'}">${item.status}</b></div><h4>${item.title}</h4><p class="session-venue">⌖ ${item.venueName || item.venueId} · ${new Date(item.startsAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p><div class="session-stats"><span><strong>${item.sold}</strong> 已售</span><span><strong>${item.checkedIn || 0}</strong> 已核销</span><span><strong>¥${item.price}</strong> 票价</span></div><div class="session-progress"><i style="width:${Math.min(soldRate, 100)}%"></i></div><div class="session-footer"><small>${item.sold}/${item.capacity} 个名额</small>${action}</div></article>`
}
function render() {
  const pending = state.shipments.filter((item) => item.status !== '已完成' && item.status !== '已取消').length
  const exception = state.exceptions[0]
  app.innerHTML = `<main class="mobile-shell"><header class="top"><div><p>VENUEFLOW / 2026</p><h1>让每场活动<br><b>都有稳妥落点</b></h1></div><span class="avatar">许</span></header><section class="hero"><div><span class="eyebrow">场馆运营工作台 · ${state.live ? '线上同步' : '演示模式'}</span><h2>周协调员，下午好<br>还有 ${pending} 单待完成</h2><p>实时同步活动、场地与事件提醒</p></div><div class="hero-orbit">↗</div></section><section class="quick"><button data-action="scan"><b>＋</b><span>确认锁场</span></button><button data-action="route"><b>⌁</b><span>我的场地</span></button><button data-action="sign"><b>✓</b><span>活动记录</span></button></section><section class="section-head"><h3>今日活动订单 <small>${state.shipments.length} 单</small></h3><a data-action="all">查看全部 →</a></section><section class="cards">${state.shipments.map(card).join('')}</section><section class="section-head session-head"><h3>场次与票务 <small>${state.sessions.length} 场</small></h3><span>现场核销 · 日结</span></section>${state.ticket ? `<article class="ticket-card"><div><span>入场票码</span><strong>${state.ticket.code}</strong><small>${state.ticket.status === '已核销' ? '已核销 · 入场记录已同步' : '待入场 · 仅限本场次使用'}</small></div><button data-action="checkin-ticket">${state.ticket.status === '已核销' ? '已核销' : '核销票码'}</button></article>` : ''}<section class="session-list">${state.sessions.map(sessionCard).join('')}</section><section class="section-head"><h3>场地事件提醒 <small class="red">${state.exceptions.length} 条</small></h3><a data-action="exception">处理 →</a></section>${exception ? `<article class="alert"><span>!</span><div><strong>${exception.shipmentId} ${exception.type || '场地事件提醒'}</strong><p>${exception.text}</p><button class="alert-action" data-action="resolve" data-id="${exception.id}">标记已处理</button></div></article>` : '<article class="alert empty-alert"><span>✓</span><div><strong>今日场地事件已全部闭环</strong><p>活动运行正常，继续保持。</p></div></article>'}<nav class="tabbar"><button class="active">⌂<small>工作台</small></button><button data-action="all">▤<small>活动订单池</small></button><button data-action="route">◎<small>我的场地</small></button><button data-action="sign">◉<small>我的</small></button></nav><div class="toast" hidden></div></main>`
  document.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => {
    const action = el.dataset.action; const item = state.shipments.find((row) => row.id === el.dataset.id)
    if (action === 'assign' && item) return run(() => fleetApi.assign(item.id, '周协调员'))
    if (action === 'advance' && item) return run(() => fleetApi.advance(item.id, nextStatus(item.status)))
    if (action === 'resolve' && el.dataset.id) return run(() => fleetApi.resolveException(el.dataset.id))
    if (action === 'sell-session' && el.dataset.id) return buySession(el.dataset.id)
    if (action === 'pending-settlement' && el.dataset.id) return run(() => venueApi.advance(el.dataset.id, '待结算'))
    if (action === 'settle-session' && el.dataset.id) return run(() => venueApi.settle(el.dataset.id))
    if (action === 'checkin-ticket') return checkinTicket()
    toast(({ scan: '请点击待预订活动订单完成锁场确认', route: '今日场地已更新', sign: '活动记录已加载', all: '活动订单池正在同步', exception: state.exceptions.length ? '请先处理场地事件' : '暂无待处理场地事件' })[action] || '操作已完成')
  }))
}
render()
load()
