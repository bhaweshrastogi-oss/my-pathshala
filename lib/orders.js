const crypto = require('crypto');
const PREFIX = 'pmp:order:';
const PENDING = 'pmp:pending-orders';
function configured() {
  try {
    return new URL(process.env.UPSTASH_REDIS_REST_URL).protocol === 'https:' && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  } catch (_) { return false; }
}
async function command(...args) {
  if (!configured()) throw new Error('Order storage is not configured');
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Order storage unavailable');
  const data = await response.json();
  if (data.error) throw new Error('Order storage command failed');
  return data.result;
}
function validId(id) { return typeof id === 'string' && /^PMP-[a-f0-9]{32}$/.test(id); }
async function getOrder(id) {
  if (!validId(id)) return null;
  const value = await command('GET', PREFIX + id);
  return value ? JSON.parse(value) : null;
}
async function saveOrder(order) {
  if (!validId(order.id)) throw new Error('Invalid order identifier');
  await command('SET', PREFIX + order.id, JSON.stringify(order));
}
async function createOrder(details) {
  const order = { ...details, id: 'PMP-' + crypto.randomBytes(16).toString('hex'), createdAt: new Date().toISOString(), state: 'CREATED' };
  // Index first: a partial write cannot create an untracked payable order.
  await command('ZADD', PENDING, Date.now(), order.id);
  await saveOrder(order);
  return order;
}
async function withLock(id, work) {
  const key = PREFIX + id + ':lock', token = crypto.randomUUID();
  if (await command('SET', key, token, 'NX', 'EX', 120) !== 'OK') {
    const e = new Error('Order processing in progress'); e.statusCode = 503; throw e;
  }
  try { return await work(); }
  finally {
    await command('EVAL', "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end", 1, key, token);
  }
}
async function pendingOrders() { return command('ZRANGE', PENDING, 0, 49); }
async function finishOrder(id) { return command('ZREM', PENDING, id); }
async function deferOrder(id) { return command('ZADD', PENDING, Date.now(), id); }
module.exports = { configured, getOrder, saveOrder, createOrder, withLock, pendingOrders, finishOrder, deferOrder };
