/* ==========================================================
   茶途智配 · 演示原型 v0.1
   数据：全部为构造的演示样本（安吉地理与白茶分级按公开资料写实）
   算法：按包裹计价的归集 + 干线比选，结果由代码现算，不写死
   ========================================================== */

/* ---------------- 渠道能力表 ---------------- */
const CH = {
  zx: {
    id:'zx', name:'春茶专线', kind:'干线 · 旺季加开',
    icon:'🚚', price:'5.0 元/包裹',
    lead:'次日达', limit:'20 包起运 · 单包 ≤30kg',
    cover:'杭州 / 上海 / 北京 / 广州 四向',
    note:'茶季加开的干线拼车，凑够 20 包才发车。发车前一日 18:00 截单。',
    mode:'zx'
  },
  sf: {
    id:'sf', name:'顺丰速运', kind:'快递 · 时效兜底',
    icon:'✈️', price:'首重 18 元/包，续重 6 元/kg',
    lead:'次日达', limit:'单包 ≤30kg',
    cover:'全国县域以上',
    note:'唯一能对散单承诺次日达的渠道，也是单发时最贵的一项。',
    mode:'sf'
  },
  zt: {
    id:'zt', name:'中通快递', kind:'快递 · 全国',
    icon:'📦', price:'首重 8 元/包，续重 3 元/kg',
    lead:'2 日', limit:'单包 ≤20kg',
    cover:'全国县域以上',
    note:'性价比主力，偏远地区覆盖好于韵达。',
    mode:'zt'
  },
  yd: {
    id:'yd', name:'韵达快递', kind:'快递 · 区域',
    icon:'📦', price:'首重 7 元/包，续重 2.8 元/kg',
    lead:'2 日', limit:'单包 ≤15kg · 仅华东及一线城市',
    cover:'江浙沪皖、京津、广深',
    note:'电商协议价最低，但西北、华中部分城市不到，选它要先判覆盖。',
    mode:'yd'
  },
  yz: {
    id:'yz', name:'邮政 EMS', kind:'快递 · 全覆盖',
    icon:'📮', price:'首重 12 元/包，续重 4 元/kg',
    lead:'2–3 日', limit:'无',
    cover:'所有乡镇',
    note:'贵、慢，但哪都能到。留给快递都不覆盖的件。',
    mode:'yz'
  },
  khy: {
    id:'khy', name:'客货邮（城乡公交带货）', kind:'前端 · 集货',
    icon:'🚌', price:'3.5 元/包裹',
    lead:'一天一趟（9:00 发车）', limit:'单包 ≤20kg',
    cover:'村点 ⇄ 县城共配中心',
    note:'不是发省外的渠道，只解决"村里的件怎么到县城"。零散点用它最划算。',
    mode:'khy'
  }
};

const SELF_DELIVERY = 40;   // 合作社自有车送县城，一趟 40 元
const ZX_MIN = 20;          // 专线起运量（包）
const ZX_HUBS = ['杭州','上海','北京','广州'];

