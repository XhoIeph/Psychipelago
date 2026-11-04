#!/usr/bin/env node
/**
 * spec.cjs — 把界面规范（UI_SPEC / 设计令牌表）变成可执行断言。
 *
 * 为什么需要它：audit.cjs 判的是"通用准则"（对比度、触控、焦点），但项目自己的规范
 * 写的是具体值（"侧栏机构卡名 17px/1.5/700"、"侧栏宽 380px"、"图层 ctl 800 < sidebar 1100"）。
 * 这些值只有写成断言才有人守；写进文档只能靠人记。
 *
 *   node spec.cjs <url> <spec.json> [--out dir] [--name slug]
 *                  [--viewports 1440x900,999x900,375x812] [--json out.json] [--md out.md]
 *
 * spec.json 结构：
 * {
 *   "name": "traumacompass-ui-spec",
 *   "source": "docs/departments/designer/UI_SPEC.md",
 *   "checks": [ ... ]           // 见下方 check 类型
 * }
 *
 * check 类型：
 *   computed      {selector, props:{"fontSize":"17px","fontWeight":"700"}, tolerance:{"lineHeight":0.6}, at?:1440}
 *   rect          {selector, min:{w:44,h:44}, max?:{w:380}, at?}
 *   singleEntry   {container, desc}            // 容器内最多 1 个可聚焦元素（整卡入口）
 *   forbidText    {text:"↗"}                    // 正文里不得出现某字符
 *   hasText       {selector, text:"这里还没定好"}  // 该元素（或其后代）的可见文本里必须含这句话
 *   前置的 click 若用 text 定位，会依次按 button / tab / link 找同名元素（侧栏栏目是 role=tab）。
 *   textEquals    {selector, from:"doctor"}      // 与前置 remember 记下的文本逐字相等（验证「照录」这类承诺）
 *   count         {selector, expect:1}          // 元素个数（h1 唯一）
 *   uniqueText    {selector}                    // 命中的可见元素文本两两不同（查搜索结果里重复的行）
 *   focusOn       {selector, text}
 *   focusLog      {selector}                  // focus 发生那一刻（focusin 捕获）落点是否在 aria-hidden 子树里               // 前置跑完后 document.activeElement 必须落在这个元素上（查「返回后焦点去哪了」）
 *   tabStaysWithin {selector, presses:40}      // 连按 N 次 Tab，焦点始终不离开这个容器（查抽屉与对话框的焦点陷阱）
 *   mustExist     {selector}
 *   mustNotExist  {selector}
 *   layerOrder    {selectors:[".a",".b"], prop:"zIndex"}   // 必须严格递增
 *   noHScroll     {}                            // 文档不得横向滚动
 *   cssProp       {selector, prop:"scrollPaddingTop", expect:"8px"}
 *
 * 任意 check 可带 precondition：按顺序在干净页面上先跑这几步，再量这条断言。
 * 只允许 fill / click / wait（等选择器出现），例如：
 *   "precondition": [
 *     {"action":"fill","selector":".tc-mapapp-search input","value":"CPTSD"},
 *     {"action":"click","selector":".tc-mapapp-results li[aria-label='病症'] button"},
 *     {"action":"wait","selector":".tc-hospital-card"}
 *   ]
 * 前置没成功时这条记失败（fail），不退化成跳过——跳过会让断言静默失效。
 * click 可带 remember，把该元素（点击前）的文本记下来，供 textEquals 比对：
 *   {"action":"click","selector":".tc-lead-doctor button","remember":"doctor"}
 * 同一个文件里前置相同的断言共用一个干净页面；不同的各自重新打开。
 * click 可带 unlessVisible：那个选择器已经可见就跳过这一步。用于「手机端抽屉默认关着、
 * 桌面端侧栏本来就开着」这类视口差异：
 *   {"action":"click","selector":".tc-mapapp-burger","unlessVisible":".tc-province-row"}
 * click 可带 textContains：按「含这段文字」找元素再点，列表行带数量（「北京 5 家」）时 exact 名对不上：
 *   {"action":"click","selector":".tc-province-row","textContains":"北京"}
 *
 * 退出码：0 全部通过 / 1 有失败 / 2 spec 读不到。
 */
const fs = require('fs');
const path = require('path');

const NODE_PATH_HINT = process.env.NODE_PATH || '';
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('需要 playwright。先设 NODE_PATH 指向装着 playwright 的目录，例如：');
  console.error('  $env:NODE_PATH="C:\\Users\\Lenovo\\.dsh\\profiles\\web\\node_modules"');
  if (NODE_PATH_HINT) console.error('  当前 NODE_PATH=' + NODE_PATH_HINT);
  process.exit(2);
}

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const URL_ARG = argv[0];
const SPEC_ARG = argv[1] && !argv[1].startsWith('--') ? argv[1] : arg('spec', '');
if (!URL_ARG || !SPEC_ARG || URL_ARG.startsWith('--')) {
  console.error('usage: node spec.cjs <url> <spec.json> [--out dir] [--name slug] [--viewports 1440x900,999x900,375x812]');
  process.exit(2);
}
// 默认写到本 skill 的 reports 目录，不落 cwd：多人共享工作树时，谁清一次 cwd 下的 reports/
// 都会让正在跑的 spec 中途 ENOENT（我们踩过两次）。要用别的目录传 --out。
const OUT = arg('out', path.join(__dirname, '..', 'reports'));
const NAME = arg('name', 'spec-' + new URL(URL_ARG).hostname.replace(/[^\w.-]+/g, '_'));
const VIEWPORTS = String(arg('viewports', '1440x900,999x900,375x812'))
  .split(',').map(s => { const [w, h] = s.split('x').map(Number); return { width: w, height: h }; });

let spec;
try {
  spec = JSON.parse(fs.readFileSync(SPEC_ARG, 'utf8').replace(/^\uFEFF/, ''));
} catch (e) {
  console.error('读不到 spec：' + e.message);
  process.exit(2);
}
const CHECKS = Array.isArray(spec.checks) ? spec.checks : [];
if (!CHECKS.length) { console.error('spec 里没有 checks'); process.exit(2); }

