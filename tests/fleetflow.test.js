import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
test('miniapp renders route cards and quick actions', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  assert.match(source, /确认锁场/); assert.match(source, /今日活动订单/); assert.match(source, /VN-260716-018/)
})

test('miniapp binds lifecycle actions to the shared API', async () => {
  const api = await readFile(new URL('../src/api.js', import.meta.url), 'utf8')
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  assert.match(api, /Idempotency-Key/)
  assert.match(api, /shipments\//)
  assert.match(source, /fleetApi\.assign/)
  assert.match(source, /fleetApi\.advance/)
  assert.match(source, /fleetApi\.resolveException/)
})