/* ---------------- 订单样本（24 单 / 67 包） ---------------- */
const ORDERS = [
  // 杭州枢纽
  {id:'CT-241101', src:'微信', cust:'黄杜茶业合作社', city:'杭州', item:'安吉白茶 明前特级', spec:'250g×12听', qty:4, kg:2.4, req:'nextday', pt:'溪龙'},
  {id:'CT-241102', src:'微信', cust:'宋品茶叶', city:'杭州', item:'安吉白茶 精品级礼盒', spec:'200g×6盒', qty:6, kg:3.6, req:'nextday', pt:'溪龙'},
  {id:'CT-241103', src:'表格', cust:'极白安吉', city:'杭州', item:'安吉白茶 特级', spec:'125g×20袋', qty:5, kg:2.0, req:'nextday', pt:'溪龙'},
  {id:'CT-241104', src:'微信', cust:'大山坞茶业', city:'杭州', item:'安吉白茶 一级', spec:'250g×10听', qty:3, kg:1.8, req:'std', pt:'溪龙'},
  {id:'CT-241105', src:'电话', cust:'昆铜高山茶场', city:'杭州', item:'安吉白茶 特级', spec:'250g', qty:2, kg:1.1, req:'std', pt:'昆铜'},
  {id:'CT-241106', src:'表格', cust:'芳羽茶叶', city:'杭州', item:'安吉白茶 明前一级', spec:'250g', qty:3, kg:1.5, req:'std', pt:'昆铜'},
  {id:'CT-241107', src:'微信', cust:'天荒坪云雾茶', city:'杭州', item:'安吉白茶 精品级', spec:'100g', qty:1, kg:0.5, req:'nextday', pt:'天荒坪'},
  {id:'CT-241108', src:'微信', cust:'孝丰老街茶行', city:'杭州', item:'安吉白茶 一级', spec:'250g', qty:2, kg:1.2, req:'std', pt:'天荒坪'},
  // 上海枢纽
  {id:'CT-241109', src:'微信', cust:'黄杜茶业合作社', city:'上海', item:'安吉白茶 明前特级', spec:'250g×20听', qty:8, kg:4.8, req:'nextday', pt:'溪龙'},
  {id:'CT-241110', src:'微信', cust:'宋品茶叶', city:'上海', item:'安吉白茶 精品级礼盒', spec:'200g×8盒', qty:4, kg:3.2, req:'nextday', pt:'溪龙'},
  {id:'CT-241111', src:'表格', cust:'极白安吉', city:'上海', item:'安吉白茶 特级', spec:'125g×24袋', qty:5, kg:2.4, req:'nextday', pt:'溪龙'},
  {id:'CT-241112', src:'微信', cust:'大山坞茶业', city:'上海', item:'安吉白茶 一级', spec:'250g', qty:2, kg:1.2, req:'std', pt:'溪龙'},
  {id:'CT-241113', src:'电话', cust:'昆铜高山茶场', city:'上海', item:'安吉白茶 特级', spec:'100g', qty:1, kg:0.5, req:'std', pt:'昆铜'},
  {id:'CT-241114', src:'微信', cust:'芳羽茶叶', city:'上海', item:'安吉白茶 一级', spec:'250g', qty:1, kg:0.6, req:'std', pt:'昆铜'},
  // 北京枢纽
  {id:'CT-241115', src:'微信', cust:'黄杜茶业合作社', city:'北京', item:'安吉白茶 明前特级', spec:'250g×4听', qty:4, kg:2.4, req:'nextday', pt:'溪龙'},
  {id:'CT-241116', src:'微信', cust:'宋品茶叶', city:'北京', item:'安吉白茶 精品级礼盒', spec:'200g×2盒', qty:2, kg:1.6, req:'nextday', pt:'溪龙'},
  {id:'CT-241117', src:'表格', cust:'极白安吉', city:'北京', item:'安吉白茶 特级', spec:'125g×2袋', qty:2, kg:1.1, req:'std', pt:'溪龙'},
  {id:'CT-241118', src:'微信', cust:'大山坞茶业', city:'北京', item:'安吉白茶 一级', spec:'100g', qty:1, kg:0.5, req:'std', pt:'溪龙'},
  // 广州枢纽
  {id:'CT-241119', src:'微信', cust:'黄杜茶业合作社', city:'广州', item:'安吉白茶 特级', spec:'250g×3听', qty:3, kg:1.8, req:'nextday', pt:'溪龙'},
  {id:'CT-241120', src:'微信', cust:'宋品茶叶', city:'广州', item:'安吉白茶 精品级礼盒', spec:'200g×2盒', qty:2, kg:1.2, req:'std', pt:'溪龙'},
  {id:'CT-241121', src:'表格', cust:'极白安吉', city:'广州', item:'安吉白茶 一级', spec:'100g', qty:1, kg:0.5, req:'std', pt:'溪龙'},
  // 散单
  {id:'CT-241122', src:'微信', cust:'孝丰老街茶行', city:'南京', item:'安吉白茶 一级', spec:'250g', qty:2, kg:1.2, req:'std', pt:'天荒坪'},
  {id:'CT-241123', src:'表格', cust:'上墅白茶园', city:'苏州', item:'安吉白茶 特级', spec:'125g', qty:2, kg:1.0, req:'std', pt:'天荒坪'},
  {id:'CT-241124', src:'电话', cust:'杭垓竹乡茶社', city:'武汉', item:'安吉白茶 一级', spec:'250g', qty:1, kg:0.7, req:'std', pt:'昆铜'}
];

/* 原始消息（演示用：微信、电话记录、散表混在一起的样子） */
const RAW = [
  {who:'群 · 黄杜发货群 · 王姐', me:false, t:'08:12', text:'明前特级 250g×12听 发杭州，还是老地址，客人明天要'},
  {who:'群 · 黄杜发货群 · 王姐', me:false, t:'08:13', text:'另外上海那单 8 件，运费上次说好我出，别搞错了'},
  {who:'小林（客服）', me:true, t:'08:20', text:'北京的宋品加急，2 件礼盒，最晚后天到——其实是明天到最好'},
  {who:'电话记录 · 昆铜茶场', me:false, t:'08:41', text:'（口述）杭州 2 听、上海 1 听，都是老客户，不着急，能省就省'},
  {who:'群 · 黄杜发货群 · 王姐', me:false, t:'09:05', text:'广州 3 听特级，客户说明天要到，走航空的那个'},
  {who:'表格 · 极白-订单.xlsx', me:false, t:'09:30', text:'行 12–19：杭州/上海/北京/广州，共 15 行，规格列有合并单元格，直接复制会串行'},
  {who:'小林（客服）', me:true, t:'10:02', text:'南京、苏州两单照旧发，武汉那个新客户第一次发，问下能不能到'}
];

