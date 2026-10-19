const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const store = new Map(), queue = new Map();
let sent, payment, callback, payCalls, storageFailure, mailFailure;
const sdk = path.resolve(__dirname, '../lib/phonepe.js');
require.cache[sdk] = { id: sdk, filename: sdk, loaded: true, exports: {
  getOrderStatus: async () => payment,
  createCheckoutPayment: async data => { payCalls.push(data); return { orderId: 'provider-id', state: 'PENDING', redirectUrl: 'https://phonepe.example/pay' }; },
  validateCallback: () => { if (callback instanceof Error) throw callback; return callback; },
} };
global.fetch = async (url, options) => {
  if (url === 'https://redis.example') {
    if (storageFailure) throw Error('storage down');
    const [cmd, key, ...args] = JSON.parse(options.body);
    let result;
    if (cmd === 'GET') result = store.get(key) ?? null;
    else if (cmd === 'SET') {
      if (args.includes('NX') && store.has(key)) result = null;
      else { store.set(key, args[0]); result = 'OK'; }
    } else if (cmd === 'ZADD') { queue.set(args[1], Number(args[0])); result = 1; }
    else if (cmd === 'ZRANGE') result = [...queue.entries()].sort((a,b)=>a[1]-b[1]).map(([id])=>id).slice(0,50);
    else if (cmd === 'ZREM') { queue.delete(args[0]); result = 1; }
    else if (cmd === 'EVAL') { if (store.get(args[1]) === args[2]) store.delete(args[1]); result = 1; }
    else throw Error('Unexpected command ' + cmd);
    return { ok: true, json: async () => ({ result }) };
  }
  assert.equal(url, 'https://api.resend.com/emails');
  if (mailFailure) return { ok: false, status: 503, text: async () => '{"message":"mail unavailable"}' };
  sent.push(JSON.parse(options.body));
  return { ok: true, text: async () => '{"id":"mail-id"}' };
};
const orders = require('../lib/orders');
const { fulfilOrder } = require('../lib/fulfilOrder');
const create = require('../api/create-payment');
const confirm = require('../api/send-confirmation');
const webhook = require('../api/phonepe-callback');
const reconcile = require('../api/reconcile-payments');
function response() { return { statusCode: 200, setHeader() {}, json(body) { this.body = body; return this; }, end() { return this; } }; }
async function checkout(extra = {}) {
  const res = response();
  await create({ method:'POST', headers:{}, body:{ name:'Original Buyer',email:'buyer@example.com',phone:'9876543210',course_key:'ai',redirect_url:'https://pmpathshala.com/?payment=success',...extra } }, res);
  return res;
}
beforeEach(() => {
  store.clear(); queue.clear(); sent=[]; payCalls=[]; storageFailure=false; mailFailure=false;
  payment={ state:'COMPLETED', amount:4000000 }; callback=new Error('bad signature');
  Object.assign(process.env, { UPSTASH_REDIS_REST_URL:'https://redis.example', UPSTASH_REDIS_REST_TOKEN:'test', RESEND_API_KEY:'test', ADMIN_NOTIFICATION_EMAIL:'admin@example.com', PHONEPE_WEBHOOK_USERNAME:'test', PHONEPE_WEBHOOK_PASSWORD:'test', CORS_ORIGINS:'https://pmpathshala.com', CRON_SECRET:'cron-test' });
});
test('checkout generates its own ID, ignores amount, and saves purchaser before payment', async () => {
  const r=await checkout({order_id:'attacker-controlled',amount:1});
  assert.equal(r.statusCode,200); assert.match(r.body.orderId,/^PMP-[a-f0-9]{32}$/);
  const saved=await orders.getOrder(r.body.orderId);
  assert.equal(saved.email,'buyer@example.com'); assert.equal(saved.amountPaise,4000000);
  assert.equal(payCalls[0].merchantOrderId,saved.id); assert.equal(payCalls[0].amountPaise,4000000);
});
test('confirmation cannot redirect an existing payment to a different purchaser or course', async () => {
  const r=await checkout(), res=response();
  await confirm({method:'POST',headers:{},body:{orderRef:r.body.orderId,email:'attacker@example.com',name:'Attacker',course_key:'basic'}},res);
  assert.equal(res.body.sent,true); assert.equal(sent.length,2);
  assert.deepEqual(sent[0].to,['buyer@example.com']); assert.deepEqual(sent[1].to,['admin@example.com']);
  assert.match(sent[0].html,/AI Product Manager/);
});
test('replaying a paid order does not send notifications twice', async () => {
  const r=await checkout(); await fulfilOrder(r.body.orderId); await fulfilOrder(r.body.orderId);
  assert.equal(sent.length,2); assert.equal(queue.size,0);
});
test('concurrent fulfilment sends only one pair of emails', async () => {
  const r=await checkout(); const outcomes=await Promise.allSettled([fulfilOrder(r.body.orderId),fulfilOrder(r.body.orderId)]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1); assert.equal(sent.length,2);
});
test('wrong or missing payment amount fails closed', async () => {
  const r=await checkout();
  for (const amount of [1,undefined,'4000000']) { payment={state:'COMPLETED',amount}; await assert.rejects(fulfilOrder(r.body.orderId)); }
  assert.equal(sent.length,0);
});
test('pending payment does not send confirmations', async () => {
  const r=await checkout(); payment.state='PENDING';
  assert.equal((await fulfilOrder(r.body.orderId)).sent,false); assert.equal(sent.length,0);
});
test('unknown legacy order cannot trigger email', async () => {
  await assert.rejects(fulfilOrder('PMP-legacy')); assert.equal(sent.length,0);
});
test('checkout refuses unavailable storage before calling PhonePe', async () => {
  storageFailure=true; const r=await checkout(); assert.equal(r.statusCode,500); assert.equal(payCalls.length,0);
});
test('checkout refuses missing required configuration', async () => {
  delete process.env.UPSTASH_REDIS_REST_TOKEN; const r=await checkout(); assert.equal(r.statusCode,503); assert.equal(payCalls.length,0);
});
test('invalid callbacks rejected and missing webhook config fails closed', async () => {
  let r=response(); await webhook({method:'POST',headers:{},body:{}},r); assert.equal(r.statusCode,401);
  delete process.env.PHONEPE_WEBHOOK_PASSWORD; r=response(); await webhook({method:'POST',headers:{},body:{}},r); assert.equal(r.statusCode,503); assert.equal(sent.length,0);
});
test('verified webhook fulfils payment without a browser', async () => {
  const r=await checkout(); callback={type:'CHECKOUT_ORDER_COMPLETED',payload:{state:'COMPLETED',merchantOrderId:r.body.orderId}};
  const res=response(); await webhook({method:'POST',headers:{authorization:'test'},body:{}},res);
  assert.equal(res.statusCode,200); assert.equal(sent.length,2); assert.equal((await orders.getOrder(r.body.orderId)).state,'COMPLETED');
});
test('email failure is retryable and durable recovery completes notifications', async () => {
  const r=await checkout(); callback={payload:{state:'COMPLETED',merchantOrderId:r.body.orderId}}; mailFailure=true;
  const w=response(); await webhook({method:'POST',headers:{authorization:'test'},body:{}},w);
  assert.equal(w.statusCode,503); assert.equal(queue.size,1);
  mailFailure=false; const res=response(); await reconcile({method:'GET',headers:{authorization:'Bearer cron-test'}},res);
  assert.equal(res.statusCode,200); assert.equal(res.body.completed,1); assert.equal(sent.length,2); assert.equal(queue.size,0);
});
test('recovery endpoint requires its secret', async () => {
  const r=response(); await reconcile({method:'GET',headers:{}},r); assert.equal(r.statusCode,401);
});
test('inherited object properties are not valid courses', async () => {
  assert.equal((await checkout({course_key:'constructor'})).statusCode,400);
});
