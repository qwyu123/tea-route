const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

const dom = new JSDOM(html, { url: 'https://local.test/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const errs = [];
window.addEventListener('error', e => errs.push('window error: ' + e.message));
window.scrollTo = () => {};

try {
  window.eval(src);
} catch (e) {
  errs.push('eval: ' + e.stack.split('\n').slice(0, 4).join(' | '));
}

const doc = window.document;
const q = s => doc.querySelector(s);

console.log('--- routes ---');
for (const r of ['pool', 'channels', 'plan', 'compare']) {
  const btn = doc.querySelector(`#nav button[data-r="${r}"]`);
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const len = q('#view').innerHTML.length;
  const rows = doc.querySelectorAll('#view table tbody tr').length;
  const batches = doc.querySelectorAll('#view .batch').length;
  console.log(`${r}: html=${len} rows=${rows} batches=${batches}`);
  const bad = (q('#view').textContent.match(/NaN|undefined|Infinity/g) || []).length;
  if (bad) errs.push(`${r}: 出现 ${bad} 处 NaN/undefined`);
}

// 关键数字
console.log('--- numbers ---');
const planTxt = (() => {
  doc.querySelector('#nav button[data-r="plan"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return q('#view').textContent.replace(/\s+/g, ' ');
})();
console.log(planTxt.slice(0, 480));

// 点一下「重新识别」，确认动画路径不报错
try {
  doc.querySelector('#nav button[data-r="pool"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const rb = doc.querySelector('#recognize');
  if (rb) rb.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
} catch (e) { errs.push('button: ' + e.message); }

setTimeout(() => {
  const rows = doc.querySelectorAll('#poolBody tr.newrow').length;
  if (rows !== 24) errs.push('识别动画未覆盖全部行: ' + rows);
  console.log('--- errors ---');
  console.log(errs.length ? errs.join('\n') : 'none');
}, 1400);
console.log(errs.length ? errs.join('\n') : 'none');