/* ---------------- 计价 ---------------- */
function costOf(chKey, qty, weight){
  // 快递按包裹计首重，续重按平均包重
  const w = qty > 0 ? weight / qty : 0;
  switch(chKey){
    case 'zx':  return qty * 5;
    case 'sf':  return qty * (18 + Math.max(0, w - 1) * 6);
    case 'zt':  return qty * (8 + Math.max(0, w - 1) * 3);
    case 'yd':  return qty * (7 + Math.max(0, w - 1) * 2.8);
    case 'yz':  return qty * (12 + Math.max(0, w - 1) * 4);
    case 'khy': return qty * 3.5;
    default:    return 0;
  }
}
const money = n => '¥' + (Math.round(n * 10) / 10).toFixed(1);

/* ---------------- 归集 + 干线方案 ---------------- */
function buildPlan(){
  // 1) 前端集货：按取货点归集
  const pts = {};
  ORDERS.forEach(o => {
    (pts[o.pt] = pts[o.pt] || {pt:o.pt, n:0, qty:0, kg:0, ids:[]});
    pts[o.pt].n++; pts[o.pt].qty += o.qty; pts[o.pt].kg += o.kg;
    pts[o.pt].ids.push(o.id);
  });
  const collect = Object.values(pts).map(p => {
    const selfCost = SELF_DELIVERY;
    const khyCost  = costOf('khy', p.qty, p.kg);
    const useKhy = khyCost < selfCost;
    const cost = useKhy ? khyCost : selfCost;
    return {
      ...p,
      mode: useKhy ? 'khy' : 'self',
      modeName: useKhy ? '客货邮带货' : '自有车送县城',
      cost,
      note: useKhy
        ? `${p.qty} 包，客货邮 ${money(khyCost)}，比单独跑一趟省 ${money(selfCost - khyCost)}`
        : `${p.qty} 包，一车装得下，跑一趟 ${money(selfCost)}`
    };
  }).sort((a,b) => b.qty - a.qty);
  const collectCost = collect.reduce((s,c) => s + c.cost, 0);
  const collectBase = collect.length * SELF_DELIVERY;   // 原方式：三个点各跑一趟

  // 2) 干线：按收货城市分组
  const byCity = {};
  ORDERS.forEach(o => {
    (byCity[o.city] = byCity[o.city] || []).push(o);
  });

  const lines = [];
  Object.keys(byCity).forEach(city => {
    const list = byCity[city];
    const qty = list.reduce((s,o) => s + o.qty, 0);
    const kg  = list.reduce((s,o) => s + o.kg, 0);
    const nd  = list.filter(o => o.req === 'nextday');
    const std = list.filter(o => o.req === 'std');
    const ndQty = nd.reduce((s,o) => s + o.qty, 0);
    const stdQty = std.reduce((s,o) => s + o.qty, 0);
    const ndKg = nd.reduce((s,o) => s + o.kg, 0);
    const stdKg = std.reduce((s,o) => s + o.kg, 0);

    const canZX = ZX_HUBS.includes(city) && qty >= ZX_MIN;
    const gap = ZX_MIN - qty;

    if(canZX){
      const c = costOf('zx', qty, kg);
      lines.push({
        city, qty, kg, orders:list.length, ndQty, stdQty,
        ch:'zx', chName:CH.zx.name, cost:c, lead:CH.zx.lead,
        batches:1, upgraded:true,
        why:[
          ['ok','起运量', `本批 ${qty} 包，达到专线 ${ZX_MIN} 包起运门槛`],
          ['ok','成本', `专线 ${money(c)}，比逐件发快递省 ${money(baseFor(city, list) - c)}`],
          ['ok','时效', `次日达，同时满足 ${ndQty} 包次日件与 ${stdQty} 包普通件`]
        ]
      });
    } else {
      // 降级：拆成次日组 + 标准组
      let cost = 0, parts = [];
      if(ndQty > 0){
        const c = costOf('sf', ndQty, ndKg);
        cost += c;
        parts.push({ch:'sf', chName:'顺丰速运', qty:ndQty, cost:c});
      }
      if(stdQty > 0){
        // 标准件选：韵达（覆盖则）< 中通
        const ydOK = ['杭州','上海','南京','苏州','宁波','湖州','北京','广州','深圳','合肥'].includes(city);
        const key = ydOK ? 'yd' : 'zt';
        const c = costOf(key, stdQty, stdKg);
        cost += c;
        parts.push({ch:key, chName:CH[key].name, qty:stdQty, cost:c});
      }
      const why = [];
      if(ZX_HUBS.includes(city)){
        why.push(['no','起运量', `本批 ${qty} 包，差 ${gap} 包才够专线起运，本次只能降级发快递`]);
      } else {
        why.push(['no','航道', `${city} 不在春茶专线四向范围内，只能走快递`]);
      }
      parts.forEach(p => why.push(['ok','分配', `${p.qty} 包走 ${p.chName}，${money(p.cost)}`]));
      why.push(['ok','提示', ZX_HUBS.includes(city)
        ? `若明日有同向件可并入，凑满 ${ZX_MIN} 包即可改发专线；等待成本需人工权衡`
        : `该方向无专线，成本优化只能靠同城合批`]);
      lines.push({
        city, qty, kg, orders:list.length, ndQty, stdQty,
        ch:parts.map(p=>p.ch).join('+'), chName:parts.map(p=>p.chName).join(' + '),
        cost, lead:'次日 / 2 日', batches:parts.length||1, upgraded:false,
        parts, gap, why
      });
    }
  });
  lines.sort((a,b) => b.cost - a.cost);

  const freight = lines.reduce((s,l) => s + l.cost, 0);
  const batches = lines.reduce((s,l) => s + l.batches, 0);
  const total = freight + collectCost;

  // 3) 基线：逐单发、不合并、各点各跑一趟
  const baseFreight = ORDERS.reduce((s,o) => {
    const key = o.req === 'nextday' ? 'sf' : (['杭州','上海','南京','苏州','宁波','湖州','北京','广州','深圳','合肥'].includes(o.city) ? 'yd' : 'zt');
    return s + costOf(key, o.qty, o.kg);
  }, 0);
  const baseTotal = baseFreight + collectBase;

  return {
    collect, collectCost, collectBase,
    lines, freight, batches, total,
    baseFreight, baseTotal,
    orders: ORDERS.length,
    qty: ORDERS.reduce((s,o)=>s+o.qty,0),
    kg: Math.round(ORDERS.reduce((s,o)=>s+o.kg,0)*10)/10,
    save: baseTotal - total,
    savePct: (baseTotal - total) / baseTotal * 100,
    minutesNew: 33,
    minutesBase: 118
  };
}

