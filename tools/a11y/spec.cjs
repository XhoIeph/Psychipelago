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
 *   numberEquals  {selector, pattern, from|expectSelector|expectCountSelector}  // 两边各抽一个数再比；expectCountSelector 用「可见元素个数」当右边（查「N 家」与行数）
 *   sumEquals     {selector, pattern, sumSelector, sumPattern}  // 头部总数 = 若干可见行之和（空集合判不适用）
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

// 地图状态：CI 没有 key 时 workflow 传 --no-map，同时把 A11Y_MAP_STATE=absent 放进环境，
// 两者取或。absent 下地图域的断言不跑，直接记不适用并在 note 里写明来源——不靠 15s 超时兜。
const MAP_STATE = argv.includes('--no-map') || String(process.env.A11Y_MAP_STATE || '').toLowerCase() === 'absent'
  ? 'absent' : 'auto';
const MAP_DOMAIN_NOTE = '地图状态 absent（A11Y_MAP_STATE=absent）：该断言依赖地图运行时，记不适用';
const isMapDomain = (c) => Boolean(c.absentOk)
  || (Array.isArray(c.precondition) && c.precondition.some((st) => st && st.envGate));

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
async function runChecks(checks) {
  const out = [];
  // 取样前等动效收敛：transition/animation 跑完再读样式，避免读到中间帧（如按下态的混色）。
  // 有无限动效时最多等 1.2s 就继续，不把断言拖成超时。
  const settleAnimations = async () => {
    const until = performance.now() + 1200;
    for (;;) {
      const running = document.getAnimations().filter((a) => a.playState === 'running');
      if (!running.length || performance.now() > until) return;
      await Promise.race([
        Promise.all(running.map((a) => a.finished.catch(() => {}))),
        new Promise((r) => setTimeout(r, 120)),
      ]);
    }
  };
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

    if (c.type === 'pathname') {
      // 判「点下去真到了哪一页」：读 location.pathname，而不是读入口的 href 属性。
      // href 写对了但目标页不存在时，属性断言会绿——这条要的是真导航结果。
      const path = location.pathname;
      let ok = true;
      if (c.equals != null) {
        const hit = path === c.equals;
        ok = ok && hit;
        r.evidence.push((hit ? '✓' : '✓ 实际 ' ) + (hit ? '路径 ' + path + ' 等于 ' + c.equals : '路径 ' + path + ' 不等于 ' + c.equals));
      }
      if (c.endsWith != null) {
        const hit = path.endsWith(c.endsWith);
        ok = ok && hit;
        r.evidence.push(hit ? '✓ 路径 ' + path + ' 以 ' + c.endsWith + ' 结尾' : '✗ 路径 ' + path + ' 不以 ' + c.endsWith + ' 结尾');
      }
      if (c.expectSelector) {
        const el = document.querySelector(c.expectSelector);
        const hit = Boolean(el);
        ok = ok && hit;
        r.evidence.push(hit ? '✓ 落地页存在 ' + c.expectSelector : '✗ 落地页找不到 ' + c.expectSelector + '（可能进了 404）');
      }
      if (c.expectText && c.textSelector) {
        const el = document.querySelector(c.textSelector);
        const text = el ? el.textContent.replace(/\s+/g, '') : '';
        const hit = Boolean(el) && text.includes(String(c.expectText).replace(/\s+/g, ''));
        ok = ok && hit;
        r.evidence.push(hit ? '✓ ' + c.textSelector + ' 文案含「' + c.expectText + '」' : '✗ ' + c.textSelector + ' 文案不含「' + c.expectText + '」');
      }
      r.pass = ok;
      r.note = '到达页：' + path;
      out.push(r); continue;
    }
    if (c.type === 'computed') {
      if (!c.sampleNow) await settleAnimations();
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
      // 属性断言的价值在属性本身：html[data-theme]、aria-* 这类承载元素常常没有盒子，
      // 按可见性过滤会直接判失败。默认仍要求可见（挡住 display:none 的假绿），
      // 只对显式声明 allowHidden 的条目退到全部匹配。
      const allEls = [...document.querySelectorAll(c.selector)];
      const visibleEls = allEls.filter(e => {
        const rc = e.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      const els = visibleEls.length ? visibleEls : (c.allowHidden ? allEls : []);
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
      if (!els.length) {
        r.pass = c.skipIfMissing ? null : false;
        r.note = (c.skipIfMissing ? '本页没有该组件，断言不适用：' : '选择器没有可见元素：') + c.selector;
        out.push(r); continue;
      }
      if (!visibleEls.length) r.evidence.push('元素无盒子（allowHidden），属性仍可读');
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


    // 两个元素（或「前置记下的文本」与一个元素）各抽一个数再比。
    // 用来验「同一屏里两处说法必须一致」：列表说 1 条线索，详情不能说 4 条。
    // pattern 是正则串，取第 1 个捕获组；没有捕获组就取整个匹配。数字比较，不比字符串（「1 条」「1条」「1 条线索」都算 1）。
    if (c.type === 'numberEquals') {
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
      const vis = (el) => {
        const rc = el.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      };
      const pick = (sel, match) => {
        const list = [...document.querySelectorAll(String(sel))].filter(vis);
        if (!match) return list[0] || null;
        return list.find((e) => flat(e.textContent).includes(String(match))) || null;
      };
      const num = (text, pat) => {
        const raw = String(text == null ? '' : text);
        if (!pat) {
          const m = raw.match(/-?\d+(?:\.\d+)?/);
          return m ? Number(m[0]) : null;
        }
        const m = new RegExp(String(pat)).exec(raw);
        if (!m) return null;
        const v = m[1] != null ? m[1] : m[0];
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const left = pick(c.selector, c.match);
      if (!left) {
        r.pass = false;
        r.note = '选择器没有可见元素：' + c.selector;
        out.push(r);
        continue;
      }
      const leftText = flat(left.textContent);
      const rightCount = c.expectCountSelector
        ? [...document.querySelectorAll(String(c.expectCountSelector))].filter(vis).length
        : null;
      const rightEl = c.expectSelector ? pick(c.expectSelector, c.expectMatch) : null;
      const rightText = rightCount != null ? String(rightCount) : rightEl ? flat(rightEl.textContent) : flat(c.memoValue);
      if (rightCount == null && !rightEl && !rightText) {
        r.pass = false;
        r.note = c.expectSelector
          ? '对照元素没有可见元素：' + c.expectSelector
          : '前置没有记下「' + c.from + '」：检查 remember 是否写在那一步 click 上';
        out.push(r);
        continue;
      }
      const lv = num(leftText, c.pattern);
      const rv = rightCount != null ? rightCount : num(rightText, c.expectPattern || c.pattern);
      r.pass = lv != null && rv != null && lv === rv;
      r.note = r.pass
        ? '两边都是 ' + lv + '（「' + leftText.slice(0, 40) + '」对「' + rightText.slice(0, 40) + '」）'
        : '左边「' + leftText.slice(0, 60) + '」→ ' + lv + '，右边「' + rightText.slice(0, 60) + '」→ ' + rv;
      out.push(r);
      continue;
    }

    // 一整块里的多处数字之和，必须等于这一块头部写着的总数。
    // 用来拦「头部说 30 条线索、下面几行加起来只有 25」这种同屏打架。
    // 只对当前可见的行取数：隐藏副本（另一档布局里留着的同样几行）不算。
    // 没有可见行时记「不适用」，避免 0 = 0 的假绿。
    if (c.type === 'sumEquals') {
      const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
      const vis = (el) => {
        const rc = el.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      };
      const num = (text, pat) => {
        const raw = String(text == null ? '' : text);
        if (!pat) {
          const m = raw.match(/-?\d+(?:\.\d+)?/);
          return m ? Number(m[0]) : null;
        }
        const m = new RegExp(String(pat)).exec(raw);
        if (!m) return null;
        const v = m[1] != null ? m[1] : m[0];
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const head = [...document.querySelectorAll(String(c.selector))].filter(vis)[0] || null;
      if (!head) {
        r.pass = false;
        r.note = '选择器没有可见元素：' + c.selector;
        out.push(r);
        continue;
      }
      const rows = [...document.querySelectorAll(String(c.sumSelector))].filter(vis);
      if (rows.length < (c.minRows == null ? 1 : c.minRows)) {
        r.pass = null;
        r.note = '没有可求和的可见行（' + rows.length + ' 行），断言不适用：' + c.sumSelector;
        out.push(r);
        continue;
      }
      const total = num(flat(head.textContent), c.pattern);
      let sum = 0;
      let unparsed = 0;
      const detail = [];
      for (const el of rows) {
        const v = num(flat(el.textContent), c.sumPattern || c.pattern);
        if (v == null) { unparsed += 1; detail.push('?'); continue; }
        sum += v;
        detail.push(String(v));
      }
      r.pass = total != null && unparsed === 0 && total === sum;
      r.note = r.pass
        ? '头部 ' + total + ' = ' + rows.length + ' 行之和 ' + sum
        : '头部「' + flat(head.textContent).slice(0, 50) + '」→ ' + total
          + '，' + rows.length + ' 行之和 ' + sum + '（' + detail.join(' + ') + '）'
          + (unparsed ? '，其中 ' + unparsed + ' 行没抽出数字' : '');
      if (!r.pass) r.evidence.push('求和行：' + rows.length + ' 可见');
      out.push(r);
      continue;
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
    if (c.type === 'scrollFit') {
      // 容器内不得横向溢出：scrollWidth 必须等于 clientWidth（差 1px 内算取整误差）。
      const el = [...document.querySelectorAll(c.selector)].find(e => {
        const rc = e.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      if (!el) {
        r.pass = c.skipIfMissing ? null : false;
        r.note = (c.skipIfMissing ? '本页没有该组件，断言不适用：' : '选择器没有可见元素：') + c.selector;
        out.push(r); continue;
      }
      const over = el.scrollWidth - el.clientWidth;
      r.pass = over <= 1;
      r.note = `${c.selector} 横向溢出 ${over}px（scrollWidth ${el.scrollWidth} / clientWidth ${el.clientWidth}）`;
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

// 省面高亮采集：挂 AMap.Polygon.setOptions，按下开/关各收一轮，最后还原原型。
// 只记录 fillColor / fillOpacity —— 这两个值就是「命中省画成什么、未命中省压到多淡」。
async function collectPolygonPaint(page, chipSel) {
  return page.evaluate(async (chipSel) => {
    const chip0 = document.querySelector(chipSel);
    if (!chip0) return { missing: true };
    if (!window.AMap || !window.AMap.Polygon || !window.AMap.Polygon.prototype.setOptions) {
      return { noAmap: true };
    }
    const proto = window.AMap.Polygon.prototype;
    const orig = proto.setOptions;
    const tap = [];
    proto.setOptions = function (opts) {
      if (opts && (opts.fillColor || opts.fillOpacity != null)) {
        tap.push({
          fillColor: opts.fillColor ? String(opts.fillColor).toLowerCase() : null,
          fillOpacity: opts.fillOpacity == null ? null : Number(opts.fillOpacity),
        });
      }
      return orig.apply(this, arguments);
    };
    const headerText = () => (document.querySelector('.tc-sidebar') ? document.querySelector('.tc-sidebar').textContent : '').replace(/\s+/g, ' ').trim();
    // 等这一轮上色停下来：tap 连续 240ms 不增长即认为画完（有上限，避免过渡卡住把整轮拖死）。
    const settle = async (limitMs) => {
      const t0 = Date.now();
      let last = -1;
      while (Date.now() - t0 < limitMs) {
        await new Promise((r) => setTimeout(r, 120));
        if (tap.length === last && tap.length > 0) return true;
        last = tap.length;
      }
      return false;
    };
    const press = async (want) => {
      const chip = document.querySelector(chipSel);
      const isOn = chip.getAttribute('aria-pressed') === 'true';
      if (isOn !== want) chip.click();
      tap.length = 0;
      const settled = await settle(4000);
      await new Promise((r) => setTimeout(r, 200));
      return {
        pressed: document.querySelector(chipSel).getAttribute('aria-pressed'),
        settled,
        calls: tap.slice(),
        header: headerText(),
      };
    };
    const on = await press(true);
    const off = await press(false);
    proto.setOptions = orig;
    return { on, off };
  }, chipSel);
}

async function runSpecial(page, checks) {
  const out = [];
  for (const c of checks) {
    const r = { id: c.id || c.type, type: c.type, desc: c.desc || '', pass: null, note: '', evidence: [] };
    try {
      // 省面高亮：phase=paint 判「勾选后命中省画成品牌绿/.26、其余压到 ≤.05」，
      // phase=clear 判「取消勾选后回到按密度着色（≥.5、多种颜色）、不留命中色」。
      // 命中色可用 c.hitFill 覆盖；默认值跟 --tc-accent 浅色档一致，换主色只改主题令牌与这里。
      if (c.type === 'polygonPaint') {
        const chipSel = String(c.selector || 'button.tc-disorder-chip[data-disorder="cptsd"]');
        const hitFill = String(c.hitFill || '#3b634b').toLowerCase();
        const data = await collectPolygonPaint(page, chipSel);
        if (data.missing) { r.pass = null; r.note = '本页没有病症开关，断言不适用：' + chipSel; out.push(r); continue; }
        if (data.noAmap) { r.pass = null; r.note = '地图运行时未就绪（window.AMap 缺失），断言不适用'; out.push(r); continue; }
        const phase = c.phase === 'clear' ? 'clear' : 'paint';
        const snap = phase === 'clear' ? data.off : data.on;
        const wantPressed = phase === 'clear' ? 'false' : 'true';
        const calls = snap.calls || [];
        const ok = [];
        const bad = [];
        const near = (a, b) => a != null && Math.abs(a - b) <= 0.005;
        if (phase === 'paint') {
          const hit = calls.filter((t) => String(t.fillColor).toLowerCase() === hitFill && near(t.fillOpacity, 0.26));
          const rest = calls.filter((t) => !(String(t.fillColor).toLowerCase() === hitFill && near(t.fillOpacity, 0.26)));
          const bleed = rest.filter((t) => t.fillOpacity == null || t.fillOpacity > 0.05);
          const hitMin = Number(c.hitMin || 100);
          const missMin = Number(c.missMin || 100);
          (hit.length >= hitMin ? ok : bad).push(`命中省上色 ${hit.length} 次（需 ≥${hitMin}，fillColor ${hitFill} / .26）`);
          (rest.length >= missMin ? ok : bad).push(`未命中省上色 ${rest.length} 次（需 ≥${missMin}）`);
          (bleed.length === 0 ? ok : bad).push(`未命中省透明度全部 ≤.05（越界 ${bleed.length} 次）`);
          for (const t of (c.headerIncludes || [])) {
            (snap.header.includes(String(t)) ? ok : bad).push(`头部含「${t}」`);
          }
        } else {
          const painted = calls.filter((t) => t.fillOpacity != null && t.fillOpacity >= 0.5);
          const zero = calls.filter((t) => t.fillOpacity != null && t.fillOpacity <= 0.05);
          const zeroAllowed = zero.filter((t) => t.fillColor === '#ffffff').length;
          const paintedMin = Number(c.paintedMin || 100);
          const colors = new Set(painted.map((t) => t.fillColor));
          const stillHit = calls.filter((t) => String(t.fillColor).toLowerCase() === hitFill && near(t.fillOpacity, 0.26));
          (painted.length >= paintedMin ? ok : bad).push(`恢复密度着色 ${painted.length} 次（需 ≥${paintedMin}，透明度 ≥.5）`);
          (colors.size >= Number(c.distinctColorsMin || 3) ? ok : bad).push(`密度色阶 ${colors.size} 种（需 ≥${Number(c.distinctColorsMin || 3)}）`);
          (zero.length === zeroAllowed ? ok : bad).push(`近零透明仅留给 0 报告省（白底 ${zeroAllowed} 次，其余 ${zero.length - zeroAllowed} 次）`);
          (stillHit.length === 0 ? ok : bad).push(`不再有 ${hitFill}/.26 残留（${stillHit.length} 次）`);
        }
        (snap.pressed === wantPressed ? ok : bad).push(`aria-pressed=${snap.pressed}（需 ${wantPressed}）`);
        (snap.settled ? ok : bad).push('上色在 4s 内收敛');
        r.evidence = [...ok.map((x) => '✓ ' + x), ...bad.map((x) => '❌ ' + x)];
        r.pass = bad.length === 0;
        r.note = `${phase}：采集 ${calls.length} 次 setOptions`;
        out.push(r);
        continue;
      }
      // 标题不该画焦点环：Chrome 里脚本 focus 不匹配 :focus-visible，直接读 computed 天然是 none，
      // 会假绿。这里用 CDP 强制 ['focus','focus-visible'] 再读——未修复时 style=solid/2px。
      // 同时给对照组（真实控件）强制同一组伪类，期望 solid + 2px 墨色：没有它，选择器写错也会绿。
      if (c.type === 'focusRingCdp') {
        const forced = ['focus', 'focus-visible'];
        let cdp = null;
        const readForced = async (selector) => {
          const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
          if (!nodeId) return { missing: true, selector };
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: forced });
          const val = await page.evaluate((sel) => {
            const els = [...document.querySelectorAll(sel)].filter((e) => {
              const rc = e.getBoundingClientRect();
              return rc.width > 0 && rc.height > 0;
            });
            const el = els[0];
            if (!el) return null;
            const cs = getComputedStyle(el);
            return { text: (el.textContent || '').trim().slice(0, 16), style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
          }, selector);
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
          return val ? Object.assign({ selector }, val) : { hidden: true, selector };
        };
        try {
          cdp = await page.context().newCDPSession(page);
          await cdp.send('DOM.enable');
          await cdp.send('CSS.enable');
          const target = await readForced(String(c.selector));
          const control = c.controlSelector ? await readForced(String(c.controlSelector)) : null;
          const ok = [];
          const bad = [];
          if (target.missing || target.hidden) {
            bad.push('找不到可见的标题元素：' + c.selector);
          } else if (target.style === 'none') {
            ok.push('标题 outline-style=none（宽度 ' + target.width + ' 是 UA 默认值，style=none 不画）');
          } else {
            bad.push('标题仍有描边：outline-style=' + target.style + '、' + target.width + '、' + target.color);
          }
          if (control) {
            const wantW = String(c.controlWidth || '2px');
            const wantC = c.controlColor || 'rgb(25, 59, 56)';
            if (control.missing || control.hidden) {
              bad.push('对照组找不到可见元素：' + c.controlSelector);
            } else if (control.style === 'solid' && control.width === wantW && (!c.controlColor || control.color === wantC)) {
              ok.push('对照组 ' + c.controlSelector + ' outline=solid ' + control.width + ' ' + control.color);
            } else {
              bad.push('对照组未画出预期焦点环：' + control.style + ' / ' + control.width + ' / ' + control.color + '（需 solid / ' + wantW + ' / ' + wantC + '）');
            }
          }
          r.evidence = [...ok.map((x) => '✓ ' + x), ...bad.map((x) => '❌ ' + x)];
          r.pass = bad.length === 0 && ok.length > 0;
          r.note = 'CDP 强制 :focus/:focus-visible 后读 computed';
        } catch (e) {
          r.pass = null;
          r.note = 'CDP 强制伪类不可用：' + String((e && e.message) || e).slice(0, 120);
        } finally {
          if (cdp) { try { await cdp.detach(); } catch (e) {} }
        }
        out.push(r);
        continue;
      }
      // 地图可拖：拖动前后读容器上的 AMap 实例取中心，判纬度/经度「明显变化」。角度按视口定，
      // 只要求超过下限（实测 390 竖拖 200px，纬度 37.8 → 17.5），不写死具体值。
      if (c.type === 'mapPan') {
        const sel = String(c.selector || '.amap-container')
        const read = () => page.evaluate((s) => {
          const el = document.querySelector(s)
          const map = el && (el.amap || el.__amap || el._amap)
          if (!map || typeof map.getCenter !== 'function') return null
          const p = map.getCenter()
          return { lat: p.getLat(), lng: p.getLng(), zoom: map.getZoom() }
        }, sel)
        const before = await read()
        if (!before) { r.pass = null; r.note = '地图运行时未就绪（容器上取不到 AMap 实例），断言不适用'; out.push(r); continue }
        const box = await page.locator(sel).first().boundingBox().catch(() => null)
        if (!box) { r.pass = false; r.note = '地图容器没有盒子：' + sel; out.push(r); continue }
        const dx = Number(c.dx || 0)
        const dy = Number(c.dy || 0)
        const fx = c.from && c.from.x != null ? c.from.x : 0.5
        const fy = c.from && c.from.y != null ? c.from.y : 0.3
        const sx = box.x + box.width * fx
        const sy = box.y + box.height * fy
        const n = Math.max(4, Number(c.steps || 16))
        await page.mouse.move(sx, sy)
        await page.mouse.down()
        for (let i = 1; i <= n; i += 1) {
          await page.mouse.move(sx + (dx * i) / n, sy + (dy * i) / n)
          await page.waitForTimeout(16)
        }
        await page.mouse.up()
        await page.waitForTimeout(Number(c.settle || 900))
        const after = await read()
        if (!after) { r.pass = false; r.note = '拖动后再读不到地图实例'; out.push(r); continue }
        const dLat = Math.abs(after.lat - before.lat)
        const dLng = Math.abs(after.lng - before.lng)
        const minLat = Number(c.minLat || 0)
        const minLng = Number(c.minLng || 0)
        const ok = []
        const bad = []
        if (minLat) (dLat >= minLat ? ok : bad).push(`纬度变化 ${dLat.toFixed(2)}°（需 ≥${minLat}°）`)
        if (minLng) (dLng >= minLng ? ok : bad).push(`经度变化 ${dLng.toFixed(2)}°（需 ≥${minLng}°）`)
        r.pass = bad.length === 0 && ok.length > 0
        r.evidence = [
          ...ok.map((x) => '✓ ' + x),
          ...bad.map((x) => '❌ ' + x),
          `中心 ${before.lat.toFixed(2)},${before.lng.toFixed(2)} → ${after.lat.toFixed(2)},${after.lng.toFixed(2)}`,
          `zoom ${before.zoom}`,
        ]
        r.note = `拖动 ${dx},${dy}px`
        out.push(r)
        continue
      }
      // 卡名是否真的走省略号：注入一段长名字，量完立刻还原（同一 tick 内），不污染后续断言。
      // 判 scrollWidth 与 clientWidth 的关系 + text-overflow + 行数；可附带判标签右缘与卡片内容右缘、卡高。
      // 注入是为了不依赖「数据里恰好有超长姓名」，否则数据一改这条就悄悄失真。
      if (c.type === 'textFits') {
        const payload = {
          q: String(c.selector),
          mt: c.matchText ? String(c.matchText) : '',
          expect: c.expect === 'fit' ? 'fit' : 'clip',
          to: c.textOverflow ? String(c.textOverflow) : 'ellipsis',
          maxLines: c.maxLines == null ? 1 : Number(c.maxLines),
          inject: c.injectText ? String(c.injectText) : '',
          sib: c.siblingSelector ? String(c.siblingSelector) : '',
          tagMax: c.tagRightMax ? Number(c.tagRightMax) : 0.5,
          hMin: c.cardHeight ? Number(c.cardHeight.min) : null,
          hMax: c.cardHeight ? Number(c.cardHeight.max) : null,
        }
        const probe = ({ q, mt, expect, to, maxLines, inject, sib, tagMax, hMin, hMax }) => {
          const visible = Array.from(document.querySelectorAll(q)).filter((el) => {
            const b = el.getBoundingClientRect()
            const cs = getComputedStyle(el)
            return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'
          })
          const el = mt ? visible.find((x) => (x.textContent || '').includes(mt)) : visible[0]
          if (!el) return { missing: true, count: visible.length }
          const original = el.textContent
          if (inject) el.textContent = inject
          try {
            const cs = getComputedStyle(el)
            const box = el.getBoundingClientRect()
            const lh = parseFloat(cs.lineHeight)
            const card = el.closest('.tc-doctor-card')
            const cardCs = card ? getComputedStyle(card) : null
            const cardBox = card ? card.getBoundingClientRect() : null
            const tag = card && sib ? card.querySelector(sib) : null
            return {
              sw: el.scrollWidth,
              cw: el.clientWidth,
              overflow: el.scrollWidth > el.clientWidth,
              textOverflow: cs.textOverflow,
              lines: lh > 0 ? Math.round(box.height / lh) : null,
              height: Math.round(box.height * 10) / 10,
              lineHeight: cs.lineHeight,
              text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
              tagRight: tag ? Math.round(tag.getBoundingClientRect().right * 10) / 10 : null,
              contentRight: cardBox && cardCs ? Math.round((cardBox.right - parseFloat(cardCs.paddingRight || '0')) * 10) / 10 : null,
              cardH: cardBox ? Math.round(cardBox.height * 10) / 10 : null,
            }
          } finally {
            if (inject) el.textContent = original
          }
        }
        let snap = null
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            snap = await page.evaluate(probe, payload)
          } catch (e) {
            snap = null
          }
          if (snap && !snap.missing) break
          await page.waitForTimeout(400)
        }
        if (!snap) {
          r.pass = false
          r.note = '读取失败：' + payload.q
          out.push(r)
          continue
        }
        if (snap.missing) {
          r.pass = false
          r.note = '没有可见元素：' + payload.q + (payload.mt ? '（含「' + payload.mt + '」）' : '')
          out.push(r)
          continue
        }
        const ok = []
        const bad = []
        const wantOverflow = payload.expect === 'clip'
        if (snap.overflow === wantOverflow) ok.push('scrollWidth ' + snap.sw + (snap.overflow ? ' > ' : ' = ') + 'clientWidth ' + snap.cw)
        else bad.push('scrollWidth ' + snap.sw + (snap.overflow ? ' > ' : ' = ') + 'clientWidth ' + snap.cw + '（期望' + (wantOverflow ? '裁切' : '装得下') + '）')
        if (snap.textOverflow === payload.to) ok.push('text-overflow ' + snap.textOverflow)
        else bad.push('text-overflow ' + snap.textOverflow + '（期望 ' + payload.to + '）')
        if (payload.maxLines) {
          if (snap.lines != null && snap.lines <= payload.maxLines) ok.push('行数 ' + snap.lines + '（高 ' + snap.height + ' / 行高 ' + snap.lineHeight + '）')
          else bad.push('行数 ' + snap.lines + '（高 ' + snap.height + ' / 行高 ' + snap.lineHeight + '，上限 ' + payload.maxLines + '）')
        }
        if (snap.tagRight != null && snap.contentRight != null) {
          if (snap.tagRight <= snap.contentRight + payload.tagMax) ok.push('标签右缘 ' + snap.tagRight + ' ≤ 内容右缘 ' + snap.contentRight)
          else bad.push('标签右缘 ' + snap.tagRight + ' > 内容右缘 ' + snap.contentRight)
        }
        if (payload.hMin != null && payload.hMax != null && snap.cardH != null) {
          if (snap.cardH >= payload.hMin && snap.cardH <= payload.hMax) ok.push('卡高 ' + snap.cardH)
          else bad.push('卡高 ' + snap.cardH + '（期望 ' + payload.hMin + '–' + payload.hMax + '）')
        }
        r.pass = bad.length === 0
        r.evidence = ['「' + snap.text + '」', ...ok.map((x) => '✓ ' + x), ...bad.map((x) => '❌ ' + x)]
        r.note = r.pass ? (wantOverflow ? '裁切' : '装得下') + '：' + snap.sw + '/' + snap.cw : '未达预期：' + bad.join('；')
        out.push(r)
        continue
      }

      // 排版一致：两处元素的读取与逐项比较都放在一次 page.evaluate 里完成。
      // 一次往返避免两次读之间发生导航把执行上下文打掉；页面侧比较也避开 Node 侧的临时变量。
      if (c.type === 'styleMatch') {
        const payload = {
          qa: String(c.selector),
          qb: String(c.against || '.tc-quote'),
          st: Array.isArray(c.styles) ? c.styles : ['fontSize', 'lineHeight', 'color', 'whiteSpace'],
          rt: Array.isArray(c.rect) ? c.rect : ['left', 'width'],
          tol: Number(c.tolerance == null ? 1 : c.tolerance),
        }
        const comparator = ({ qa, qb, st, rt, tol }) => {
          const grab = (q) => {
            const visible = Array.from(document.querySelectorAll(q)).filter((el) => {
              const box = el.getBoundingClientRect()
              const cs = getComputedStyle(el)
              return box.width > 0 && box.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'
            })
            const el = visible[0]
            if (!el) return null
            const cs = getComputedStyle(el)
            const box = el.getBoundingClientRect()
            return { el, cs, box, count: visible.length }
          }
          const A = grab(qa)
          const B = grab(qb)
          if (!A) return { missing: 'a' }
          if (!B) return { missing: 'b' }
          const ok = []
          const bad = []
          st.forEach((k) => {
            const av = A.cs[k]
            const bv = B.cs[k]
            ;(av === bv ? ok : bad).push(k + ' ' + av + '（对照 ' + bv + '）')
          })
          rt.forEach((k) => {
            const av = Math.round(A.box[k] * 100) / 100
            const bv = Math.round(B.box[k] * 100) / 100
            const diff = Math.round(Math.abs(av - bv) * 100) / 100
            ;(diff <= tol ? ok : bad).push(k + ' ' + av + 'px（对照 ' + bv + 'px，差 ' + diff + '）')
          })
          return { ok, bad, aCount: A.count, bCount: B.count }
        }
        let snap = null
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            snap = await page.evaluate(comparator, payload)
          } catch (e) {
            snap = null
          }
          if (snap && !snap.missing) break
          await page.waitForTimeout(500)
        }
        if (!snap) {
          r.pass = false
          r.note = '读取失败（页面可能仍在导航）：' + payload.qa
          out.push(r)
          continue
        }
        if (snap.missing === 'a') {
          r.pass = false
          r.note = '没有可见元素：' + payload.qa
          out.push(r)
          continue
        }
        if (snap.missing === 'b') {
          r.pass = false
          r.note = '对照元素没有可见元素：' + payload.qb
          out.push(r)
          continue
        }
        r.pass = snap.bad.length === 0
        r.evidence = [...snap.ok.map((x) => '✓ ' + x), ...snap.bad.map((x) => '❌ ' + x)]
        r.note = '对照 ' + payload.qb + '（各 ' + snap.aCount + '/' + snap.bCount + ' 个可见匹配）'
        out.push(r)
        continue
      }
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
      // Tab 顺序：从页面顶部连按 Tab，first 必须在 second 之前到达。
      // 不写成「一直按到出现为止」——那把顺序改坏了也照样绿。
      if (c.type === 'tabOrder') {
        const first = String(c.first);
        const second = String(c.second);
        const presses = Number(c.presses || 60);
        let idxFirst = -1;
        let idxSecond = -1;
        const seen = [];
        await page.evaluate(() => {
          const a = document.activeElement;
          if (a && a.blur) a.blur();
        }).catch(() => {});
        for (let i = 1; i <= presses && (idxFirst < 0 || idxSecond < 0); i += 1) {
          await page.keyboard.press('Tab');
          const hit = await page.evaluate(({ f, g }) => {
            const a = document.activeElement;
            if (!a || a === document.body) return null;
            const name = a.tagName.toLowerCase() + (typeof a.className === 'string' && a.className ? '.' + a.className.split(/\s+/)[0] : '');
            return { isFirst: a.matches(f), isSecond: a.matches(g), name };
          }, { f: first, g: second }).catch(() => null);
          if (!hit) continue;
          seen.push(hit.name);
          if (hit.isFirst && idxFirst < 0) idxFirst = i;
          if (hit.isSecond && idxSecond < 0) idxSecond = i;
        }
        r.pass = idxFirst > 0 && idxSecond > 0 && idxFirst < idxSecond;
        r.note = idxFirst < 0
          ? `按 Tab ${presses} 次没有到达 ${first}`
          : idxSecond < 0
            ? `按 Tab ${presses} 次没有到达 ${second}（${first} 在第 ${idxFirst} 次）`
            : idxFirst < idxSecond
              ? `${first} 在第 ${idxFirst} 次 Tab 到达，早于 ${second}（第 ${idxSecond} 次）`
              : `${first} 在第 ${idxFirst} 次才到，晚于 ${second}（第 ${idxSecond} 次）`;
        r.evidence = seen.slice(0, 12);
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

// 断言的「前置状态」：写在断言文件的 precondition 里，只允许这里的几种动作。
// 直接操作页面（不是参数化的全局开关），这样同一份文件就能说清「这条要在什么状态下量」。
const PRECONDITION_ACTIONS = new Set(['fill', 'click', 'clickjs', 'clickat', 'wait', 'select', 'key', 'press', 'focus', 'expectfocus', 'reload', 'assertrect', 'drag']);

async function applyPrecondition(page, steps) {
  const memo = {};
  for (const step of steps) {
    const action = String((step && step.action) || '').toLowerCase();
    if (!PRECONDITION_ACTIONS.has(action)) {
      return { ok: false, note: `前置动作不认识：${action || '(空)'}，只支持 fill / click / clickjs / clickat / wait / select / key（或 press）/ focus / expectFocus / reload / assertRect / drag`, memo };
    }
    // key / press 没有选择器：直接往当前焦点元素敲键（Escape 关抽屉、Tab 走位这类）。
    // press 是 key 的别名，两个名字都收：断言作者按日常说法写的也能跑。
    if (action === 'key' || action === 'press') {
      if (!step.value) return { ok: false, note: `前置动作 ${action} 缺 value（例如 "Escape"）`, memo };
      await page.keyboard.press(String(step.value));
      if (step.afterMs) await page.waitForTimeout(Number(step.afterMs));
      continue;
    }
    // clickat：按坐标点一下。高德只认真实指针序列，el.click() 派发的合成 click 它不接，
    // 地图手势（点空白收档、拖动）只能靠这条前置。坐标有两种给法：
    //   { x, y }                  绝对坐标，写死取景
    //   { selector, dx, dy }      从元素 rect 推，换视口/换取景不用改数（推荐）
    // expect 给一个选择器时，先校验这一点上确实是它：落在图钉、底卡或按钮上的「空白点」
    // 是坐标漂移不是断言失败，要当场报出来，别默默点下去还给出结论。
    if (action === 'clickat') {
      let px, py;
      if (step.selector) {
        const box = await page.locator(step.selector).first().boundingBox();
        if (!box) return { ok: false, note: `clickat 目标没有布局盒：${step.selector}`, memo };
        px = Math.round(box.x + Number(step.dx || 0));
        py = Math.round(box.y + Number(step.dy || 0));
      } else {
        if (typeof step.x !== 'number' || typeof step.y !== 'number') {
          return { ok: false, note: 'clickat 需要 x/y，或 selector + dx/dy', memo };
        }
        px = Math.round(step.x);
        py = Math.round(step.y);
      }
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const chain = [];
        let n = el;
        while (n && n.nodeType === 1 && chain.length < 6) {
          chain.push('.' + String(n.className || n.tagName).split(/\s+/).filter(Boolean).join('.'));
          n = n.parentElement;
        }
        return chain.join(' < ');
      }, [px, py]).catch(() => null);
      if (step.expect) {
        const matches = await page.evaluate(([x, y, q]) => {
          const el = document.elementFromPoint(x, y);
          return Boolean(el && (el.matches(q) || el.closest(q)));
        }, [px, py, step.expect]).catch(() => false);
        if (!matches) {
          return { ok: false, note: `clickat(${px},${py}) 命中的不是 ${step.expect}：${hit || '(空)'}`, memo };
        }
      }
      await page.mouse.click(px, py);
      // 点完要等：底卡收档是 340ms 的 height 过渡，立刻量会量到动画中间值（736 未收）。
      await page.waitForTimeout(Number(step.afterMs || step.settle || 350));
      continue;
    }
    if (action === 'assertrect') {
      // 链中几何断言：某一步做完立刻量一次。失败即前置失败，note 带实测值，
      // 这样「抬档没生效、后来被别的路径凑到目标高度」不会算绿。
      // stepSelector 在后面才声明，这里按同一条口径自己算一次（窄屏才用 mobileSelector）。
      const rectWidth = page.viewportSize()?.width ?? 0
      const rectSel = rectWidth > 0 && rectWidth < 1000 && step.mobileSelector ? step.mobileSelector : step.selector
      const got = await page.evaluate((s) => {
        const els = [...document.querySelectorAll(s)].filter((e) => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        })
        return els.length ? els[0].getBoundingClientRect().height : null
      }, rectSel).catch(() => null)
      if (got == null) return { ok: false, note: `assertRect 找不到可见元素：${rectSel}`, memo }
      const lo = step.min && step.min.h
      const hi = step.max && step.max.h
      const label = step.label || rectSel
      ;(memo.__rects || (memo.__rects = [])).push(`${label} ${got.toFixed(1)}px`)
      if ((lo != null && got + 0.5 < lo) || (hi != null && got - 0.5 > hi)) {
        const range = `${lo == null ? '−∞' : lo}–${hi == null ? '+∞' : hi}`
        return { ok: false, note: `${label}：高度 ${got.toFixed(1)} 不在 ${range}`, memo }
      }
      continue
    }
    if (action === 'drag') {
      // 地图与底卡都靠指针事件拖动：先按住元素上一点，再分步移动，最后抬起。
      const sel = step.selector || '.amap-container'
      const el = page.locator(sel).first()
      const box = await el.boundingBox().catch(() => null)
      if (!box) return { ok: false, note: `drag 找不到可见元素：${sel}`, memo }
      const fx = step.from && step.from.x != null ? step.from.x : 0.5
      const fy = step.from && step.from.y != null ? step.from.y : 0.5
      const sx = box.x + box.width * fx
      const sy = box.y + box.height * fy
      const dx = Number(step.dx || 0)
      const dy = Number(step.dy || 0)
      const n = Math.max(4, Number(step.steps || 14))
      await page.mouse.move(sx, sy)
      await page.mouse.down()
      for (let i = 1; i <= n; i += 1) {
        await page.mouse.move(sx + (dx * i) / n, sy + (dy * i) / n)
        await page.waitForTimeout(Number(step.stepMs || 16))
      }
      await page.mouse.up()
      await page.waitForTimeout(Number(step.afterMs || 800))
      continue
    }
    if (action === 'reload') {
      // 刷新后 localStorage 仍在同一个浏览器上下文里，才验得出「记得住」。
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(Number(step.afterMs || step.settle || 2000));
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
        // 点了以后同样要给导航/过渡留时间：少这一段时，紧接着读 location.pathname 会读到旧 URL。
        await page.waitForTimeout(step.settle || 350);
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
    startedAt: new Date().toISOString(), viewports: [], mapState: MAP_STATE,
    // tally 必须写进报告：下游（baseline.cjs）要读它做判定，不能只靠 console 打印。
    tally: { pass: 0, fail: 0, unknown: 0 },
  };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'zh-CN' });
    const page = await ctx.newPage();
    if (MAP_STATE === 'absent') {
      // 本地跑 --no-map 时把高德运行时真正拦掉：CI 上没 key 时 SDK 请求根本不会发，
      // 只靠表里门控跳过会留下「地图还在、marker 还在」的假象，数字对不上 CI。
      await page.route(/amap\.com|_AMapService/, (r) => r.abort());
    }
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
    const SPECIAL = new Set(['focusRing', 'focusBorder', 'focusNoColor', 'media', 'tabStaysWithin', 'tabOrder', 'polygonPaint', 'mapPan', 'styleMatch', 'textFits', 'focusRingCdp']);

    // 按 precondition 分组：不同前置状态必须各用一张干净页面，否则前一组点开的
    // 面板会串到下一组（比如筛选态漏进首屏断言）。
    const groups = new Map();
    const skippedByMap = [];
    applicable.forEach((c, i) => {
      if (MAP_STATE === 'absent' && isMapDomain(c)) { skippedByMap.push(i); return; }
      const steps = Array.isArray(c.precondition) ? c.precondition : [];
      const key = steps.length ? JSON.stringify(steps) : '';
      if (!groups.has(key)) groups.set(key, { steps, idx: [] });
      groups.get(key).idx.push(i);
    });

    const results = new Array(applicable.length);
    const blank = (c, note) => ({ id: c.id || c.type + ':' + (c.selector || ''), type: c.type, desc: c.desc || '', pass: null, note, evidence: [] });
    for (const i of skippedByMap) results[i] = blank(applicable[i], MAP_DOMAIN_NOTE);
    let navError = null;

    for (const { steps, idx } of groups.values()) {
      if (!navError) {
        try {
          await page.goto(URL_ARG, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(1800);
          // 持久化类断言（前置里有 reload）必须从干净存储起跑：同一 context 里上一组
          // 切过的主题/拖过的宽度会留到下一组，起始态不对就会把「记得住」判成假红。
          if (steps.some((st) => st && st.action === 'reload')) {
            await page.evaluate(() => { try { localStorage.clear(); } catch {} });
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(2000);
          }
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
      // 同一断言在桌面与手机可能指向不同元素（都可见，但不是一个）。窄屏且显式写了
      // mobileSelector 就用它，不写仍用 selector——与前置动作的取法保持一致。
      const vpWidth = page.viewportSize()?.width ?? 0;
      const forViewport = (c) => (vpWidth > 0 && vpWidth < 1000 && c.mobileSelector
        ? Object.assign({}, c, { selector: c.mobileSelector })
        : c);
      const simple = group
        .filter(c => !SPECIAL.has(c.type))
        .map(forViewport)
        // textEquals / focusOn 要把前置记下的文本带进页面里比对。
        .map(c => (c.type === 'textEquals' || c.type === 'focusOn' || c.type === 'numberEquals'
          ? Object.assign({}, c, { memoValue: c.from && pre.memo ? pre.memo[c.from] : null })
          : c));
      const special = group.filter(c => SPECIAL.has(c.type)).map(forViewport);
      const got = [...await page.evaluate(runChecks, simple), ...await runSpecial(page, special)];
      got.forEach((r, j) => { results[idx[j]] = r; });
      const rectLog = (pre.memo && pre.memo.__rects) || [];
      if (rectLog.length) got.forEach((r) => { if (r) r.evidence = [...(r.evidence || []), ...rectLog]; });
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
  L.push(`- 地图状态：${MAP_STATE === 'absent' ? 'absent（无 key，地图相关断言记不适用）' : 'auto'}`);
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