// ───────────── 页面内执行体（会被序列化，常量必须写在函数体内）─────────────
function runChecks(checks) {
  const out = [];
  const norm = (v) => (v == null ? '' : String(v));
  const toPx = (v) => {
    const m = /^(-?[\d.]+)px$/.exec(v);
    return m ? parseFloat(m[1]) : null;
  };
  const numEq = (a, b, tol) => (a != null && b != null ? Math.abs(a - b) <= (tol || 0.01) : a === b);

  for (const c of checks) {
    const r = { id: c.id || c.type + ':' + (c.selector || c.container || ''), type: c.type, desc: c.desc || '', pass: null, note: '', evidence: [] };

    // 通用存在性守卫：requireSelector 不匹配时这条记不适用——既不记假绿，也不记红。
    // 用于「count 期望 0」这类断言：组件整批缺席时数到 0 毫无意义。
    if (c.requireSelector && !document.querySelector(c.requireSelector)) {
      r.pass = null;
      r.note = '守卫组件不存在，断言不适用：' + c.requireSelector;
      out.push(r);
      continue;
    }

    if (c.type === 'computed') {
      // 计算样式跟尺寸无关：body 在这种全固定布局里高度为 0，但 fontSize/lineHeight 仍然有意义。
      // 所以优先取可见元素，没有可见的退到第一个匹配（不因为尺寸为 0 就判失败）。
      const allEls = [...document.querySelectorAll(c.selector)];
      const visible = allEls.filter(e => {
        const rc = e.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      const els = visible.length ? visible : allEls;
      if (!els.length) {
        // absentOk：本断言要证明的是「该组件此刻不显示」。组件压根没被创建出来，
        // 与 display:none 是同一个可见性结论，所以判 pass 并记 absent。这不是 skipIfMissing
        // 那种「没验到」——必须逐条显式打开，且要配一条正向断言（如 desktop.scale-present）。
        if (c.absentOk) {
          r.pass = true;
          r.evidence.push('absent: 选择器没匹配到元素');
          r.note = '元素不存在，等同不显示（absentOk）：' + c.selector;
          out.push(r); continue;
        }
        r.pass = c.skipIfMissing ? null : false;
        r.note = (c.skipIfMissing ? '本页没有该组件，断言不适用：' : '选择器没有可见元素：') + c.selector;
        out.push(r); continue;
      }
      const el = els[0];
      const cs = getComputedStyle(el);
      let allOk = true;
      for (const [prop, expect] of Object.entries(c.props || {})) {
        const actual = cs[prop];
        const tol = (c.tolerance && c.tolerance[prop]) || 0.01;
        let ok;
        if (c.contains && c.contains[prop]) ok = String(actual).includes(String(expect));
        else if (toPx(expect) != null && toPx(actual) != null) ok = numEq(toPx(actual), toPx(expect), tol);
        else if (/^[\d.]+$/.test(expect) && /^[\d.]+$/.test(actual)) ok = numEq(parseFloat(actual), parseFloat(expect), tol);
        else ok = norm(actual) === norm(expect);
        if (!ok) allOk = false;
        r.evidence.push(`${prop}: 期望 ${expect} 实际 ${actual}${ok ? '' : ' ❌'}`);
      }
      r.pass = allOk;
      r.note = `${els.length} 个匹配${visible.length ? '' : '（均无尺寸，取第一个匹配算样式）'}；取样 ${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(/\s+/)[0] : ''}`;
      out.push(r); continue;
    }

    if (c.type === 'rect' || c.type === 'cssProp') {
      const els = [...document.querySelectorAll(c.selector)].filter(e => {
        const rc = e.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      if (!els.length) {
        r.pass = c.skipIfMissing ? null : false;
        r.note = (c.skipIfMissing ? '本页没有该组件，断言不适用：' : '选择器没有可见元素：') + c.selector;
        out.push(r); continue;
      }
      let allOk = true;
      for (const el of els.slice(0, 20)) {
        const rc = el.getBoundingClientRect();
        if (c.type === 'rect') {
          if (c.min) {
            if (c.min.w && rc.width + 0.5 < c.min.w) { allOk = false; r.evidence.push(`${rc.width.toFixed(1)}×${rc.height.toFixed(1)} < min ${c.min.w}×${c.min.h || 0}`); }
            if (c.min.h && rc.height + 0.5 < c.min.h) { allOk = false; r.evidence.push(`${rc.width.toFixed(1)}×${rc.height.toFixed(1)} 高度 < ${c.min.h}`); }
            if (c.min.x != null && rc.left < c.min.x - 0.5) { allOk = false; r.evidence.push(`left ${rc.left.toFixed(1)} < ${c.min.x}`); }
            if (c.min.y != null && rc.top < c.min.y - 0.5) { allOk = false; r.evidence.push(`top ${rc.top.toFixed(1)} < ${c.min.y}`); }
          }
          if (c.max) {
            if (c.max.w && rc.width - 0.5 > c.max.w) { allOk = false; r.evidence.push(`宽 ${rc.width.toFixed(1)} > max ${c.max.w}`); }
            if (c.max.h && rc.height - 0.5 > c.max.h) { allOk = false; r.evidence.push(`高 ${rc.height.toFixed(1)} > max ${c.max.h}`); }
            if (c.max.x != null && rc.right > c.max.x + 0.5) { allOk = false; r.evidence.push(`right ${rc.right.toFixed(1)} > ${c.max.x}`); }
            if (c.max.y != null && rc.top > c.max.y + 0.5) { allOk = false; r.evidence.push(`top ${rc.top.toFixed(1)} > ${c.max.y}`); }
          }
        } else {
          const actual = getComputedStyle(el)[c.prop];
          const tol = c.tolerance ? c.tolerance : 0.01;
          const ok = c.contains ? String(actual).includes(String(c.expect))
            : (toPx(c.expect) != null && toPx(actual) != null) ? numEq(toPx(actual), toPx(c.expect), tol) : norm(actual) === norm(c.expect);
          if (!ok) { allOk = false; r.evidence.push(`${c.prop}: 期望 ${c.expect} 实际 ${actual}`); }
        }
      }
      r.pass = allOk;
      if (!r.evidence.length) r.evidence.push(`${els.length} 个元素全部达标`);
      r.note = `${els.length} 个匹配`;
      out.push(r); continue;
    }

    if (c.type === 'layoutRel') {
      const pick = (sel) => {
        const el = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        return el ? el.getBoundingClientRect() : null;
      };
      const A = pick(c.a), B = pick(c.b);
      if (!A || !B) {
        r.pass = c.skipIfMissing ? null : false;
        r.note = (c.skipIfMissing ? '本页缺少元素，断言不适用：' : '找不到元素：') + (!A ? c.a : c.b);
        out.push(r); continue;
      }
      const gap = c.gap || 0, tol = 1;
      const d = { above: B.top - A.bottom, below: A.top - B.bottom, leftOf: B.left - A.right, rightOf: A.left - B.right }[c.relation];
      const sep = Math.max(B.left - A.right, A.left - B.right, B.top - A.bottom, A.top - B.bottom);
      const ok = c.relation === 'notOverlap' ? sep >= gap - tol : (typeof d === 'number' && d >= gap - tol);
      r.pass = ok;
      r.evidence.push(`${c.relation}: ${c.a} [${A.left.toFixed(0)},${A.top.toFixed(0)}–${A.right.toFixed(0)},${A.bottom.toFixed(0)}] vs ${c.b} [${B.left.toFixed(0)},${B.top.toFixed(0)}–${B.right.toFixed(0)},${B.bottom.toFixed(0)}]`);
      r.note = ok ? `${c.relation} 成立${gap ? '（间距 ≥ ' + gap + 'px）' : ''}` : `${c.relation} 不成立${gap ? '（间距应 ≥ ' + gap + 'px，实际 ' + d.toFixed(1) + '）' : ''}`;
      out.push(r); continue;
    }

    if (c.type === 'singleEntry') {
      const boxes = [...document.querySelectorAll(c.container)];
      if (!boxes.length) { r.pass = false; r.note = '容器不存在：' + c.container; out.push(r); continue; }
      const bad = [];
      for (const b of boxes) {
        const focusables = [...b.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
          .filter(e => {
            const rc = e.getBoundingClientRect();
            return rc.width > 0 && rc.height > 0;
          });
        if (focusables.length > 1) bad.push(focusables.length);
      }
      r.pass = bad.length === 0;
      r.note = `${boxes.length} 个容器`;
      if (bad.length) r.evidence.push(`${bad.length} 个容器有多个可聚焦入口，例如 ${bad.slice(0, 5).join('/')} 个`);
      else r.evidence.push('每个容器只有 1 个可聚焦入口');
      out.push(r); continue;
    }

    if (c.type === 'forbidText') {
      // scope 用来把检查限定在某块界面里：同一句「关闭」在弹层里不该出现，在别处可能正常。
      const root = c.scope ? document.querySelector(c.scope) : document.body;
      if (!root) {
        r.pass = c.skipIfMissing ? null : false;
        r.note = (c.skipIfMissing ? '本页没有该范围，断言不适用：' : '范围元素不存在：') + c.scope;
        out.push(r); continue;
      }
      const hits = [];
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue || '';
        if (!t.includes(c.text)) continue;
        const el = n.parentElement;
        if (!el) continue;
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        hits.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\s+/)[0] : '') + ' 「' + t.trim().slice(0, 30) + '」');
      }
      r.pass = hits.length === 0;
      r.note = `含「${c.text}」的可见文本节点 ${hits.length} 个${c.scope ? '（范围 ' + c.scope + '）' : ''}`;
      r.evidence = hits.slice(0, 8);
      out.push(r); continue;
    }

    if (c.type === 'hasText') {
      const els = [...document.querySelectorAll(c.selector)].filter(e => {
        const rc = e.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ');
      if (!els.length) { r.pass = false; r.note = '选择器没有可见元素：' + c.selector; out.push(r); continue; }
      const hit = els.find(e => flat(e.textContent).includes(flat(c.text)));
      r.pass = Boolean(hit);
      r.note = r.pass
        ? `文本里有「${c.text}」`
        : `文本里没有「${c.text}」：当前是「${flat(els[0].textContent).trim().slice(0, 40)}」`;
      if (r.pass) r.evidence.push('取样 ' + hit.tagName.toLowerCase());
      out.push(r); continue;
    }

    // 属性文案：placeholder / aria-label 这类不进 textContent 的文字，只能用属性查。
    if (c.type === 'attr') {
      const els = [...document.querySelectorAll(c.selector)].filter(e => {
        const rc = e.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
      if (!els.length) {
        r.pass = c.skipIfMissing ? null : false;
        r.note = (c.skipIfMissing ? '本页没有该组件，断言不适用：' : '选择器没有可见元素：') + c.selector;
        out.push(r); continue;
      }
      const actual = flat(els[0].getAttribute(c.attr));
      const miss = [];
      if (c.contains && !actual.includes(c.contains)) miss.push(`应含「${c.contains}」`);
      if (c.notContains) for (const bad of [].concat(c.notContains)) if (actual.includes(bad)) miss.push(`不该含「${bad}」`);
      if (c.equals != null && actual !== flat(c.equals)) miss.push(`应等于「${c.equals}」`);
      r.pass = miss.length === 0;
      r.note = r.pass ? `${c.attr} = 「${actual}」` : `${c.attr} = 「${actual}」；${miss.join('，')}`;
      out.push(r); continue;
    }

    if (c.type === 'textEquals') {
      const els = [...document.querySelectorAll(c.selector)].filter(e => {
        const rc = e.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
      const expect = flat(c.memoValue);
      if (!els.length) { r.pass = false; r.note = '选择器没有可见元素：' + c.selector; out.push(r); continue; }
      if (!expect) { r.pass = false; r.note = `前置没有记下「${c.from}」：检查 remember 是否写在那一步 click 上`; out.push(r); continue; }
      const actual = flat(els[0].textContent);
      r.pass = actual === expect;
      r.note = r.pass ? `与前置记下的「${c.from}」逐字一致` : `期望「${expect}」实际「${actual}」`;
      if (!r.pass) r.evidence.push(`取样 ${els[0].tagName.toLowerCase()}`);
      out.push(r); continue;
    }

    if (c.type === 'uniqueText') {
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
      const seen = new Map();
      const dups = [];
      for (const el of document.querySelectorAll(c.selector)) {
        const rc = el.getBoundingClientRect();
        if (!rc.width || !rc.height) continue;
        const t = flat(el.textContent);
        if (!t) continue;
        if (seen.has(t)) dups.push(t.slice(0, 40) + ' ×' + (seen.get(t) + 1));
        seen.set(t, (seen.get(t) || 0) + 1);
      }
      r.pass = dups.length === 0;
      r.note = r.pass ? `${seen.size} 条文本互不相同` : `有重复文本：${dups.slice(0, 4).join(' / ')}`;
      out.push(r); continue;
    }

    // 焦点落位：前置跑完之后，document.activeElement 必须落在指定元素上。
    // 拦「返回以后焦点掉到别处」这类只查样式看不出来的问题。
    if (c.type === 'focusOn') {
      if (c.from && !c.memoValue) {
        r.pass = false;
        r.note = `前置没有记下「${c.from}」：检查 remember 是否写在那一步 click 上`;
        out.push(r); continue;
      }
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
      const want = c.from ? c.memoValue : c.text;
      const active = document.activeElement;
      const isEl = active && active.nodeType === 1;
      const inSel = Boolean(isEl && active.matches(String(c.selector)));
      const textOk = want ? flat(active.textContent).includes(flat(want)) : true;
      // 落点在 aria-hidden 子树里等于把焦点交给读屏不了的内容：常驻挂载的入口按钮
      // 若在同一个同步回调里「先 focus 再摘 aria-hidden」，浏览器看不出，SR 上就是丢焦点。
      let hiddenAncestor = null;
      for (let n = isEl ? active : null; n && n !== document.documentElement; n = n.parentElement) {
        if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') {
          hiddenAncestor = n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/)[0] : '');
          break;
        }
      }
      r.pass = inSel && textOk && !hiddenAncestor;
      const where = isEl
        ? active.tagName.toLowerCase() + (active.className ? '.' + String(active.className).split(/\s+/)[0] : '') + ' 「' + flat(active.textContent).slice(0, 24) + '」'
        : String(active && active.nodeName);
      r.note = r.pass
        ? `焦点在 ${c.selector}${want ? '「' + want + '」' : ''}`
        : `焦点不在 ${c.selector}${want ? '「' + want + '」' : ''}：现在在 ${where}`;
      if (hiddenAncestor && inSel && textOk) r.note += `；落点所在子树带 aria-hidden="true"（${hiddenAncestor}）`;
      out.push(r); continue;
    }

    if (c.type === 'focusLog') {
      const log = Array.isArray(window.__focusLog) ? window.__focusLog : [];
      const sel = String(c.selector || '');
      const hits = log.filter(x => x.target === sel || (c.contains && x.target.includes(String(c.contains))));
      const last = hits[hits.length - 1];
      if (!last) {
        // 没记录到 focusin，说明焦点根本没动过——focus() 落在已经聚焦的元素上是空操作。
        // 这时断言什么都没证明，按红算，别让它变成「不适用」混过去。
        if (c.allowMissing) {
          r.pass = null;
          r.note = `这次运行里没有记录到焦点落到 ${sel}；焦点记录 ${log.length} 条`;
        } else {
          r.pass = false;
          r.note = `这次运行里没有记录到焦点落到 ${sel}：焦点压根没移动过（focus() 打在已聚焦元素上是空操作），断言没证明任何事`;
        }
        out.push(r); continue;
      }
      r.pass = !last.hidden;
      r.note = r.pass
        ? `焦点落到 ${last.target} 的那一刻没有 aria-hidden 祖先`
        : `焦点落到 ${last.target} 时它还在 aria-hidden="true" 的子树里（${last.hidden}）：读屏上等于丢焦点`;
      out.push(r); continue;
    }

    if (c.type === 'count') {
      const n = document.querySelectorAll(c.selector).length;
      if (n === 0 && c.skipIfMissing) { r.pass = null; r.note = '本页没有该组件，断言不适用：' + c.selector; out.push(r); continue; }
      r.pass = c.expect != null ? n === c.expect : (c.min != null ? n >= c.min : true);
      r.note = `${c.selector} = ${n}${c.expect != null ? '（期望 ' + c.expect + '）' : ''}`;
      out.push(r); continue;
    }

    if (c.type === 'mustExist' || c.type === 'mustNotExist') {
      const n = document.querySelectorAll(c.selector).length;
      r.pass = c.type === 'mustExist' ? n > 0 : n === 0;
      r.note = `${c.selector} = ${n}${c.type === 'mustExist' ? '（必须存在）' : '（必须不存在）'}`;
      out.push(r); continue;
    }

    if (c.type === 'layerOrder') {
      const zs = c.selectors.map(s => {
        const el = document.querySelector(s);
        if (!el) return { s, z: null };
        const z = getComputedStyle(el).zIndex;
        return { s, z: z === 'auto' ? null : parseInt(z, 10) };
      });
      const missing = zs.filter(x => x.z == null);
      if (missing.length) { r.pass = null; r.note = '有元素没设 z-index 或不存在：' + missing.map(x => x.s).join(', '); out.push(r); continue; }
      let ok = true;
      for (let i = 1; i < zs.length; i++) if (!(zs[i].z > zs[i - 1].z)) ok = false;
      r.pass = ok;
      r.evidence = zs.map(x => `${x.s} z=${x.z}`);
      out.push(r); continue;
    }

    if (c.type === 'noHScroll') {
      const de = document.documentElement;
      const over = de.scrollWidth - de.clientWidth;
      r.pass = over <= 1;
      r.note = `文档横向溢出 ${over}px`;
      out.push(r); continue;
    }

    r.pass = null;
    r.note = '未知 check 类型：' + c.type;
    out.push(r);
  }
  return out;
}

// ───────────── 主流程 ─────────────

/* 页面上下文做不了的断言：焦点环（真按 Tab）、reduced-motion（模拟媒体特性）。
   两条都验过真能失败：
   - 焦点环：TraumaCompass 把环画在 article.tc-card 上，只看按钮自身会误判成"没焦点环"，
     所以这里沿祖先找环，并记录画在哪一层。
   - reduced-motion：antd 文档站在 reduce 下仍有 206 个动画在跑，判据能红。 */
/* 颜色比较：computed 给 "rgb(25, 59, 56)"，断言里写 "#193b38" 或 "rgb(...)" 都认。
   允许 ±2 通道误差——不同引擎对 rgba 取整、gamma 的处理差一点，不该因此假失败。 */
function rgbTriplet(v) {
  if (typeof v !== 'string') return null;
  const hex = v.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) { const n = parseInt(hex[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = v.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(',').map(t => parseFloat(t)).slice(0, 3);
    return p.length === 3 && p.every(n => !isNaN(n)) ? p : null;
  }
  return null;
}
function sameRGB(a, b) {
  const x = rgbTriplet(a), y = rgbTriplet(b);
  if (!x || !y) return false;
  return x.every((n, i) => Math.abs(n - y[i]) <= 2);
}
/* 阴影里的颜色带 alpha（如 rgba(8,127,123,0.1)），不能整串比，只查三元组。 */
function shadowUses(color, shadow) {
  const t = rgbTriplet(color);
  if (!t || !shadow || shadow === 'none') return false;
  return new RegExp(`rgba?\\(\\s*${t[0]}\\s*,\\s*${t[1]}\\s*,\\s*${t[2]}\\b`, 'i').test(shadow);
}

async function runSpecial(page, checks) {
  const out = [];
  for (const c of checks) {
    const r = { id: c.id || c.type, type: c.type, desc: c.desc || '', pass: null, note: '', evidence: [] };
    try {
      // 焦点陷阱：连按 Tab，焦点不许离开容器。抽屉、对话框这类「打开后接管焦点」的浮层用它。
      if (c.type === 'tabStaysWithin') {
        const within = String(c.selector);
        const presses = Number(c.presses || 40);
        let escapedAt = null;
        let outside = '';
        for (let i = 0; i < presses; i += 1) {
          await page.keyboard.press('Tab');
          const where = await page.evaluate((sel) => {
            const root = document.querySelector(sel);
            const active = document.activeElement;
            const name = (el) => (el ? el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(/\s+/)[0] : '') : 'null');
            if (!root) return { inside: false, tag: '容器不存在' };
            if (!active || active === document.body) return { inside: false, tag: name(active) };
            return { inside: root.contains(active), tag: name(active) };
          }, within);
          if (!where.inside) { escapedAt = i + 1; outside = where.tag; break; }
        }
        r.pass = escapedAt === null;
        r.note = r.pass
          ? `${presses} 次 Tab 都留在 ${within} 内`
          : `第 ${escapedAt} 次 Tab 落到 ${outside}，已离开 ${within}`;
        r.evidence = [{ presses, escapedAt }];
        out.push(r); continue;
      }
      if (c.type === 'focusRing') {
        const sel = c.selector;
        const maxTab = c.maxTab || 40;
        const target = c.ancestorSelector || sel;
        // 环宽默认 3px（旧规范），2026-11-01 后规范改成 2px 墨色环，所以必须能配。
        const minW = c.minWidth != null ? c.minWidth : 3;
        let found = null;
        for (let i = 0; i < maxTab && !found; i++) {
          await page.keyboard.press('Tab');
          const hit = await page.evaluate(({ sel, anc, levels, minW }) => {
            const el = document.activeElement;
            if (!el || !el.matches || !el.matches(sel)) return null;
            const read = (n) => {
              const cs = getComputedStyle(n);
              return {
                tag: n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className ? '.' + n.className.split(/\s+/)[0] : ''),
                width: parseFloat(cs.outlineWidth) || 0,
                style: cs.outlineStyle,
                offset: parseFloat(cs.outlineOffset) || 0,
                color: cs.outlineColor,
                borderColor: cs.borderTopColor,
                borderWidth: parseFloat(cs.borderTopWidth) || 0,
                shadow: cs.boxShadow,
              };
            };
            let n = el;
            for (let d = 0; d <= levels && n; d++) {
              const info = read(n);
              const onTarget = n.matches && n.matches(anc || sel);
              if ((info.width >= minW && info.style !== 'none') || (onTarget && info.shadow && info.shadow !== 'none')) {
                return { depth: d, ...info, onTarget };
              }
              n = n.parentElement;
            }
            return { depth: -1, note: '按到了元素，但它和 ' + levels + ' 层祖先上都没有 ' + minW + 'px 描边' };
          }, { sel, anc: target, levels: c.levels != null ? c.levels : 3, minW });
          if (hit) found = hit;
        }
        if (!found) {
          r.pass = false;
          r.note = `按了 ${maxTab} 次 Tab 都没落到 ${sel}（焦点进不去或被别的东西截走）`;
        } else if (found.depth === -1) {
          r.pass = false;
          r.note = found.note;
        } else {
          const ring = found.width >= minW && found.style !== 'none';
          const offsetOk = c.offset == null || Math.abs(found.offset - c.offset) < 0.5;
          const bad = [];
          if (c.expectColor && !sameRGB(found.color, c.expectColor)) bad.push(`环色 ${found.color}，期望 ${c.expectColor}`);
          if (c.forbidColor && (sameRGB(found.color, c.forbidColor) || shadowUses(c.forbidColor, found.shadow))) bad.push(`环用了禁用色 ${c.forbidColor}`);
          r.pass = ring && offsetOk && bad.length === 0;
          r.note = `环在 ${found.depth === 0 ? '元素自身' : '第 ' + found.depth + ' 层祖先 ' + found.tag}：${found.width}px ${found.style} / offset ${found.offset}px` + (bad.length ? '；' + bad.join('；') : '');
          r.evidence = [found.color, found.shadow && found.shadow !== 'none' ? found.shadow : ''];
        }
      } else if (c.type === 'focusBorder') {
        /* 输入类的焦点规范：不加外描边，只把边框加深。所以既要在「聚焦后」读边框色，
           也要在「静止时」读一遍，证明两者不同——否则改坏了（聚焦没变化）也会通过。
           定位方式：先直接 focus（文本类输入按 UA 规则必然命中 :focus-visible），
           命不中再退回逐次 Tab——地图首页侧栏有上百张卡，纯 Tab 走不到顶部搜索框。 */
        const maxTab = c.maxTab || 40;
        let focused = null;
        let how = '';
        const readFocused = () => page.evaluate(({ sel }) => {
          const el = document.activeElement;
          if (!el || !el.matches || !el.matches(sel)) return null;
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            focusVisible: !!(el.matches && el.matches(':focus-visible')),
            borderColor: cs.borderTopColor,
            borderWidth: parseFloat(cs.borderTopWidth) || 0,
            outlineWidth: parseFloat(cs.outlineWidth) || 0,
            outlineStyle: cs.outlineStyle,
            outlineColor: cs.outlineColor,
            shadow: cs.boxShadow,
          };
        }, { sel: c.selector });
        try { await page.focus(c.selector); } catch (e) { /* 元素不在，退回 Tab */ }
        focused = await readFocused();
        if (focused && focused.focusVisible) how = '直接 focus（输入类必命中 :focus-visible）';
        else {
          focused = null;
          for (let i = 0; i < maxTab && !focused; i++) {
            await page.keyboard.press('Tab');
            const hit = await readFocused();
            if (hit && hit.focusVisible) { focused = hit; how = `第 ${i + 1} 次 Tab`; }
          }
        }
        if (!focused) {
          r.pass = false;
          r.note = `定位不到聚焦态下的 ${c.selector}（直接 focus 与 ${maxTab} 次 Tab 都没命中 :focus-visible）`;
        } else {
          const rest = await page.evaluate(({ sel }) => {
            const el = document.activeElement;
            if (el && el.blur) el.blur();
            const t = document.querySelector(sel);
            if (!t) return null;
            const cs = getComputedStyle(t);
            return { borderColor: cs.borderTopColor, borderWidth: parseFloat(cs.borderTopWidth) || 0, shadow: cs.boxShadow };
          }, { sel: c.selector });
          const bad = [];
          if (!rest) bad.push('焦点解除后找不到元素');
          else {
            if (sameRGB(rest.borderColor, focused.borderColor)) bad.push(`聚焦与静止边框同色（${focused.borderColor}），看不出焦点`);
            if (c.expectRestColor && !sameRGB(rest.borderColor, c.expectRestColor)) bad.push(`静止边框 ${rest.borderColor}，期望 ${c.expectRestColor}`);
            if (c.expectWidth != null && Math.abs(rest.borderWidth - focused.borderWidth) > 0.5) bad.push(`聚焦改了边框宽度 ${rest.borderWidth}px → ${focused.borderWidth}px`);
            // 聚焦只能深一档颜色，不许再加光环/投影（原来有投影的元件保持原样）。
            const norm = (s) => (s && s !== 'none' ? s : 'none');
            if (norm(rest.shadow) !== norm(focused.shadow)) bad.push(`聚焦改了投影：静止 ${norm(rest.shadow)} → 聚焦 ${norm(focused.shadow)}`);
          }
          if (c.expectColor && !sameRGB(focused.borderColor, c.expectColor)) bad.push(`聚焦边框 ${focused.borderColor}，期望 ${c.expectColor}`);
          if (c.expectWidth != null && Math.abs(focused.borderWidth - c.expectWidth) > 0.5) bad.push(`边框 ${focused.borderWidth}px，期望 ${c.expectWidth}px`);
          if (focused.outlineWidth > 0 && focused.outlineStyle !== 'none') bad.push(`仍有 ${focused.outlineWidth}px ${focused.outlineStyle} 外描边（${focused.outlineColor}）`);
          if (c.forbidColor && (sameRGB(focused.borderColor, c.forbidColor) || shadowUses(c.forbidColor, focused.shadow))) bad.push(`用了禁用色 ${c.forbidColor}`);
          r.pass = bad.length === 0;
          r.note = bad.length ? bad.join('；') : `${c.selector}：静止 ${rest ? rest.borderColor : '?'} → 聚焦 ${focused.borderColor}，${focused.borderWidth}px，无外描边（${how}）`;
          r.evidence = [`静止 ${rest ? rest.borderColor : '?'}`, `聚焦 ${focused.borderColor}`];
        }
      } else if (c.type === 'focusNoColor') {
        /* 全局扫：逐个 Tab，任何元素在聚焦态用禁用色（描边/阴影/边框）就算失败。
           这条直接对应「整体设计中都不出现该规范」，不靠人肉抽查。
           必须连祖先一起看：TraumaCompass 把环画在 article.tc-card 上，只看 focused
           元素自身会判成"干净"——这个盲区之前已经误报过一次。 */
        const maxTab = c.maxTab || 60;
        const levels = c.levels != null ? c.levels : 3;
        const forbid = c.forbid || [];
        const offenders = [];
        let seen = 0;
        for (let i = 0; i < maxTab; i++) {
          await page.keyboard.press('Tab');
          const nodes = await page.evaluate(({ lv }) => {
            let el = document.activeElement;
            if (!el || el === document.body || el === document.documentElement) return null;
            const out = [];
            for (let d = 0; d <= lv && el; d++) {
              const cs = getComputedStyle(el);
              const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '';
              out.push({
                tag: el.tagName.toLowerCase() + cls,
                level: d,
                outlineWidth: parseFloat(cs.outlineWidth) || 0,
                outlineStyle: cs.outlineStyle,
                outlineColor: cs.outlineColor,
                borderColor: cs.borderTopColor,
                borderWidth: parseFloat(cs.borderTopWidth) || 0,
                borderStyle: cs.borderTopStyle,
                shadow: cs.boxShadow,
              });
              el = el.parentElement;
            }
            return out;
          }, { lv: levels });
          if (!nodes) continue;
          seen++;
          for (const n of nodes) {
            let why = null;
            for (const f of forbid) {
              const ring = n.outlineWidth > 0 && n.outlineStyle !== 'none' && sameRGB(n.outlineColor, f);
              const halo = shadowUses(f, n.shadow);
              /* 只有真画出来的边框才算：border-style:none 或 0px 时 computed color 仍会
                 取 currentcolor（选中态 tab 就是绿文字色），看着像绿框其实一条都没画。 */
              const border = n.borderWidth > 0 && n.borderStyle !== 'none' && n.level === 0 && sameRGB(n.borderColor, f);
              if (ring) { why = '描边 ' + n.outlineColor; break; }
              if (halo) { why = '阴影 ' + n.shadow; break; }
              if (border) { why = '边框 ' + n.borderColor; break; }
            }
            if (why) {
              offenders.push(`${n.tag}${n.level ? '（第 ' + n.level + ' 层祖先）' : ''}：${why}`);
              break;
            }
          }
        }
        r.pass = seen === 0 ? null : offenders.length === 0;
        r.note = seen === 0
          ? '一个 Tab 都没落进可聚焦元素，无法判定'
          : offenders.length
            ? `仍有 ${offenders.length} 处焦点使用禁用色：${offenders.slice(0, 6).join('，')}${offenders.length > 6 ? ' 等' : ''}`
            : `${seen} 个焦点元素都没用禁用色（${forbid.join(' / ')}）`;
        r.evidence = offenders.slice(0, 12);
      } else if (c.type === 'media') {
        const before = await page.evaluate(({ sel, props }) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          return Object.fromEntries(Object.keys(props).map(k => [k, cs[k]]));
        }, { sel: c.selector, props: c.props });
        if (!before) { r.pass = c.skipIfMissing ? null : false; r.note = '选择器没有匹配：' + c.selector; out.push(r); continue; }
        await page.emulateMedia(c.media || { reducedMotion: 'reduce' });
        await page.waitForTimeout(c.settle || 350);
        const after = await page.evaluate(({ sel, props }) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          return Object.fromEntries(Object.keys(props).map(k => [k, cs[k]]));
        }, { sel: c.selector, props: c.props });
        await page.emulateMedia({ reducedMotion: null });
        const bad = [];
        for (const [k, want] of Object.entries(c.props)) {
          if (String(after[k]) !== String(want)) bad.push(`${k}: 期望 ${want}，实测 ${after[k]}`);
        }
        r.pass = bad.length === 0;
        r.note = bad.length ? bad.join('；') : `reduce 下 ${Object.keys(c.props).join('/')} 符合期望`;
        r.evidence = [`正常态：${JSON.stringify(before)}`, `reduce 态：${JSON.stringify(after)}`];
      }
    } catch (e) {
      r.pass = null;
      r.note = '断言执行出错：' + String(e.message || e).slice(0, 160);
    }
    out.push(r);
  }
  return out;
}