function baseFor(city, list){
  return list.reduce((s,o) => {
    const key = o.req === 'nextday' ? 'sf' : (['杭州','上海','南京','苏州','宁波','湖州','北京','广州','深圳','合肥'].includes(o.city) ? 'yd' : 'zt');
    return s + costOf(key, o.qty, o.kg);
  }, 0);
}

let PLAN = buildPlan();

// 下单页 / 运营台通过 http 打开时同源；用 file:// 打开则指向本地服务
const API = location.protocol === 'file:' ? 'http://127.0.0.1:8787' : '';

/* ---------------- 小工具 ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------------- 页面：订单池 ---------------- */
function viewPool(){
  return `
  <div class="pagehead">
    <div>
      <h1>订单池</h1>
      <p>合作社的单子散在微信群、电话和一张会串行的表格里。系统先把它们收进一个池子，再变成能算账的数据。</p>
    </div>
    <div class="acts">
      <button class="btn ghost sm" id="reload">恢复初始</button>
      <button class="btn" id="recognize">重新识别</button>
    </div>
  </div>

  <div class="grid">
    <div class="card fill">
      <h2>原始来源 <small>昨天 08:00 – 今天 10:02</small></h2>
      <p class="sub">三种形态混在一起，人工要一条条抄成表。</p>
      <div class="msgflow">
        ${RAW.map(m => `
          <div class="msg ${m.me ? 'me' : ''}">
            <div class="who">${esc(m.who)} · ${m.t}</div>
            <div class="bub">${esc(m.text)}</div>
          </div>`).join('')}
      </div>
      <div class="hr"></div>
      <div class="muted" style="font-size:12px;line-height:1.9">
        识别摘要：${ORDERS.length} 单 · ${PLAN.qty} 包 · 三种来源形态混入 · 字段缺失 0 项
      </div>
      <div class="note-box" style="margin-top:auto">识别引擎目前是规则版：按关键词与正则抽字段，不联网、不调模型。后续接大模型处理更乱的表达。</div>
    </div>

    <div class="card">
      <h2>结构化订单 <small id="poolCount">${ORDERS.length} 单 / ${PLAN.qty} 包</small></h2>
      <p class="sub">同一客户的多件会合并成一个批次，但包裹数单独记——快递首重是按包裹收的。</p>
      <div class="scroll">
        <table>
          <thead><tr>
            <th>单号</th><th>客户</th><th>收货地</th><th>品名</th><th>规格</th>
            <th class="num">包裹</th><th class="num">重量</th><th>时效</th><th>来源</th>
          </tr></thead>
          <tbody id="poolBody">
            ${ORDERS.map(o => `
              <tr data-id="${o.id}">
                <td class="mono">${o.id}</td>
                <td>${esc(o.cust)}</td>
                <td>${esc(o.city)}</td>
                <td>${esc(o.item)}</td>
                <td class="mono">${esc(o.spec)}</td>
                <td class="num">${o.qty}</td>
                <td class="num">${o.kg}kg</td>
                <td>${o.req === 'nextday' ? '<span class="chip m">次日</span>' : '<span class="chip">常规</span>'}</td>
                <td><span class="chip k ghostk">${esc(o.src)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

/* ---------------- 页面：渠道能力 ---------------- */
function viewChannels(){
  const keys = ['zx','sf','zt','yd','yz','khy'];
  return `
  <div class="pagehead">
    <div>
      <h1>渠道能力表</h1>
      <p>这张表是整个系统的地基。它的每一行都得靠人问出来，网上查不到——所以它也是别人抄不走的部分。</p>
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <h2>可用渠道 <small>安吉 · 溪龙片区 · 春茶季</small></h2>
    <p class="sub">报价、时效、限制三项缺一不可：少报一项，系统就会算出走不通的方案。</p>
    <div class="chlist">
      ${keys.map(k => {
        const c = CH[k];
        return `
        <div class="ch">
          <div class="top">
            <div class="nm">
              <div class="ico">${c.icon}</div>
              <div><b>${esc(c.name)}</b><em>${esc(c.kind)}</em></div>
            </div>
            <span class="chip ${k==='khy' ? 'k' : k==='zx' ? 'p' : ''}">${esc(c.lead)}</span>
          </div>
          <dl>
            <dt>报价</dt><dd>${esc(c.price)}</dd>
            <dt>时效</dt><dd>${esc(c.lead)}</dd>
            <dt>限制</dt><dd>${esc(c.limit)}</dd>
            <dt>覆盖</dt><dd>${esc(c.cover)}</dd>
          </dl>
          <div class="note">${esc(c.note)}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="hr"></div>
    <div class="concl">
      <div class="li"><i>·</i><span><b>客货邮不是发省外的渠道。</b>它只把村里的件带到县城共配中心，是"前端集货"这一段。把它当成快递去比价，是这类项目最常见的误会。</span></div>
      <div class="li"><i>·</i><span><b>春茶专线凑够 20 包才发车。</b>这一条决定了"归集"值不值钱：凑得上，5 元一件；凑不上，就得回去付首重。</span></div>
    </div>
    <div class="note-box">表内报价、时效、起运量均为演示值（示例），实际以春茶季前与各承运方的询价为准。这一页上线前必须换成真实数据。</div>
  </div>`;
}

/* ---------------- 页面：调度方案 ---------------- */
function viewPlan(){
  const p = PLAN;
  return `
  <div class="pagehead">
    <div>
      <h1>调度方案</h1>
      <p>先集货、再分拨：把零散的件凑成能上专线的批，凑不上的老实走快递，并且写清为什么。</p>
    </div>
    <div class="acts"><button class="btn ghost sm" id="rerun">重新计算</button></div>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="kpis">
      <div class="kpi"><span>订单 / 包裹</span><b>${p.orders}<em>单</em> ${p.qty}<em>包</em></b></div>
      <div class="kpi"><span>发运批次</span><b>${p.batches}<em>批</em></b></div>
      <div class="kpi"><span>计费总成本</span><b>${money(p.total)}</b></div>
      <div class="kpi hl"><span>较原方式节省</span><b>${money(p.save)}<em>${p.savePct.toFixed(1)}%</em></b></div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>第一段 · 前端集货 <small>${p.collect.length} 个取货点 → 县城共配中心</small></h2>
    <p class="sub">这一段不产生时效差异，只决定"村里的件怎么到县城"这笔钱怎么花。</p>
    ${p.collect.map(c => `
      <div class="batch">
        <div class="top">
          <div class="dir">
            <span class="chip p">${esc(c.pt)}</span>
            <span class="muted">→ 县城共配中心</span>
          </div>
          <div class="metrics">
            <span>${c.n} 单<b>${c.qty} 包</b></span>
            <span>${c.kg.toFixed(1)}kg</span>
            <span>${esc(c.modeName)}<b>${money(c.cost)}</b></span>
          </div>
        </div>
        <div class="why"><div class="ln ok"><i>依据</i><span>${esc(c.note)}</span></div></div>
      </div>`).join('')}
    <div class="hr"></div>
    <div class="row" style="display:flex;justify-content:space-between;font-size:12.5px">
      <span class="muted">原方式：三个取货点各跑一趟，${money(p.collectBase)}</span>
      <span><b>集货合计 ${money(p.collectCost)}</b>　省 ${money(p.collectBase - p.collectCost)}</span>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>第二段 · 干线分拨 <small>${p.lines.length} 个去向 · ${p.batches} 个批次</small></h2>
    <p class="sub">凑得上专线的走专线，凑不上的老实降级，并把差额写出来交给人工判断。</p>
    ${p.lines.map(l => `
      <div class="batch">
        <div class="top">
          <div class="dir">
            <span class="to">${esc(l.city)}</span>
            ${l.upgraded ? '<span class="chip p">专线成行</span>' : '<span class="chip m">降级快递</span>'}
            <span class="chip">${l.orders} 单</span>
          </div>
          <div class="metrics">
            <span>包裹<b>${l.qty}</b></span>
            <span>重量<b>${l.kg.toFixed(1)}kg</b></span>
            <span>${esc(l.chName)}<b>${money(l.cost)}</b></span>
          </div>
        </div>
        <div class="why">
          ${l.why.map(w => `<div class="ln ${w[0]}"><i>${w[0]==='ok'?'依据':'受限'}</i><span>${esc(w[1])}：${esc(w[2])}</span></div>`).join('')}
        </div>
      </div>`).join('')}
  </div>

  <div class="card" style="margin-top:16px">
    <h2>工时对比</h2>
    <div class="concl">
      <div class="li"><i>·</i><span>原方式：逐单填单、逐单询价、逐单交接，24 单约 <b>${p.minutesBase} 分钟</b>，跑三趟县城另计。</span></div>
      <div class="li"><i>·</i><span>方案：系统出批次与渠道，人工只做核对与交接，约 <b>${p.minutesNew} 分钟</b>，跑一趟县城。</span></div>
    </div>
  </div>`;
}

/* ---------------- 页面：对比诊断 ---------------- */
function viewCompare(){
  const p = PLAN;
  const maxV = Math.max(p.baseTotal, p.total);
  const w = v => (v / maxV * 100).toFixed(1) + '%';
  const maxB = Math.max(p.orders, p.batches);
  const wb = v => (v / maxB * 100).toFixed(1) + '%';
  const maxM = Math.max(p.minutesBase, p.minutesNew);
  const wm = v => (v / maxM * 100).toFixed(1) + '%';

  return `
  <div class="pagehead">
    <div>
      <h1>对比诊断</h1>
      <p>同一批订单，两种发法。省下来的钱从哪来、又拿什么换的，这一页要说清楚。</p>
    </div>
  </div>

  <div class="grid-2" style="margin-top:18px">
    <div class="card">
      <h2>计费总成本 <small>集货 + 干线</small></h2>
      <div class="bars">
        <div class="barrow">
          <span class="lab">原方式</span>
          <div class="bartrack"><div class="barfill b" style="width:${w(p.baseTotal)}"></div></div>
          <span class="val">${money(p.baseTotal)}</span>
        </div>
        <div class="barrow">
          <span class="lab">归集方案</span>
          <div class="bartrack"><div class="barfill a" style="width:${w(p.total)}"></div></div>
          <span class="val">${money(p.total)}</span>
        </div>
      </div>
      <div class="hr"></div>
      <div class="row" style="display:flex;justify-content:space-between;font-size:12.5px">
        <span class="muted">差额</span>
        <span><b style="color:var(--accent);font-size:15px">− ${money(p.save)}（${p.savePct.toFixed(1)}%）</b></span>
      </div>
    </div>

    <div class="card">
      <h2>发运批次 <small>票数越少，交接越省事</small></h2>
      <div class="bars">
        <div class="barrow">
          <span class="lab">原方式</span>
          <div class="bartrack"><div class="barfill b" style="width:${wb(p.orders)}"></div></div>
          <span class="val">${p.orders} 票</span>
        </div>
        <div class="barrow">
          <span class="lab">归集方案</span>
          <div class="bartrack"><div class="barfill a" style="width:${wb(p.batches)}"></div></div>
          <span class="val">${p.batches} 批</span>
        </div>
      </div>
      <div class="hr"></div>
      <div class="row" style="display:flex;justify-content:space-between;font-size:12.5px">
        <span class="muted">交接次数</span>
        <span><b style="color:var(--accent);font-size:15px">减少 ${p.orders - p.batches} 次</b></span>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>人工工时 <small>含填单、询价、交接、跑县城</small></h2>
    <div class="bars">
      <div class="barrow">
        <span class="lab">原方式</span>
        <div class="bartrack"><div class="barfill b" style="width:${wm(p.minutesBase)}"></div></div>
        <span class="val">${p.minutesBase} 分钟</span>
      </div>
      <div class="barrow">
        <span class="lab">归集方案</span>
        <div class="bartrack"><div class="barfill a" style="width:${wm(p.minutesNew)}"></div></div>
        <span class="val">${p.minutesNew} 分钟</span>
      </div>
    </div>
  </div>

  <div class="grid-2" style="margin-top:16px">
    <div class="card">
      <h2>钱是从哪里省下来的</h2>
      <div class="concl">
        <div class="li"><i>·</i><span><b>同一客户的多个包裹不再各付一次首重。</b>宋品上海那单 4 个礼盒，逐件发要付 4 次首重，合批后只按件计一次。</span></div>
        <div class="li"><i>·</i><span><b>同向的件凑够了专线起运量。</b>杭州 ${PLAN.lines.find(l=>l.city==='杭州')?.qty||0} 包、上海 ${PLAN.lines.find(l=>l.city==='上海')?.qty||0} 包，本来要付 18 元/包的首重，现在 5 元/包。</span></div>
        <div class="li"><i>·</i><span><b>三个取货点并成一条集货线。</b>零散点交给客货邮，不再各开一趟车。</span></div>
      </div>
    </div>

    <div class="card">
      <h2>省不下来的是什么</h2>
      <div class="concl">
        <div class="li"><i>·</i><span><b>北京、广州两批没省钱。</b>9 包、6 包都够不上 20 包起运量，只能付快递首重，跟原方式一模一样。这不是算法没算好，是物理条件不够。</span></div>
        <div class="li"><i>·</i><span><b>次日达没有变快，只是变便宜。</b>专线是次日达，和顺丰同级；换上客货邮的批次会慢半天到一天。</span></div>
        <div class="li"><i>·</i><span><b>集货要赶 9:00 那趟车。</b>晚于截单时间的件，当天走不了。</span></div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>结论与边界</h2>
    <div class="concl">
      <div class="li"><i>一</i><span>样本 ${p.orders} 单 ${p.qty} 包，计费总成本从 ${money(p.baseTotal)} 降到 ${money(p.total)}，降幅 ${p.savePct.toFixed(1)}%；批次从 ${p.orders} 降到 ${p.batches}；人工从 ${p.minutesBase} 分钟降到 ${p.minutesNew} 分钟。</span></div>
      <div class="li"><i>二</i><span>降幅几乎全部来自两处：<b>同客户合批</b>与<b>凑满专线起运量</b>。够不上起运量的去向，系统不会硬凑——硬凑就是让货等，得由人权衡。</span></div>
      <div class="li"><i>三</i><span>模型只覆盖"订单归集 + 渠道分拨"一个决策点，不涉及采购、仓储、末端派送。适用前提是：渠道报价稳定、单日发件量可预判、取货点位置固定。</span></div>
    </div>
    <div class="note-box">本页所有订单、报价、时效均为构造的演示数据，用于说明方法，不代表任何真实合作社的经营结果。真实数值须来自实地调研与承运方询价。</div>
  </div>`;
}

/* ---------------- 页面：实时订单（读主系统） ---------------- */
function viewLive(){
  return `
  <div class="pagehead">
    <div>
      <h1>实时订单</h1>
      <p>客户在下单页提交的单一进来就落在这里，直接进调度。<b>这一页读的是服务端，不是内置样本。</b></p>
    </div>
    <div class="acts"><button class="btn ghost sm" id="liveRefresh">刷新</button>
      <a class="btn sm" href="order.html" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block">打开下单页</a></div>
  </div>
  <div class="card" style="margin-top:18px" id="liveCard">
    <p class="sub" id="liveMsg">正在读取主系统…</p>
    <div id="liveOrders"></div>
  </div>`;
}

async function fillLive(){
  const msg = $('#liveMsg');
  const box = $('#liveOrders');
  if(!msg || !box) return;

  let orders = [], plan = null, source = '';

  // 先问主系统；问不到就退回本机暂存（公网演示版）
  try{
    const [ro, rp] = await Promise.all([
      fetch(API + '/api/orders').then(r => r.json()),
      fetch(API + '/api/plan', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' }).then(r => r.json())
    ]);
    orders = ro.orders || [];
    plan = rp;
    source = 'server';
  }catch(e){
    try{
      orders = JSON.parse(localStorage.getItem('ct_orders') || '[]');
      if(orders.length){
        orders = orders.map(o => ({ ...o, req: o.req || 'std', pt: o.pt || '溪龙' }));
        plan = buildPlan(orders);
        source = 'local';
      }
    }catch(_){ /* 无本地数据 */ }
  }

  if(!source){
    msg.innerHTML = '读不到订单。本地版请先启动服务 <code>python server.py</code>；公网版在下单页提交一单就会出现在这里。';
    box.innerHTML = '';
    return;
  }

  msg.innerHTML = orders.length
    ? `${source === 'server' ? '主系统' : '本机暂存'}已收 <b>${orders.length}</b> 单（${orders.reduce((s,o)=>s+o.qty,0)} 包）`
    : '还没有收到订单。';

  if(!orders.length){
    box.innerHTML = `<div class="empty">还没有订单。<br>点右上角「打开下单页」，填一张单提交，这里立刻就会出现。</div>`;
    return;
  }

  box.innerHTML = `
    <table>
      <thead><tr><th>订单号</th><th>客户</th><th>收货</th><th>品名</th><th class="num">包裹</th><th class="num">重量</th><th>时效</th><th>提交时间</th></tr></thead>
      <tbody>${orders.map(o => `
        <tr>
          <td class="mono">${esc(o.id)}</td>
          <td>${esc(o.cust)}</td>
          <td>${esc(o.city)}</td>
          <td>${esc(o.item)}</td>
          <td class="num">${o.qty}</td>
          <td class="num">${o.kg}kg${(o.inferred||[]).includes('kg') ? '<span class="chip m" style="margin-left:6px">估</span>' : ''}</td>
          <td>${o.req === 'nextday' ? '<span class="chip m">次日</span>' : '<span class="chip">常规</span>'}</td>
          <td class="mono" style="font-size:11px;color:var(--faint)">${esc(o.created_at || '')}</td>
        </tr>`).join('')}</tbody>
    </table>
    ${plan ? `
    <div class="hr"></div>
    <h2 style="margin-top:0">按这些单算出来的方案 <small>${plan.batches} 批</small></h2>
    <div class="concl">
      <div class="li"><i>·</i><span>成本 <b>${money(plan.total_cost)}</b>，原方式 ${money(plan.baseline_cost)}，省 <b>${money(plan.saving)}（${plan.saving_pct}%）</b></span></div>
      ${(plan.lines||[]).map(l => `<div class="li"><i>·</i><span>${esc(l.city)} ${l.qty} 包 → ${esc(l.channel_name || l.chName)}，${money(l.cost)}${(l.upgraded) ? '' : '（降级）'}　<span class="faint">${esc((l.reasons && l.reasons[0] && l.reasons[0].text) || '')}</span></span></div>`).join('')}
    </div>` : ''}
    <div class="note-box">${source === 'server'
      ? '数据来自服务端 orders.json，关掉服务就回到内置样本。'
      : '这是本机暂存模式：订单存在当前浏览器的 localStorage 里，换设备看不到。要真同步得先有后端。'}</div>
  `;
}

/* ---------------- 路由 ---------------- */
let ROUTE = 'pool';
function render(){
  const v = $('#view');
  if(ROUTE === 'pool') v.innerHTML = viewPool();
  else if(ROUTE === 'channels') v.innerHTML = viewChannels();
  else if(ROUTE === 'plan') v.innerHTML = viewPlan();
  else if(ROUTE === 'live') v.innerHTML = viewLive();
  else v.innerHTML = viewCompare();

  document.querySelectorAll('#nav button').forEach(b => {
    b.classList.toggle('on', b.dataset.r === ROUTE);
  });

  if(ROUTE === 'pool') bindPool();
  if(ROUTE === 'live'){
    fillLive();
    const rb = $('#liveRefresh');
    if(rb) rb.onclick = () => { render(); toast('已刷新'); };
  }
  if(ROUTE === 'plan'){
    const btn = $('#rerun');
    if(btn) btn.onclick = () => { PLAN = buildPlan(); render(); toast('已按当前渠道表重算'); };
  }
}

function bindPool(){
  const btn = $('#recognize');
  if(btn) btn.onclick = () => {
    const rows = Array.from(document.querySelectorAll('#poolBody tr'));
    if(!rows.length) return;
    rows.forEach(r => r.classList.remove('newrow'));
    rows.forEach((r, i) => {
      setTimeout(() => r.classList.add('newrow'), i * 45);
    });
    toast(`识别完成：${ORDERS.length} 单 → ${PLAN.qty} 包，字段缺失 0 项`);
  };
  const re = $('#reload');
  if(re) re.onclick = () => { render(); toast('已恢复初始样本'); };
}

/* ---------------- 主题 ---------------- */
function applyTheme(dark){
  document.body.classList.toggle('dark', dark);
  const t = $('#theme');
  if(t) t.textContent = dark ? '☀' : '☾';
  try{ localStorage.setItem('ct_theme', dark ? 'dark' : 'light'); }catch(e){}
}

$('#theme').onclick = () => {
  applyTheme(!document.body.classList.contains('dark'));
};

$('#nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-r]');
  if(!b) return;
  ROUTE = b.dataset.r;
  try{ location.hash = ROUTE; }catch(e){}
  render();
  window.scrollTo({top:0, behavior:'smooth'});
});

/* ---------------- 启动 ---------------- */
(function init(){
  let dark = false;
  try{ dark = localStorage.getItem('ct_theme') === 'dark'; }catch(e){}
  try{
    const qs = new URLSearchParams(location.search);
    if(qs.get('theme') === 'dark') dark = true;
    if(qs.get('theme') === 'light') dark = false;
  }catch(e){}
  applyTheme(dark);
  const h = (location.hash || '').replace('#','');
  if(['pool','channels','plan','compare','live'].includes(h)) ROUTE = h;
  render();
})();
