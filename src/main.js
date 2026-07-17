import './styles.css'
import './extra.css'
import { fleetApi } from './api'

const fallback = [
  { id: 'FF-260716-018', route: '浦东新区 → 静安区', cargo: '生鲜 12 箱', status: '现场服务中', eta: '14:35', tone: 'blue' },
  { id: 'FF-260716-017', route: '虹桥 → 徐汇区', cargo: '餐饮食材 28 箱', status: '待接单', eta: '15:10', tone: 'orange' },
  { id: 'FF-260716-016', route: '杨浦区 → 宝山区', cargo: '电商包裹 86 件', status: '已完成', eta: '已签收', tone: 'green' }
]
const app = document.querySelector('#app')
const state = { shipments: fallback, exceptions: [{ id: 'EX-041', shipmentId: fallback[0].id, text: '预计晚到 18 分钟', level: '高' }], live: false, toastTimer: null }
const tone = (status) => ({ 现场服务中: 'blue', 待接单: 'orange', 待调度: 'purple', 已送达: 'blue', 已完成: 'green' }[status] || 'orange')
const nextStatus = (status) => ({ 现场服务中: '已送达', 已送达: '已完成' }[status] || '')
function toast(message) { const el = document.querySelector('.toast'); el.textContent = message; el.hidden = false; clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => { el.hidden = true }, 1900) }
async function load() { try { const [shipments, exceptions] = await Promise.all([fleetApi.shipments(), fleetApi.exceptions()]); state.shipments = shipments.list.map((item) => ({ ...item, tone: tone(item.status) })); state.exceptions = exceptions.list; state.live = true; render(); toast('已同步线上活动订单') } catch { state.live = false; render() } }
async function run(action) {
  try { await action(); await load() } catch (error) { toast(error.message) }
}
function card(item) {
  const action = item.status === '待接单' || item.status === '待调度' ? `<button class="track action" data-action="assign" data-id="${item.id}">扫码接单　→</button>` : item.status === '现场服务中' || item.status === '已送达' ? `<button class="track action" data-action="advance" data-id="${item.id}">${item.status === '现场服务中' ? '确认送达　→' : '完成签收　→'}</button>` : '<div class="closed">✓ 已完成闭环</div>'
  return `<article class="shipment ${item.tone}"><div class="card-top"><span class="code">${item.id}</span><b>${item.status}</b></div><h4>${item.route}</h4><p>${item.cargo} · ${item.eta}</p><div class="route"><span>取货点</span><i></i><span>${item.status}</span><i></i><span>收货点</span></div>${action}</article>`
}
function render() {
  const pending = state.shipments.filter((item) => item.status !== '已完成' && item.status !== '已取消').length
  const exception = state.exceptions[0]
  app.innerHTML = `<main class="mobile-shell"><header class="top"><div><p>VENUEFLOW / 2026</p><h1>今天的每一单<br><b>都准时到达</b></h1></div><span class="avatar">许</span></header><section class="hero"><div><span class="eyebrow">现场服务工作台 · ${state.live ? '线上同步' : '演示模式'}</span><h2>周师傅，下午好<br>还有 ${pending} 单待完成</h2><p>实时同步线路、签收与场地事件提醒</p></div><div class="hero-orbit">↗</div></section><section class="quick"><button data-action="scan"><b>＋</b><span>扫码接单</span></button><button data-action="route"><b>⌁</b><span>我的路线</span></button><button data-action="sign"><b>✓</b><span>签收记录</span></button></section><section class="section-head"><h3>今日活动订单 <small>${state.shipments.length} 单</small></h3><a data-action="all">查看全部 →</a></section><section class="cards">${state.shipments.map(card).join('')}</section><section class="section-head"><h3>场地事件提醒 <small class="red">${state.exceptions.length} 条</small></h3><a data-action="exception">处理 →</a></section>${exception ? `<article class="alert"><span>!</span><div><strong>${exception.shipmentId} ${exception.type || '场地事件提醒'}</strong><p>${exception.text}</p><button class="alert-action" data-action="resolve" data-id="${exception.id}">标记已处理</button></div></article>` : '<article class="alert empty-alert"><span>✓</span><div><strong>今日场地事件已全部闭环</strong><p>线路运行正常，继续保持。</p></div></article>'}<nav class="tabbar"><button class="active">⌂<small>工作台</small></button><button data-action="all">▤<small>活动订单池</small></button><button data-action="route">◎<small>我的路线</small></button><button data-action="sign">◉<small>我的</small></button></nav><div class="toast" hidden></div></main>`
  document.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => {
    const action = el.dataset.action; const item = state.shipments.find((row) => row.id === el.dataset.id)
    if (action === 'assign' && item) return run(() => fleetApi.assign(item.id, '周师傅'))
    if (action === 'advance' && item) return run(() => fleetApi.advance(item.id, nextStatus(item.status)))
    if (action === 'resolve' && el.dataset.id) return run(() => fleetApi.resolveException(el.dataset.id))
    toast(({ scan: '请点击待接单活动订单完成扫码接单', route: '今日路线已更新', sign: '签收记录已加载', all: '活动订单池正在同步', exception: state.exceptions.length ? '请先处理场地事件' : '暂无待处理场地事件' })[action] || '操作已完成')
  }))
}
render()
load()
