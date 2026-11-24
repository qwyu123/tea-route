/* 茶途智配 · 下单页
   提交后写入主系统（server.py）的订单池，并回显这一单预计怎么发。 */

const API = location.protocol === 'file:' ? 'http://127.0.0.1:8787' : '';

const $ = s => document.querySelector(s);
const state = { cust:'', city:'', grade:'一级', spec:'', qty:4, kg:'', req:'std', pt:'溪龙', note:'' };

function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('on'), 2400);
}

/* ---------- 单选组 ---------- */
function bindGroup(sel, key){
  const box = $(sel);
  if(!box) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if(!b) return;
    box.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    state[key] = b.dataset.v;
    if(key === 'city'){ const o = $('#cityOther'); if(o) o.value = ''; }
    sync();
  });
}

/* ---------- 摘要 ---------- */
function sync(){
  const kg = state.kg && Number(state.kg) > 0 ? Number(state.kg) : state.qty * 0.6;
  const reqTxt = state.req === 'nextday' ? '次日' : '常规';
  $('#sumline').textContent = `${state.qty} 包 · ${kg.toFixed(1)}kg · ${reqTxt}`;
}

/* ---------- 提交 ---------- */
async function submit(e){
  e.preventDefault();
  const city = state.city || ($('#cityOther').value || '').trim();
  if(!city){ toast('先选收货城市'); return; }
  if(state.qty < 1){ toast('包裹数至少 1'); return; }

  const btn = $('#submit');
  btn.disabled = true;
  btn.textContent = '提交中…';

  const payload = {
    cust: ($('#cust').value || '').trim(),
    city,
    grade: state.grade,
    spec: ($('#spec').value || '').trim(),
    qty: state.qty,
    kg: Number(state.kg) || 0,
    req: state.req,
    pt: state.pt,
    note: ($('#note').value || '').trim()
  };

  let d = null;
  try{
    const r = await fetch(`${API}/api/order`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    d = await r.json();
    if(!d.ok) throw new Error(d.error || '提交失败');
  }catch(err){
    d = saveLocal(payload);      // 公网静态版：没有后端，先存在本机
  }
  showDone(d);
  btn.disabled = false;
  btn.textContent = '提交订单';
}

/* ---------- 本地暂存（没有后端时） ---------- */
const KEY = 'ct_orders';
const LOCAL_MODE = { on:false };

function saveLocal(payload){
  const qty = payload.qty;
  const kg = payload.kg > 0 ? payload.kg : Math.round(qty * 0.6 * 10) / 10;
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const order = {
    id: `CT-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${String(list.length + 1).padStart(3,'0')}`,
    cust: payload.cust || '未填写客户',
    city: payload.city,
    item: `安吉白茶 ${payload.grade}`,
    spec: payload.spec || `${qty} 包`,
    qty,
    kg,
    req: payload.req,
    pt: payload.pt,
    src: '网页',
    note: payload.note,
    created_at: new Date().toLocaleString('zh-CN', { hour12:false }),
    local: true
  };
  if(!(payload.kg > 0)) order.inferred = ['kg'];
  list.push(order);
  localStorage.setItem(KEY, JSON.stringify(list));
  LOCAL_MODE.on = true;
  return { ok:true, order, total_orders:list.length };
}

/* ---------- 完成态 ---------- */
async function showDone(res){
  const o = res.order;
  $('#f').classList.add('no');
  $('#done').classList.remove('no');
  $('#oid').textContent = o.id;
  $('#doneMsg').textContent = res.order.local
    ? `已暂存在本机（公网演示版没有后端），共 ${res.total_orders} 单。同一浏览器打开运营台就能看到。`
    : `已同步到主系统，当前订单池共 ${res.total_orders} 单`;
  $('#doneLines').innerHTML = `
    <div><span class="k">客户</span>${o.cust}</div>
    <div><span class="k">收货</span>${o.city}</div>
    <div><span class="k">货物</span>${o.item} · ${o.spec}</div>
    <div><span class="k">包裹</span>${o.qty} 包 / ${o.kg} kg${o.inferred && o.inferred.includes('kg') ? '（重量为估算）' : ''}</div>
    <div><span class="k">时效</span>${o.req === 'nextday' ? '次日达' : '常规（2 日内）'}</div>`;

  // 回显这一批预计怎么发——客户最关心的是"什么时候到"
  try{
    const r = await fetch(`${API}/api/plan`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'
    });
    const p = await r.json();
    const line = (p.lines || []).find(l => l.city === o.city);
    if(line){
      $('#doneLines').insertAdjacentHTML('beforeend',
        `<div><span class="k">预计</span>${line.channel_name}，${line.lead}</div>`);
    }
  }catch(_){
    if(res.order.local){ $('#doneLines').insertAdjacentHTML('beforeend',
      '<div><span class="k">说明</span>公网版先记账，运费要到运营台里算</div>'); }
  }

  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ---------- 重置 ---------- */
function reset(){
  state.cust = ''; state.city = ''; state.grade = '一级'; state.spec = '';
  state.qty = 4; state.kg = ''; state.req = 'std'; state.pt = '溪龙'; state.note = '';
  document.querySelectorAll('input').forEach(i => i.value = '');
  document.querySelectorAll('.chips button').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('#grades button, #points button').forEach(b => {
    if(b.dataset.v === state.grade || b.dataset.v === state.pt) b.classList.add('on');
  });
  document.querySelectorAll('#reqs button').forEach(b => b.classList.toggle('on', b.dataset.v === 'std'));
  $('#qty').textContent = 4;
  $('#done').classList.add('no');
  $('#f').classList.remove('no');
  sync();
}

/* ---------- 初始化 ---------- */
(function init(){
  bindGroup('#cities', 'city');
  bindGroup('#grades', 'grade');
  bindGroup('#points', 'pt');
  bindGroup('#reqs', 'req');

  $('#minus').onclick = () => { state.qty = Math.max(1, state.qty - 1); $('#qty').textContent = state.qty; sync(); };
  $('#plus').onclick  = () => { state.qty = Math.min(999, state.qty + 1); $('#qty').textContent = state.qty; sync(); };

  $('#kg').addEventListener('input', e => { state.kg = e.target.value; sync(); });
  $('#cityOther').addEventListener('input', e => {
    if(e.target.value.trim()){
      state.city = '';
      document.querySelectorAll('#cities button').forEach(b => b.classList.remove('on'));
    }
    sync();
  });

  $('#f').addEventListener('submit', submit);
  $('#again').onclick = reset;

  sync();
})();