// 断言的「前置状态」：写在断言文件的 precondition 里，只允许三种动作。
// 直接操作页面（不是参数化的全局开关），这样同一份文件就能说清「这条要在什么状态下量」。
const PRECONDITION_ACTIONS = new Set(['fill', 'click', 'clickjs', 'wait', 'select', 'key', 'press', 'focus', 'expectfocus']);

async function applyPrecondition(page, steps) {
  const memo = {};
  for (const step of steps) {
    const action = String((step && step.action) || '').toLowerCase();
    if (!PRECONDITION_ACTIONS.has(action)) {
      return { ok: false, note: `前置动作不认识：${action || '(空)'}，只支持 fill / click / wait / select / key（或 press）/ focus / expectFocus`, memo };
    }
    // key / press 没有选择器：直接往当前焦点元素敲键（Escape 关抽屉、Tab 走位这类）。
    // press 是 key 的别名，两个名字都收：断言作者按日常说法写的也能跑。
    if (action === 'key' || action === 'press') {
      if (!step.value) return { ok: false, note: `前置动作 ${action} 缺 value（例如 "Escape"）`, memo };
      await page.keyboard.press(String(step.value));
      if (step.afterMs) await page.waitForTimeout(Number(step.afterMs));
      continue;
    }
    if (!step.selector && !step.text) return { ok: false, note: `前置动作 ${action} 缺 selector（或 text）`, memo };
    // 目标已经在视口里就跳过这一步：桌面端侧栏开着时点汉堡反而会把侧栏关掉。
    // 用视口相交判断而不是 isVisible——抽屉是靠 transform 移出屏幕的，元素仍有尺寸，
    // isVisible 会说「可见」，点它才超时。
    if (action === 'click' && step.unlessVisible) {
      const inView = await page.locator(step.unlessVisible).first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
      }).catch(() => false);
      if (inView) continue;
    }
    const timeout = step.timeout || 15000;
    // 桌面与手机的入口可能是两个不同元素（桌面汉堡、手机底部条）。同一个前置要在两档都对，
    // 用 mobileSelector 显式给出窄屏入口；不写就仍用 selector。
    const viewportWidth = page.viewportSize()?.width ?? 0;
    const stepSelector = viewportWidth > 0 && viewportWidth < 1000 && step.mobileSelector ? step.mobileSelector : step.selector;
    try {
      if (action === 'focus') {
        // 先把焦点明确放到某个元素上，再让后续动作去动它：比等浏览器「点一下顺便聚焦」确定。
        await page.evaluate((s2) => {
          const el = document.querySelector(s2);
          if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
        }, stepSelector);
        continue;
      }
      if (action === 'expectfocus') {
        const ok = await page.evaluate((s2) => {
          const a = document.activeElement;
          return Boolean(a && a.nodeType === 1 && a.matches(s2));
        }, stepSelector);
        if (!ok) {
          const where = await page.evaluate(() => {
            const a = document.activeElement;
            if (!a) return 'null';
            if (a.nodeType !== 1) return String(a.nodeName);
            return a.tagName.toLowerCase() + (a.className ? '.' + String(a.className).split(/\\s+/)[0] : '');
          });
          return { ok: false, note: `前置要求焦点在 ${stepSelector}，实际在 ${where}` };
        }
        continue;
      }
      if (action === 'clickjs') {
        // 在页面里直接派发 click：不等动画稳定、不要求元素在视口内。
        // 用来测「过渡还在走的时候点关闭」，force:true 仍会等元素进入可点位置，测不到真实时序。
        const sel = stepSelector || step.text;
        const ok = await page.evaluate((q) => {
          const el = document.querySelector(q);
          if (!el) return false;
          el.click();
          return true;
        }, sel);
        if (!ok) return { ok: false, note: `clickjs 找不到元素：${sel}`, memo };
        continue;
      }
      if (action === 'select') {
        const value = step.value === undefined ? '' : String(step.value);
        await page.locator(stepSelector).first().selectOption(value, { timeout });
      } else if (action === 'wait') {
        await page.waitForSelector(stepSelector, { state: step.state || 'visible', timeout });
      } else {
        // 按可见文案定位：有些断言只能落到某一条具体记录上（例如某个医生名），
        // 而列表元素没有稳定 id，只能用文字点。tab 不是 button，所以按 button / tab / link
        // 依次找，别只认 button——侧栏栏目是 role=tab。
        let el;
        // textContains：列表行没有稳定 id，又带有数量（「北京 5 家」），exact 名对不上。
        if (step.textContains) {
          el = page.locator(stepSelector || 'body').filter({ hasText: String(step.textContains) }).first();
        } else if (step.text) {
          const name = String(step.text);
          el = null;
          for (const role of ['button', 'tab', 'link']) {
            const cand = page.getByRole(role, { name, exact: true }).first();
            if (await cand.count()) { el = cand; break; }
          }
          if (!el) el = page.getByText(name, { exact: true }).first();
        } else {
          el = page.locator(stepSelector).first();
        }
        await el.waitFor({ state: 'visible', timeout });
        // remember 必须在点击前读：点了以后这个元素可能整块消失（例如线索行跳进详情）。
        if (action === 'click' && step.remember) memo[step.remember] = (await el.textContent() || '').replace(/\s+/g, ' ').trim();
        if (action === 'fill') await el.fill(String(step.value == null ? '' : step.value));
        // force：跳过稳定性检查直接点，但仍受视口与可点区域约束——元素在视口外照样点不到。
        // 要测「过渡还在跑的时候点关闭」用 clickjs（在页面里直接派发），它才不等稳定、不看视口。
        else if (step.force) await el.click({ force: true });
        else await el.click();
      }
      // 目标站点有过渡动画（侧栏滑动、结果面板展开），量之前给动画留时间。
      await page.waitForTimeout(step.settle || 350);
    } catch (e) {
      const why = String((e && e.message) || e).split('\n')[0].slice(0, 160);
      const gate = step.envGate ? String(step.envGate) : '';
            return { ok: false, gate, note: `前置没跑成（${action} ${stepSelector || step.text}）：${why}`, memo };
    }
  }
  return { ok: true, note: '', memo };
}

(async () => {
  const dir = path.join(OUT, NAME);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const report = {
    url: URL_ARG, name: NAME, specName: spec.name || null, specSource: spec.source || null,
    startedAt: new Date().toISOString(), viewports: [],
    // tally 必须写进报告：下游（baseline.cjs）要读它做判定，不能只靠 console 打印。
    tally: { pass: 0, fail: 0, unknown: 0 },
  };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'zh-CN' });
    const page = await ctx.newPage();
    // 焦点落点是否在 aria-hidden 子树里，只能在 focus 发生的那一刻判断：
    // 常驻挂载的入口若「先 focus 再摘 aria-hidden」，事后再查已经看不到那个中间态了。
    await page.addInitScript(() => {
      window.__focusLog = [];
      document.addEventListener('focusin', (e) => {
        const t = e.target;
        if (!t || t.nodeType !== 1) return;
        let hidden = null;
        for (let n = t; n && n !== document.documentElement; n = n.parentElement) {
          if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') {
            hidden = n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(/\s+/)[0] : '');
            break;
          }
        }
        const sel = (el) => (el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\s+/)[0] : ''));
        window.__focusLog.push({ target: sel(t), hidden, ts: Math.round(performance.now()) });
        if (window.__focusLog.length > 60) window.__focusLog.shift();
      }, true);
    });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    const applicable = CHECKS.filter(c => c.at == null || !vp.width || Math.abs(c.at - vp.width) < 1);
    // page.evaluate 只能跑"读当前状态"的断言。焦点环要真按 Tab，reduced-motion 要
    // 模拟媒体特性——这两类在 Node 侧做，页面上下文做不了。
    const SPECIAL = new Set(['focusRing', 'focusBorder', 'focusNoColor', 'media', 'tabStaysWithin']);

    // 按 precondition 分组：不同前置状态必须各用一张干净页面，否则前一组点开的
    // 面板会串到下一组（比如筛选态漏进首屏断言）。
    const groups = new Map();
    applicable.forEach((c, i) => {
      const steps = Array.isArray(c.precondition) ? c.precondition : [];
      const key = steps.length ? JSON.stringify(steps) : '';
      if (!groups.has(key)) groups.set(key, { steps, idx: [] });
      groups.get(key).idx.push(i);
    });

    const results = new Array(applicable.length);
    const blank = (c, note) => ({ id: c.id || c.type + ':' + (c.selector || ''), type: c.type, desc: c.desc || '', pass: null, note, evidence: [] });
    let navError = null;

    for (const { steps, idx } of groups.values()) {
      if (!navError) {
        try {
          await page.goto(URL_ARG, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(1800);
        } catch (e) {
          navError = String(e.message || e).slice(0, 300);
        }
      }
      if (navError) {
        for (const i of idx) results[i] = blank(applicable[i], '页面打不开：' + navError);
        continue;
      }
      let pre = { ok: true, note: '', memo: {} };
      if (steps.length) {
        pre = await applyPrecondition(page, steps);
        if (!pre.ok) {
          // 前置失败必须显形：默认判红，不悄悄退化成「不适用」。
          // 唯一例外：失败的那一步显式声明了 envGate（能力名，如 amap）。
          // 那种失败是「这台机器没有这个运行时」，记不适用；其余失败照旧红。
          for (const i of idx) {
            const c = applicable[i];
            const gated = Boolean(pre.gate);
            results[i] = {
              id: c.id || c.type + ':' + (c.selector || ''),
              type: c.type,
              desc: c.desc || '',
              pass: gated ? null : false,
              note: gated ? ('运行时未就绪（envGate=' + pre.gate + '）：' + pre.note) : pre.note,
              evidence: [],
            };
          }
          continue;
        }
      }
      const group = idx.map(i => applicable[i]);
      // 焦点落位可能在动画结束后才发生（抽屉 200ms、返回键 60ms 级）。带 pollMs 的
      // focusOn 先在 Node 侧按 50ms 轮询到上限，再交给页面里做一次性判定——
      // 固定 sleep 会两头不准：短了偶发失败，长了整轮变慢。
      const pollers = group.filter(c => c.type === 'focusOn' && Number(c.pollMs) > 0);
      if (pollers.length) {
        // 上限 250ms：1 秒会把「焦点又变慢」的回归放过去，立刻读又会被一帧调度抖动打成假红。
        const budget = Math.min(250, Math.max(...pollers.map(c => Number(c.pollMs))));
        const deadline = Date.now() + budget;
        const wants = pollers.map(c => ({
          selector: String(c.selector),
          text: c.from ? (pre.memo && pre.memo[c.from] || '') : (c.text ? String(c.text) : ''),
          fromMissing: Boolean(c.from && !(pre.memo && pre.memo[c.from])),
        }));
        while (Date.now() < deadline) {
          const ready = await page.evaluate((list) => list.every((w) => {
            if (w.fromMissing) return false;
            const a = document.activeElement;
            if (!a || a.nodeType !== 1 || !a.matches(w.selector)) return false;
            if (!w.text) return true;
            const f = (x) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
            return f(a.textContent).includes(f(w.text));
          }), wants).catch(() => false);
          if (ready) break;
          await page.waitForTimeout(50);
        }
      }
      const simple = group
        .filter(c => !SPECIAL.has(c.type))
        // textEquals / focusOn 要把前置记下的文本带进页面里比对。
        .map(c => (c.type === 'textEquals' || c.type === 'focusOn'
          ? Object.assign({}, c, { memoValue: c.from && pre.memo ? pre.memo[c.from] : null })
          : c));
      const special = group.filter(c => SPECIAL.has(c.type));
      const got = [...await page.evaluate(runChecks, simple), ...await runSpecial(page, special)];
      got.forEach((r, j) => { results[idx[j]] = r; });
    }

    report.viewports.push({
      viewport: vp, loadMs: 0, navError, errs,
      checks: results,
    });
    await ctx.close();
  }

  // tally 先算再写：下游 baseline.cjs 直接读 report.tally 做判定，不依赖 console。
  const tally = { pass: 0, fail: 0, unknown: 0 };
  for (const v of report.viewports) for (const c of v.checks) {
    if (c.pass === true) tally.pass++;
    else if (c.pass === false) tally.fail++;
    else tally.unknown++;
  }
  report.tally = tally;
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'spec-report.json'), JSON.stringify(report, null, 2), 'utf8');

  // Markdown
  const L = [];
  L.push(`# 规范断言结果：${report.specName || NAME}`);
  L.push('');
  L.push(`- 站点：${URL_ARG}`);
  if (report.specSource) L.push(`- 规范来源：\`${report.specSource}\``);
  L.push(`- 断言数：${CHECKS.length}（按视口适用）`);
  L.push(`- 生成：${report.startedAt}`);
  L.push('');
  for (const v of report.viewports) {
    const pass = v.checks.filter(c => c.pass === true).length;
    const fail = v.checks.filter(c => c.pass === false).length;
    const unk = v.checks.filter(c => c.pass == null).length;
    L.push(`## ${v.viewport.width}×${v.viewport.height} — 通过 ${pass} / 失败 ${fail} / 无法判定 ${unk}`);
    L.push('');
    L.push('| 断言 | 结果 | 说明 |');
    L.push('|---|---|---|');
    for (const c of v.checks) {
      const mark = c.pass === true ? '✅' : c.pass === false ? '❌' : '➖';
      const ev = (c.evidence || []).filter(Boolean).join('；').replace(/\|/g, '/');
      L.push(`| ${c.desc || c.id} | ${mark} | ${(c.note || '') + (ev ? ' — ' + ev : '')} |`);
    }
    L.push('');
    if (v.navError) L.push('> 页面打不开：' + v.navError);
    if (v.errs.length) L.push('> 页面报错：' + v.errs.slice(0, 3).join(' / '));
    L.push('');
  }
  fs.writeFileSync(path.join(dir, 'spec-report.md'), L.join('\n'), 'utf8');

  console.log(JSON.stringify({ ok: tally.fail === 0, dir, tally, spec: report.specName }, null, 2));
  await browser.close();
  process.exit(tally.fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
