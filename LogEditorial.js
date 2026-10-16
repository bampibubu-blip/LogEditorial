//@name LogEditorial
//@display-name 🗃️ Log Editorial 1.2.1
//@api 3.0
//@version 1.2.1
//@update-url https://raw.githubusercontent.com/bampibubu-blip/LogEditorial/main/LogEditorial.js
//@description 에셋메이드 삽화가 들어간 채팅 로그를 아카라이브용 에디토리얼 HTML로 만듭니다.
(async () => {
  'use strict';

  const VERSION = '1.2.1';
  const NAME = 'Log Editorial';
  // 저장소 키 (정식 출시 전 'folio:' 키로 저장된 설정도 읽어옴)
  const KEY = 'logeditorial:', LEGACY = 'folio:';
  const R = typeof Risuai !== 'undefined' ? Risuai : (typeof risuai !== 'undefined' ? risuai : null);
  const TEST = typeof globalThis !== 'undefined' && globalThis.__LOGEDITORIAL_TEST__;

  /* =========================================================
   * 1. 유틸
   * ======================================================= */
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escUrl = (u) => {
    const s = String(u || '').trim();
    if (!s) return '';
    if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s) || /^blob:/i.test(s) || /^\/_blob\//.test(s)) return esc(s);
    return '';
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad2 = (n) => String(n).padStart(2, '0');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const decodeEntities = (() => {
    let ta = null;
    return (s) => {
      if (!/[&]/.test(s)) return s;
      if (typeof document === 'undefined') return s;
      ta = ta || document.createElement('textarea');
      ta.innerHTML = s;
      return ta.value;
    };
  })();
  const debounce = (fn, ms) => {
    let t = null;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const setPath = (obj, path, val) => {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  };
  const visibleLengthText = (html) => {
    if (typeof document === 'undefined') return String(html).replace(/<[^>]*>/g, '');
    const d = document.createElement('div');
    d.innerHTML = html.replace(/<img\b[^>]*>/gi, '');
    return d.textContent || '';
  };
  const visibleLength = (() => {
    let box = null;
    return (html) => {
      if (typeof document === 'undefined') return String(html).replace(/<[^>]*>/g, '').length;
      box = box || document.createElement('div');
      box.innerHTML = html;
      return (box.textContent || '').length;
    };
  })();

  /* =========================================================
   * 2. 테마 (아카 다크모드에서도 고정되도록 모든 색을 명시)
   * ======================================================= */
  const FONT = "'Noto Serif KR','Nanum Myeongjo','NanumMyeongjo','AppleMyungjo',Batang,serif";
  const SANS = "Pretendard,'Pretendard Variable',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif";
  const FONT_MODES = { serif: '명조 (Noto Serif KR)', sans: '프리텐다드', mixed: '혼합 · 제목 명조 + 본문 프리텐다드' };
  // 렌더링 중 제목류에만 붙는 서체 (혼합 모드)
  let HF = '';
  // 미리보기 직접 편집용 표시 (출력에는 절대 들어가지 않음)
  let MK = false;
  let NAMES = { char: '', user: '' };
  const macro = (v) => String(v || '').replace(/\{\{\s*char\s*\}\}/gi, NAMES.char || 'Char').replace(/\{\{\s*user\s*\}\}/gi, NAMES.user || 'User');
  const fo = (kind, extra) => (MK ? ` data-fo="${kind}"` + Object.entries(extra || {}).map(([k, v]) => ` data-fo-${k}="${esc(v)}"`).join('') : '');
  const THEMES = {
    sage: {
      label: '세이지', mat: '#e8e6df', sheet: '#fbfaf6', ink: '#2a2f2b', head: '#1f2420', soft: '#6b716c',
      muted: '#7a807b', faint: '#9aa19c', accent: '#5d7466', onAccent: '#fbfaf6', numeral: '#cdd6cf',
      panel: '#f1f0e9', chipBg: '#e1e8e2', chipInk: '#4b6255', line: '#cfd5cf', rule: '#2a2f2b',
      ruleSoft: '#d3d8d2', chipLine: '#d5dbd5', dlg: '#33503f', marker: '#dde7de', tint: '#e4ebe5',
      shadow: 'rgba(30,40,32,', quoteMark: '#a8b8ad', credit: '#a3a69e', toggle: '#8a918b'
    },
    night: {
      label: '나이트', mat: '#0f1011', sheet: '#1a1b1e', ink: '#b8b3a8', head: '#f2ede2', soft: '#8d887e',
      muted: '#8d887e', faint: '#6f6b63', accent: '#c4a96f', onAccent: '#1a1b1e', numeral: '#3b3528',
      panel: '#222327', chipBg: '#2c2a24', chipInk: '#d6c08e', line: '#3a3830', rule: '#c4a96f',
      ruleSoft: '#2c2d31', chipLine: '#3a3830', dlg: '#efe7d4', marker: 'rgba(196,169,111,0.24)', tint: '#2c2b26',
      shadow: 'rgba(0,0,0,', quoteMark: '#6b5d3f', credit: '#5c5952', toggle: '#8d887e'
    },
    ink: {
      label: '잉크 블루', mat: '#e6e8ec', sheet: '#fafaf8', ink: '#262a31', head: '#1d2128', soft: '#6c717a',
      muted: '#7b808a', faint: '#9ea4ad', accent: '#445a7a', onAccent: '#fafaf8', numeral: '#cfd6e1',
      panel: '#eff1f4', chipBg: '#e2e7ef', chipInk: '#3a4e6c', line: '#cdd3dc', rule: '#262a31',
      ruleSoft: '#d8dbe0', chipLine: '#d3d8e0', dlg: '#2b3d5a', marker: '#dde4ef', tint: '#e4e8f0',
      shadow: 'rgba(30,36,48,', quoteMark: '#a9b6c9', credit: '#a5abb5', toggle: '#8a909a'
    }
  };
  THEMES.sage.dark = false; THEMES.ink.dark = false; THEMES.night.dark = true;

  /* ---------- 색 계산 ---------- */
  const hx = (h) => {
    let v = String(h || '').trim().replace(/^#/, '');
    if (v.length === 3) v = v.split('').map((c) => c + c).join('');
    return /^[0-9a-f]{6}$/i.test(v) ? [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) : null;
  };
  const toHex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hx(a) || [0, 0, 0], B = hx(b) || [255, 255, 255]; return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lum = (h) => {
    const c = (hx(h) || [0, 0, 0]).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const rgbaPrefix = (h) => { const c = hx(h) || [0, 0, 0]; return `rgba(${c[0]},${c[1]},${c[2]},`; };

  const BASE_KEYS = ['mat', 'sheet', 'ink', 'accent', 'dlg', 'head'];
  const TOKEN_LABELS = {
    head: '제목 글자', soft: '보조 글자', panel: '카드 바탕', chipBg: '태그 바탕', chipInk: '태그 글자',
    line: '구분선', marker: '대사 형광펜', tint: '대사 하이라이트', numeral: '챕터 숫자', quoteMark: '명대사 따옴표'
  };

  // 기본 색 몇 가지로 나머지 색을 어울리게 계산
  function deriveTheme(b, label) {
    const fb = { mat: '#e8e6df', sheet: '#fbfaf6', ink: '#2a2f2b', accent: '#5d7466' };
    const pick = (k) => (hx(b[k]) ? toHex(hx(b[k])) : fb[k]);
    const mat = pick('mat'), sh = pick('sheet'), ink = pick('ink'), ac = pick('accent');
    const dark = lum(sh) < 0.18;
    const dlg = hx(b.dlg) ? toHex(hx(b.dlg)) : (dark ? mix(ink, '#ffffff', 0.62) : mix(ac, ink, 0.45));
    const head = hx(b.head) ? toHex(hx(b.head)) : (dark ? mix(ink, '#ffffff', 0.72) : mix(ink, '#000000', 0.25));
    const t = {
      label, dark, mat, sheet: sh, ink, head, dlg, accent: ac,
      soft: mix(ink, sh, 0.3), muted: mix(ink, sh, 0.36), faint: mix(ink, sh, 0.5),
      onAccent: contrast(ac, '#ffffff') >= contrast(ac, '#1a1a1a') ? '#ffffff' : '#1a1a1a',
      numeral: mix(ac, sh, dark ? 0.68 : 0.72),
      panel: dark ? mix(sh, '#ffffff', 0.045) : mix(sh, mat, 0.45),
      chipBg: mix(ac, sh, dark ? 0.8 : 0.84),
      chipInk: dark ? mix(ac, '#ffffff', 0.2) : mix(ac, ink, 0.35),
      line: mix(ink, sh, dark ? 0.75 : 0.8), rule: dark ? ac : ink, ruleSoft: mix(ink, sh, dark ? 0.86 : 0.83),
      chipLine: mix(ink, sh, dark ? 0.75 : 0.8),
      marker: mix(dark ? ac : dlg, sh, dark ? 0.76 : 0.82), tint: mix(ac, sh, dark ? 0.84 : 0.86),
      shadow: dark ? 'rgba(0,0,0,' : rgbaPrefix(mix(ink, '#000000', 0.3)),
      quoteMark: mix(ac, sh, 0.45), credit: mix(ink, mat, 0.55), toggle: mix(ink, sh, 0.4)
    };
    for (const [k, v] of Object.entries(b.overrides || {})) if (hx(v) && TOKEN_LABELS[k]) t[k] = toHex(hx(v));
    return t;
  }

  // 추가 프리셋 (기본 색만 정하고 나머지는 계산)
  const PRESET_BASES = {
    terracotta: ['테라코타', { mat: '#ebe3da', sheet: '#fcf8f3', ink: '#3a2c26', accent: '#b0563a' }],
    mauve: ['모브', { mat: '#e9e2e6', sheet: '#fbf8fa', ink: '#3a2f37', accent: '#8c5a7a' }],
    oatmeal: ['오트밀', { mat: '#e6e0d4', sheet: '#fbf9f4', ink: '#33302a', accent: '#8a6b45' }],
    ochre: ['오커', { mat: '#ebe6d6', sheet: '#fdfbf3', ink: '#2f2c22', accent: '#86650c' }],
    slate: ['슬레이트', { mat: '#e3e4e6', sheet: '#fafafa', ink: '#26282b', accent: '#4b5058' }],
    wine: ['와인', { mat: '#e8e1df', sheet: '#fcf9f7', ink: '#2e2424', accent: '#7d2e3a' }],
    forest: ['딥 포레스트', { mat: '#0e1210', sheet: '#171d1a', ink: '#b4bdb6', accent: '#8fb39c' }],
    midnight: ['미드나잇', { mat: '#0c0f15', sheet: '#151a23', ink: '#b3bac6', accent: '#9db4d6' }],
    plum: ['플럼', { mat: '#120d12', sheet: '#1d161d', ink: '#bfb3bd', accent: '#d49bb4' }]
  };
  for (const [k, [label, base]] of Object.entries(PRESET_BASES)) THEMES[k] = deriveTheme(base, label);
  const THEME_ORDER = ['sage', 'ink', 'terracotta', 'mauve', 'oatmeal', 'ochre', 'slate', 'wine', 'night', 'forest', 'midnight', 'plum'];

  /* =========================================================
   * 3. 메시지 파서
   *    - 에셋메이드: 선택된(활성) 이미지 1장만, 재생성 이력은 버림
   *    - 번역: 원문 / GigaTrans / 번역 캐시
   * ======================================================= */
  const AM_PROJ_OPEN = /<div\b[^>]*\bclass\s*=\s*["'][^"']*\b(?:x-risu-)?am-illustration-projection\b[^"']*["'][^>]*>/gi;

  function attr(tag, name) {
    const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i'));
    return m ? decodeEntities(m[1] ?? m[2] ?? '') : '';
  }

  // div 깊이를 세어 투영 블록 전체 범위를 찾음
  function findBalancedDivEnd(s, start) {
    const re = /<\/?div\b[^>]*>/gi;
    re.lastIndex = start;
    let depth = 0, m;
    while ((m = re.exec(s))) {
      if (m[0][1] === '/') { depth--; if (depth === 0) return re.lastIndex; }
      else depth++;
    }
    return s.length;
  }

  const isAmAsset = (name) => /\.__am__\./.test(String(name || ''));

  function imageFromImgTag(tag) {
    const asset = attr(tag, 'data-am-asset');
    let src = attr(tag, 'src');
    if (!src) {
      // <img="이름">, <img=이름>, <img::이름> 같은 리스 단축 문법
      const m = tag.match(/^<(?:p|c)?img\s*(?:=|::?)\s*["']?([^"'>]+?)["']?\s*\/?>$/i) || tag.match(/\bsrc\s*=\s*([^\s>"']+)/i);
      if (m) src = decodeEntities(m[1].trim());
    }
    const w = parseInt(attr(tag, 'width'), 10) || 0;
    const h = parseInt(attr(tag, 'height'), 10) || 0;
    const raw = src.match(/^\{\{\s*raw::([\s\S]+?)\}\}$/i);
    const am = !!asset || /\b(?:x-risu-)?am-/i.test(attr(tag, 'class'));
    if (asset) return { kind: 'asset', name: asset, w, h, am: true };
    if (raw) { const name = raw[1].trim(); return { kind: 'asset', name, w, h, am: am || isAmAsset(name) }; }
    if (/^(https?:)?\/\//i.test(src)) return { kind: 'url', src, w, h, am };
    if (/^data:image\//i.test(src)) return { kind: 'url', src, w, h, am };
    // <img src="yegor_curious"> 처럼 에셋 이름만 적은 경우 (리스가 캐릭터 에셋으로 바꿔 보여 줌)
    if (src && !/[\s<>{}"']/.test(src) && !/^[a-z][a-z0-9+.-]*:/i.test(src)) {
      const name = src.replace(/^\.?\//, '');
      return { kind: 'asset', name, w, h, am: am || isAmAsset(name) };
    }
    return null;
  }

  function imageKey(img) {
    if (img.kind === 'asset') return 'asset:' + img.name;
    if (img.kind === 'inlay') return 'inlay:' + img.id;
    return 'url:' + img.src;
  }

  // 메시지 원문에서 이미지를 토큰으로 바꾸고 목록을 돌려줌
  function extractImages(raw) {
    const images = [];
    const token = (img) => {
      if (!img) return '\n';
      images.push(img);
      return '\n\u2063IMG' + (images.length - 1) + '\u2063\n';
    };
    let s = String(raw || '');
    // 재생성 이력 저장소는 통째로 제거
    s = s.replace(/<div\b[^>]*\bam-illustration-history-bank\b[^>]*>[\s\S]*?<\/span>\s*<\/div>/gi, '');
    s = s.replace(/<span\b[^>]*\b(?:x-risu-)?am-illustration-history-sources\b[^>]*>[\s\S]*?<\/span>/gi, '');
    // 투영 블록: 활성 이미지 1장만
    let out = '', pos = 0, m;
    AM_PROJ_OPEN.lastIndex = 0;
    while ((m = AM_PROJ_OPEN.exec(s))) {
      const start = m.index;
      const end = findBalancedDivEnd(s, start);
      const block = s.slice(start, end);
      const imgTag = (block.match(/<img\b[^>]*\b(?:x-risu-)?am-image__media\b[^>]*>/i) ||
        block.match(/<img\b[^>]*data-am-asset[^>]*>/i) || block.match(/<img\b[^>]*>/i) || [null])[0];
      let img = imgTag ? imageFromImgTag(imgTag) : null;
      if (!img) {
        const a = attr(m[0], 'data-am-asset');
        if (a) img = { kind: 'asset', name: a, w: 0, h: 0 };
      }
      if (img) img.am = true;
      out += s.slice(pos, start) + token(img);
      pos = end;
      AM_PROJ_OPEN.lastIndex = end;
    }
    s = out + s.slice(pos);
    // 남은 일반 이미지
    s = s.replace(/<(?:p|c)?img\b[^>]*>/gi, (tag) => token(imageFromImgTag(tag)));
    // 사용자 첨부 이미지
    s = s.replace(/\{\{\s*inlay(?:ed)?::([a-f0-9-]+)\s*\}\}/gi, (_, id) => token({ kind: 'inlay', id, w: 0, h: 0, am: false }));
    // 리스 에셋 매크로 (캐릭터 에셋 · 감정 이미지). 기존 편집본의 번호가 밀리지 않게 맨 마지막에 번호를 매김
    s = s.replace(/\{\{\s*(img|image|asset|emotion|raw)\s*::\s*([^{}]+?)\s*\}\}/gi, (_, kind, name) => token({ kind: 'asset', name: name.trim(), w: 0, h: 0, am: isAmAsset(name) }));
    return { text: s, images };
  }

  const stripHidden = (s) => String(s || '')
    .replace(/<Thoughts>[\s\S]*?<\/Thoughts>/gi, '')
    .replace(/\[LBDATA START\][\s\S]*?\[LBDATA END\]/gi, '');

  function splitLanguages(s) {
    const re = /<GigaTrans>([\s\S]*?)<\/GigaTrans>/gi;
    if (!re.test(s)) return null;
    const inside = [...s.matchAll(/<GigaTrans>([\s\S]*?)<\/GigaTrans>/gi)].map((m) => m[1].trim()).filter(Boolean).join('\n\n');
    const outside = s.replace(/<GigaTrans>[\s\S]*?<\/GigaTrans>/gi, '').trim();
    return { original: inside, translated: outside };
  }

  // 선택한 언어 본문에 빠진 이미지 토큰을 원래 위치 비율대로 다시 꽂음
  function restoreTokens(selected, source, count) {
    const lines = selected.split('\n');
    for (let i = 0; i < count; i++) {
      const tok = '\u2063IMG' + i + '\u2063';
      if (selected.includes(tok)) continue;
      const at = source.indexOf(tok);
      const ratio = at < 0 ? 1 : at / Math.max(1, source.length);
      let idx = Math.round(ratio * lines.length);
      idx = clamp(idx, 0, lines.length);
      lines.splice(idx, 0, tok);
    }
    return lines.join('\n');
  }

  function htmlToPlain(s) {
    s = s.replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(style|script|template)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote|tr|section|article|details|summary)>/gi, '\n')
      .replace(/<(b|strong)\b[^>]*>/gi, '**').replace(/<\/(b|strong)>/gi, '**')
      .replace(/<(i|em)\b[^>]*>/gi, '*').replace(/<\/(i|em)>/gi, '*')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '');
    return decodeEntities(s);
  }

  const DIALOGUE_START = /^["\u201C\u201E\u300C\u300E\u300A]/;
  const QUOTE_SEG = /("[^"\n]{1,400}"|\u201C[^\u201D\n]{1,400}\u201D|\u300C[^\u300D\n]{1,400}\u300D|\u300E[^\u300F\n]{1,400}\u300F)/g;
  const SCENE_BREAK = /^(\*\s*\*\s*\*|-{3,}|={3,}|⁂|◇+|◆+|#{3,}|~{3,})$/;

  /**
   * 메시지 하나를 블록 배열로 변환
   * opts: { mode, cacheText, charName, userName, replacements, override }
   */
  function parseMessage(raw, opts = {}) {
    const ex = extractImages(stripHidden(raw));
    let text = ex.text;
    const langs = splitLanguages(text);
    if (langs) {
      let pick = opts.mode === 'gigatrans' ? (langs.translated || langs.original) : langs.original;
      if (opts.mode === 'cache' && opts.cacheText) pick = opts.cacheText;
      text = restoreTokens(pick, text, ex.images.length);
    } else if (opts.mode === 'cache' && opts.cacheText) {
      text = restoreTokens(opts.cacheText, text, ex.images.length);
    }
    if (typeof opts.override === 'string') text = opts.override;
    text = htmlToPlain(text);
    const cn = opts.charName || 'Char', un = opts.userName || 'User';
    text = text.replace(/\{\{\s*char\s*\}\}|<char>/gi, cn).replace(/\{\{\s*user\s*\}\}|<user>/gi, un);
    text = text.replace(/\{\{[^{}]*\}\}/g, '');
    // 직접 편집한 메시지는 이미 치환이 끝난 확정 본문
    if (typeof opts.override !== 'string') text = applyReplacements(text, opts.replacements);
    const blocks = [];
    let hidden = 0;
    for (let line of text.split('\n')) {
      line = line.replace(/\u00a0/g, ' ').trim();
      if (!line) continue;
      const tm = line.match(/^\u2063IMG(\d+)\u2063$/) || line.match(/^⟦삽화:(\d+)⟧$/);
      if (tm) {
        const img = ex.images[+tm[1]];
        if (img && img.am === false && !opts.otherImages) { hidden++; continue; }
        if (img) blocks.push({ type: 'img', img, key: imageKey(img), token: '⟦삽화:' + tm[1] + '⟧' });
        continue;
      }
      const cm = line.match(/^⟦이미지:\s*(.+?)\s*⟧$/);
      if (cm) {
        const ref = cm[1];
        const img = /^(https?:)?\/\//i.test(ref) ? { kind: 'url', src: ref } : { kind: 'custom', id: ref };
        blocks.push({ type: 'img', img, key: img.kind === 'url' ? 'url:' + ref : 'custom:' + ref, token: '⟦이미지:' + ref + '⟧' });
        continue;
      }
      line = line.replace(/\u2063IMG\d+\u2063/g, '').trim();
      if (!line) continue;
      if (SCENE_BREAK.test(line)) { blocks.push({ type: 'break' }); continue; }
      const hm = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      if (hm) { blocks.push({ type: 'h', level: hm[1].length, text: hm[2] }); continue; }
      blocks.push({ type: 'p', text: line, dialogue: DIALOGUE_START.test(line) });
    }
    return { blocks, images: ex.images, hasTranslation: !!langs, hidden };
  }

  // 블록 → 편집용 줄 (이미지는 ⟦삽화:n⟧ / ⟦이미지:id⟧)
  const blockLine = (b) => (b.type === 'img' ? b.token : b.type === 'break' ? '* * *' : b.type === 'h' ? '#'.repeat(b.level) + ' ' + b.text : b.text);
  const blocksToText = (blocks) => blocks.map(blockLine).join('\n\n');
  function blocksToEditable(raw, opts) {
    return blocksToText(parseMessage(raw, { ...opts, otherImages: true }).blocks);
  }

  // 일반 / 정규식 치환. 잘못된 정규식은 건너뜀
  function applyReplacements(text, list) {
    for (const r of list || []) {
      if (!r || !r.from || r.off) continue;
      if (r.regex) {
        const re = compileRegex(r);
        if (re) text = text.replace(re, String(r.to ?? '').replace(/\\n/g, '\n'));
      } else {
        text = text.split(r.from).join(r.to ?? '');
      }
    }
    return text;
  }
  function compileRegex(r) {
    try {
      const flags = [...new Set(String(r.flags == null ? 'g' : r.flags).replace(/[^gimsuy]/g, ''))].join('');
      return new RegExp(r.from, flags);
    } catch (e) { return null; }
  }

  /* =========================================================
   * 4. 아카 호환 렌더러
   *    규칙: flex/grid/table/hr 금지, border는 개별 속성,
   *    img는 line-height:0 래퍼, 인라인 스타일만 사용
   * ======================================================= */
  const bd = (w, c) => `border-top:${w}px solid ${c};border-right:${w}px solid ${c};border-bottom:${w}px solid ${c};border-left:${w}px solid ${c};`;

  function inlineFormat(text, t, dlgStyle, wrapQuotes) {
    let h = esc(text);
    h = h.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
    if (wrapQuotes) {
      h = h.replace(/(&quot;[^\n]{1,400}?&quot;|\u201C[^\u201D\n]{1,400}\u201D|\u300C[^\u300D\n]{1,400}\u300D|\u300E[^\u300F\n]{1,400}\u300F)/g,
        (q) => dialogueSpan(q, t, dlgStyle, true));
    }
    return h;
  }

  function dialogueSpan(inner, t, style, inline) {
    const color = inline ? `color:${t.dlg};font-weight:500;` : '';
    if (style === 'marker') return `<span style="${color}background:linear-gradient(transparent 62%,${t.marker} 62%);">${inner}</span>`;
    if (style === 'tint') return `<span style="${color}background-color:${t.tint};padding:1px 5px;border-radius:4px;">${inner}</span>`;
    return inline ? `<span style="${color}">${inner}</span>` : inner;
  }

  const TOGGLE_PILL_RE = '<div style="display:inline-block;margin:16px 0 0 0;padding:4px 14px;[^"]*">접기 · 펼치기</div>';
  const P_BASE = 'clear:both;margin:0 0 1.15em 0;font-size:15px;line-height:1.9;letter-spacing:-0.2px;word-break:keep-all;';

  function renderParagraph(b, t, o, dropCap, mark = '') {
    if (b.dialogue) {
      const inner = inlineFormat(b.text, t, o.dlgStyle, false);
      return `<p${mark} style="${P_BASE}color:${t.dlg};font-weight:500;">${dialogueSpan(inner, t, o.dlgStyle, false)}</p>`;
    }
    let text = b.text;
    let cap = '';
    if (dropCap) {
      const ch = Array.from(text)[0] || '';
      if (/[\p{L}\p{N}]/u.test(ch)) {
        cap = `<span style="${HF}float:left;font-size:56px;line-height:0.95;font-weight:700;color:${t.accent};margin:6px 12px 0 0;">${esc(ch)}</span>`;
        text = text.slice(ch.length);
      }
    }
    return `<p${mark} style="${P_BASE}color:${t.ink};">${cap}${inlineFormat(text, t, o.dlgStyle, true)}</p>`;
  }

  const ornament = (t, w = 64) =>
    // 아카 에디터가 빈 span을 지우므로 선은 내용이 있는 div로 그림
    `<div style="font-size:0;line-height:0;text-align:center;"><div style="display:inline-block;width:${w}px;height:1px;background:${t.line};vertical-align:middle;font-size:0;line-height:0;">&nbsp;</div><div style="display:inline-block;margin:0 14px;font-size:12px;line-height:1;color:${t.accent};vertical-align:middle;">✦</div><div style="display:inline-block;width:${w}px;height:1px;background:${t.line};vertical-align:middle;font-size:0;line-height:0;">&nbsp;</div></div>`;

  function plateCaption(o, key, num) {
    const own = o.captions && o.captions[key];
    const tpl = own != null && own !== '' ? own : (o.plateLabel == null ? 'PLATE {n}' : o.plateLabel);
    return String(tpl).replace(/\{n\}/g, pad2(num)).replace(/\{i\}/g, String(num)).trim();
  }

  function renderPlate(src, num, t, o, key) {
    if (!src) return '';
    const cap = o.plateCaption ? plateCaption(o, key, num) : '';
    let h = `<div style="margin:44px 0 14px 0;line-height:0;font-size:0;text-align:center;"><img src="${escUrl(src)}" alt="" style="width:100%;max-width:100%;height:auto;display:block;border-radius:14px;box-shadow:0 12px 30px ${t.shadow}0.16);"></div>`;
    if (cap) {
      const latin = /^[\x00-\x7F]*$/.test(cap);
      h += `<div${fo('cap', { cap: key })} style="text-align:center;margin:0 0 44px 0;font-size:${latin ? '10.5px' : '12.5px'};letter-spacing:${latin ? '0.32em' : '0.04em'};color:${t.faint};word-break:keep-all;">${esc(cap)}</div>`;
    }
    else h = h.replace('margin:44px 0 14px 0', 'margin:44px 0 44px 0');
    return h;
  }

  // 아카는 게시할 때 <a>의 style을 모두 지움 → 상자는 바깥 span, 글자색은 링크 안쪽 span에
  const linkBox = (url, label, boxStyle, color) =>
    `<span style="${boxStyle}"><a href="${escUrl(url)}" target="_blank"><span style="color:${color};">${label}</span></a></span>`;

  const chip = (text, t) =>
    `<span style="display:inline-block;margin:3px 4px;padding:5px 12px;border-radius:999px;${bd(1, t.chipLine)}font-size:11px;line-height:1.4;letter-spacing:0.08em;color:${t.soft};">${esc(text)}</span>`;
  const tagChip = (text, t) =>
    `<span style="display:inline-block;margin:2px 3px;padding:3px 10px;border-radius:999px;background:${t.chipBg};font-size:11.5px;line-height:1.5;color:${t.chipInk};">${esc(text)}</span>`;

  function renderMasthead(doc, t) {
    const c = doc.cover;
    return `<div style="font-size:0;line-height:0;padding:0 0 12px 0;"><div style="display:inline-block;width:64%;vertical-align:middle;text-align:left;font-size:10.5px;line-height:1.4;letter-spacing:0.22em;color:${t.ink};font-weight:600;"><span style="font-size:10.5px;line-height:1.4;letter-spacing:0.22em;color:${t.ink};font-weight:600;">${esc(macro(c.mastLeft || 'THE ROLEPLAY LOG'))}</span></div><div style="display:inline-block;width:36%;vertical-align:middle;text-align:right;font-size:10.5px;line-height:1.4;letter-spacing:0.14em;color:${t.muted};"><span style="font-size:10.5px;line-height:1.4;letter-spacing:0.14em;color:${t.muted};">${esc(macro(c.mastRight || ''))}</span></div></div>`
      + `<div style="height:1px;background:${t.rule};font-size:0;line-height:0;"></div><div style="height:1px;background:${t.ruleSoft};margin:3px 0 30px 0;font-size:0;line-height:0;"></div>`;
  }

  function renderCover(doc, t, src) {
    const c = doc.cover;
    let h = '';
    if (src) h += `<div style="line-height:0;font-size:0;text-align:center;"><img src="${escUrl(src)}" alt="" style="width:100%;max-width:100%;height:auto;display:block;border-radius:14px;box-shadow:0 14px 34px ${t.shadow}0.18);"></div>`;
    h += `<div style="text-align:center;padding:${src ? 40 : 18}px 0 4px 0;">`;
    if (c.eyebrow) h += `<div${fo('bind', { path: 'doc.cover.eyebrow' })} style="font-size:11px;letter-spacing:0.34em;color:${t.accent};">${esc(macro(c.eyebrow))}</div>`;
    h += `<div${fo('bind', { path: 'doc.cover.title' })} style="${HF}font-size:clamp(24px,5.2vw,34px);font-weight:700;line-height:1.3;margin:14px 0 10px 0;color:${t.head};word-break:keep-all;">${esc(macro(c.title) || '제목 없는 기록')}</div>`;
    if (c.subtitle) h += `<div${fo('bind', { path: 'doc.cover.subtitle' })} style="font-size:15px;color:${t.soft};word-break:keep-all;">${esc(macro(c.subtitle))}</div>`;
    const chips = [];
    if (c.author) chips.push(chip('by ' + c.author, t));
    for (const x of String(c.chips || '').split(',').map((s) => s.trim()).filter(Boolean)) chips.push(chip(x, t));
    if (c.botUrl) chips.push(linkBox(c.botUrl, esc(c.botLabel || 'Open Bot') + ' ↗', `display:inline-block;margin:3px 4px;padding:5px 14px;border-radius:999px;background:${t.accent};font-size:11px;line-height:1.4;letter-spacing:0.08em;color:${t.onAccent};`, t.onAccent));
    if (chips.length) h += `<div style="margin:26px 0 22px 0;">${ornament(t)}</div><div style="font-size:0;line-height:0;">${chips.join('')}</div>`;
    h += '</div>';
    return h;
  }

  const CAST_MAX = 6;
  function renderCastCard(p, role, src, t, who, layout) {
    const tags = String(p.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
    const top = src || layout.anyPortrait ? 60 : 24;
    // 좁은 화면(카드 영역이 layout.bp 미만)에서는 한 줄에 하나씩 꽉 차게
    let h = `<div style="display:inline-block;width:${layout.width};width:max(${layout.width},calc((${layout.bp}px - 100%) * 999));max-width:100%;vertical-align:top;box-sizing:border-box;padding:0 8px;font-size:15px;line-height:1.6;"><div style="margin:${top}px 0 0 0;background:${t.panel};border-radius:16px;padding:${src ? 1 : 22}px 20px 24px 20px;">`;
    // 크기를 틀 · 이미지 · 속성 세 겹으로 고정 (이미지 자체도 정사각형으로 잘라 둠)
    if (src) h += `<div style="width:92px;height:92px;min-width:92px;max-width:92px;min-height:92px;max-height:92px;margin:-47px auto 0 auto;border-radius:50%;overflow:hidden;${bd(4, t.sheet)}background:${t.panel};line-height:0;font-size:0;"><img src="${escUrl(src)}" width="92" height="92" alt="" style="width:92px;height:92px;min-width:92px;max-width:92px;min-height:92px;max-height:92px;display:block;margin:0;border-radius:50%;object-fit:cover;"></div>`;
    h += `<div style="font-size:10px;letter-spacing:0.3em;color:${t.faint};margin:${src ? 14 : 0}px 0 0 0;">${role}</div>`;
    h += `<div${fo('bind', { path: 'doc.cast.' + who + '.name' })} style="${HF}font-size:19px;font-weight:600;color:${t.head};margin:4px 0 0 0;">${esc(p.name || '')}</div>`;
    if (tags.length) h += `<div style="font-size:0;line-height:0;margin:10px 0 0 0;">${tags.map((x) => tagChip(x, t)).join('')}</div>`;
    if (p.desc) h += `<div${fo('bind', { path: 'doc.cast.' + who + '.desc' })} style="font-size:13px;color:${t.soft};line-height:1.75;margin:12px 0 0 0;word-break:keep-all;">${esc(p.desc)}</div>`;
    return h + '</div></div>';
  }

  function renderCast(doc, t, srcOf) {
    const c = doc.cast;
    if (!c.on) return '';
    const list = [{ p: c.char, role: 'CHARACTER', who: 'char', key: 'portrait:char' }];
    if (c.showUser) list.push({ p: c.user, role: 'USER', who: 'user', key: 'portrait:user' });
    (c.extra || []).forEach((x, i) => {
      if (x && (x.name || x.desc || x.tags)) list.push({ p: x, role: (x.role || 'CAST').toUpperCase(), who: 'extra.' + i, key: 'portrait:' + x.id });
    });
    const cards = list.slice(0, CAST_MAX).map((it) => ({ ...it, src: it.p.portrait ? srcOf(it.key) : '' }));
    // 2명·4명은 두 줄, 3명·5명·6명은 세 줄 배치
    const n = cards.length;
    const cols = n <= 2 || n === 4 ? 2 : 3;
    const layout = { width: cols === 2 ? '50%' : '33.333%', bp: cols === 2 ? 480 : 560, anyPortrait: cards.some((x) => x.src) };
    const html = cards.map((x) => renderCastCard(x.p, x.role, x.src, t, x.who, layout)).join('');
    return `<div style="margin:52px 0 0 0;text-align:center;"><div style="font-size:11px;letter-spacing:0.34em;color:${t.accent};">CAST</div><div style="font-size:0;line-height:0;margin:0 -8px;">${html}</div></div>`;
  }

  function renderOpener(ch, t, continued) {
    const num = continued ? '' : `<div style="${HF}font-size:64px;line-height:1;font-weight:300;color:${t.numeral};letter-spacing:0.02em;">${pad2(ch.num)}</div>`;
    return num
      + `<div style="font-size:11px;letter-spacing:0.34em;color:${t.accent};margin:${continued ? 0 : 8}px 0 0 0;">CHAPTER ${continued ? pad2(ch.num) + ' · 계속' : ''}</div>`
      + `<div${fo('bind', { path: 'doc.chapters.' + ch.id + '.title' })} style="${HF}font-size:23px;font-weight:600;margin:10px 0 0 0;color:${t.head};word-break:keep-all;">${esc(ch.title || '')}</div>`
      + (ch.sub ? `<div${fo('bind', { path: 'doc.chapters.' + ch.id + '.sub' })} style="font-size:13.5px;color:${t.muted};margin:6px 0 0 0;word-break:keep-all;">${esc(ch.sub)}</div>` : '');
  }

  function renderQuote(q, t, chId) {
    return `<div style="margin:52px 0 0 0;padding:36px clamp(20px,5vw,40px) 32px clamp(20px,5vw,40px);background:${t.panel};border-radius:18px;text-align:center;"><div style="${HF}font-size:48px;line-height:0.6;color:${t.quoteMark};font-weight:700;">“</div><div${fo('bind', { path: 'doc.chapters.' + chId + '.quote', multiline: '1' })} style="${HF}font-size:19px;line-height:1.75;color:${t.head};font-weight:500;margin:16px 0 0 0;word-break:keep-all;">${esc(q.text).replace(/\n/g, '<br>')}</div>${q.who ? `<div style="font-size:10.5px;letter-spacing:0.3em;color:${t.muted};margin:18px 0 0 0;">— ${esc(q.who.toUpperCase())}</div>` : ''}</div>`;
  }

  function renderPartHeader(doc, t, n, total) {
    return `<div style="text-align:center;"><div style="font-size:13px;color:${t.soft};">${esc(macro(doc.cover.title || ''))}</div><div style="font-size:11px;letter-spacing:0.36em;color:${t.accent};margin:10px 0 0 0;">PART ${n} <span style="color:${t.faint};">/ ${total}</span></div><div style="height:1px;background:${t.ruleSoft};margin:24px 0 0 0;font-size:0;line-height:0;"></div></div>`;
  }

  function renderFooter(doc, t, n, total) {
    const links = doc.partLinks || [];
    let h = `<div style="margin:56px 0 0 0;text-align:center;">${ornament(t)}`;
    h += `<div style="font-size:10.5px;letter-spacing:0.34em;color:${t.faint};margin:20px 0 0 0;">${n < total ? 'END OF PART ' + n : 'FIN'}</div>`;
    if (total > 1) {
      const pill = (label, url, solid) => {
        const st = solid
          ? `background:${t.accent};color:${t.onAccent};`
          : `${bd(1, t.chipLine)}color:${t.soft};`;
        const base = `display:inline-block;margin:6px 5px 0 5px;padding:9px 20px;border-radius:999px;font-size:13px;letter-spacing:0.04em;${st}`;
        return url ? linkBox(url, label, base, solid ? t.onAccent : t.soft) : `<span style="${base}">${label}</span>`;
      };
      let nav = '';
      if (n > 1) nav += pill('← Part ' + (n - 1), links[n - 2], false);
      if (n < total) nav += pill('Part ' + (n + 1) + ' 이어 읽기 →', links[n], true);
      h += `<div style="margin:14px 0 0 0;">${nav}</div>`;
    }
    return h + '</div>';
  }

  /**
   * 문서 모델 → 단위 목록
   * model: { messages:[{key, parsed}], chapters:{key:{title,sub,quote,who}} }
   */
  function buildUnits(model, o, t) {
    const units = [];
    let ch = null, chNum = 0, plateNum = 0, firstPara = false;
    const startChapter = (meta, key) => {
      if (ch && ch.quote) units.push({ kind: 'quote', ch, html: renderQuote(ch.quote, t, ch.id) });
      chNum++;
      ch = { id: key, num: chNum, title: meta.title || '', sub: meta.sub || '', titled: true,
        quote: meta.quote ? { text: meta.quote, who: meta.who || '' } : null };
      units.push({ kind: 'chapter', ch, msg: key, html: '' });
      firstPara = true;
    };
    const mode = o.userStyle || 'none';
    let lastRole = null;
    for (const m of model.messages) {
      const meta = model.chapters[m.key];
      if (meta && meta.on) { startChapter(meta, m.key); lastRole = null; }
      if (!ch) ch = { id: '_pre', num: 0, title: '', titled: false, quote: null };
      const role = m.role === 'user' ? 'user' : 'char';
      const hasBody = m.parsed.blocks.length > 0;
      if (mode === 'label' && hasBody && role !== lastRole) {
        units.push({ kind: 'label', ch, msg: m.key, role, html: renderRoleLabel(role, t, o) });
      }
      if (hasBody) lastRole = role;
      const muted = mode === 'muted' && role === 'user';
      m.parsed.blocks.forEach((b, bi) => {
        if (b.type === 'p') {
          const canDrop = !(role === 'user' && (mode === 'block' || mode === 'muted'));
          units.push({ kind: 'p', ch, msg: m.key, role, muted, bi, b, drop: firstPara && o.dropCap && !b.dialogue && canDrop });
          firstPara = false;
        } else if (b.type === 'img') {
          // 감정 이미지 같은 에셋메이드 외 이미지는 삽화 번호를 매기지 않음
          const other = b.img && b.img.am === false && o.otherSize !== 'full';
          if (!other) plateNum++;
          units.push({ kind: 'img', ch, msg: m.key, role, key: b.key, num: plateNum, other });
        } else if (b.type === 'break') {
          units.push({ kind: 'break', ch, msg: m.key, role });
        } else if (b.type === 'h' && o.headings !== 'hide') {
          units.push({ kind: 'h', ch, msg: m.key, role, b });
        }
      });
    }
    if (ch && ch.quote) units.push({ kind: 'quote', ch, html: renderQuote(ch.quote, t, ch.id) });
    return units;
  }

  function renderRoleLabel(role, t, o) {
    const name = (o.names && o.names[role]) || (role === 'user' ? 'USER' : 'CHAR');
    const st = role === 'user' ? `background:${t.chipBg};color:${t.chipInk};` : `background:${t.panel};color:${t.soft};`;
    return `<div style="clear:both;margin:30px 0 12px 0;font-size:0;line-height:0;"><span style="display:inline-block;padding:3px 11px;border-radius:999px;${st}font-size:11px;line-height:1.5;letter-spacing:0.06em;font-weight:600;">${esc(name)}</span></div>`;
  }

  // 유저 차례를 흐리게: 글자색을 한 톤 낮추고 들여쓰기
  const mutedTheme = (t) => ({ ...t, ink: t.soft, dlg: t.soft, marker: t.panel, tint: t.panel });

  function unitHtml(u, t, o, srcOf) {
    if (u.kind === 'p' && u.muted) return renderParagraph(u.b, mutedTheme(t), o, false, fo('p', { msg: u.msg, bi: u.bi })).replace('style="', 'style="padding-left:1.4em;');
    if (u.kind === 'p') return renderParagraph(u.b, t, o, u.drop, fo('p', { msg: u.msg, bi: u.bi }));
    if (u.kind === 'label') return u.html;
    if (u.kind === 'img' && u.other) {
      const src = srcOf(u.key);
      if (!src) return '';
      const hpx = o.otherSize === 'small' ? 200 : 320;
      return `<div style="clear:both;margin:28px 0 28px 0;line-height:0;font-size:0;text-align:center;"><img src="${escUrl(src)}" alt="" style="width:auto;height:auto;max-width:100%;max-height:${hpx}px;display:inline-block;margin:0 auto;border-radius:12px;"></div>`;
    }
    if (u.kind === 'img') return renderPlate(srcOf(u.key), u.num, t, o, u.key);
    if (u.kind === 'h') {
      const big = u.b.level <= 2;
      return `<div style="clear:both;margin:${big ? 40 : 32}px 0 16px 0;${HF}font-size:${big ? 18 : 16.5}px;line-height:1.5;font-weight:600;color:${t.head};word-break:keep-all;">${inlineFormat(u.b.text, t, o.dlgStyle, false)}</div>`;
    }
    if (u.kind === 'break') return `<div style="text-align:center;margin:8px 0 28px 0;font-size:12px;letter-spacing:0.5em;color:${t.faint};">· ✦ ·</div>`;
    if (u.kind === 'quote') return u.html;
    return '';
  }

  // 아카 글자수 제한을 넘지 않도록 단위 목록을 편으로 나눔
  function splitParts(units, sizes, limit) {
    const parts = [];
    let cur = [], used = 0;
    const budget = (pi) => Math.max(2000, limit - (pi === 0 ? sizes.first : sizes.other));
    const sum = (arr) => arr.reduce((a, u) => a + u.len, 0);
    for (const u of units) {
      const cap = budget(parts.length);
      if (cur.length && used + u.len > cap) {
        let cut = -1;
        const half = cap * 0.5;
        for (let j = cur.length - 1; j > 0; j--) {
          if (cur[j].kind === 'chapter' && sum(cur.slice(0, j)) >= half) { cut = j; break; }
        }
        if (cut < 0) {
          for (let j = cur.length - 1; j > 0; j--) {
            if (cur[j].msg !== cur[j - 1].msg && sum(cur.slice(0, j)) >= half) { cut = j; break; }
          }
        }
        if (cut < 0) {
          cut = cur.length;
          // 챕터 머리만 남고 본문이 다음 편으로 넘어가지 않도록
          while (cut > 1 && cur[cut - 1].kind === 'chapter') cut--;
        }
        parts.push(cur.slice(0, cut));
        cur = cur.slice(cut);
        used = sum(cur);
      }
      cur.push(u);
      used += u.len;
    }
    if (cur.length || !parts.length) parts.push(cur);
    return parts;
  }

  function renderBody(units, t, o, srcOf) {
    if (o.userStyle !== 'block') return units.map((u) => unitHtml(u, t, o, srcOf)).join('');
    let h = '', i = 0;
    while (i < units.length) {
      const u = units[i];
      if (u.role !== 'user') { h += unitHtml(u, t, o, srcOf); i++; continue; }
      let j = i;
      while (j < units.length && units[j].role === 'user' && units[j].msg === u.msg) j++;
      const inner = units.slice(i, j).map((x) => unitHtml(x, t, o, srcOf)).join('')
        .replace(/margin:44px 0 (14|44)px 0;line-height:0/g, 'margin:16px 0 $1px 0;line-height:0');
      const name = (o.names && o.names.user) || 'USER';
      h += `<div style="clear:both;margin:8px 0 1.5em 0;padding:16px clamp(16px,4vw,22px) 4px clamp(16px,4vw,22px);background:${t.panel};border-radius:14px;"><div style="font-size:10px;letter-spacing:0.26em;color:${t.faint};margin:0 0 10px 0;font-weight:600;">${esc(name)}</div>${inner.replace(/margin:0 0 1\.15em 0;/g, 'margin:0 0 0.9em 0;')}</div>`;
      i = j;
    }
    return h;
  }

  function renderPartBody(units, t, o, srcOf) {
    let h = '';
    let i = 0;
    while (i < units.length) {
      const ch = units[i].ch;
      let j = i;
      while (j < units.length && units[j].ch === ch) j++;
      const seg = units.slice(i, j);
      const startsHere = seg[0].kind === 'chapter';
      const body = renderBody(seg.filter((u) => u.kind !== 'chapter' && u.kind !== 'quote'), t, o, srcOf);
      const quotes = seg.filter((u) => u.kind === 'quote').map((u) => u.html).join('');
      if (ch.titled) {
        const opener = renderOpener(ch, t, !startsHere);
        if (o.toggle !== 'off') {
          const open = o.toggle === 'all' || (o.toggle === 'first' && ch.num === 1);
          h += `<details${open ? ' open=""' : ''} style="margin:${h ? 52 : 56}px 0 0 0;padding:0;"><summary style="list-style:none;cursor:pointer;text-align:center;padding:0 0 38px 0;outline:none;">${opener}<div style="display:inline-block;margin:16px 0 0 0;padding:4px 14px;border-radius:999px;background:${t.panel};font-size:10.5px;letter-spacing:0.14em;color:${t.toggle};">접기 · 펼치기</div></summary><div style="margin:0;padding:0;">${body}</div></details>`;
        } else {
          h += `<div style="margin:${h ? 52 : 56}px 0 0 0;padding:0;"><div style="text-align:center;padding:0 0 38px 0;">${opener}</div><div style="margin:0;padding:0;">${body}</div></div>`;
        }
      } else if (body) {
        h += `<div style="margin:${h ? 40 : 48}px 0 0 0;padding:0;">${body}</div>`;
      }
      h += quotes;
      i = j;
    }
    return h;
  }

  function wrapPage(inner, t, thumbSrc, font, credit = true) {
    const thumb = thumbSrc ? `<img src="${escUrl(thumbSrc)}" alt="" style="display:block;width:0;height:0;max-width:0;max-height:0;opacity:0;overflow:hidden;">` : '';
    return `<div style="max-width:760px;margin:0 auto;background:${t.mat};padding:clamp(10px,3.6vw,28px);box-sizing:border-box;font-family:${font === 'serif' ? FONT : SANS};color:${t.ink};">${thumb}<div style="background:${t.sheet};border-radius:18px;box-shadow:0 1px 2px ${t.shadow}0.06),0 12px 36px ${t.shadow}0.10);padding:clamp(26px,6vw,40px) clamp(18px,6.6vw,52px) clamp(30px,6vw,44px) clamp(18px,6.6vw,52px);box-sizing:border-box;">${inner}</div>${credit ? `<div style="text-align:center;font-size:10.5px;color:${t.credit};margin:18px 0 4px 0;letter-spacing:0.08em;">Made with Log Editorial</div>` : '<div style="height:4px;font-size:0;line-height:0;"></div>'}</div>`;
  }

  /**
   * 전체 렌더링 → 편별 HTML
   * srcOf(key): 이미지 키 → src ('' 이면 생략)
   */
  function renderDocument(model, doc, o, srcOf) {
    const t = o.themeObj || THEMES[o.theme] || THEMES.sage;
    HF = o.font === 'mixed' ? `font-family:${FONT};` : '';
    MK = !!o.mark;
    NAMES = o.names || { char: (doc.cast.char || {}).name || '', user: (doc.cast.user || {}).name || '' };
    const units = buildUnits(model, o, t);
    for (const u of units) {
      if (u.kind === 'chapter') u.len = visibleLength(renderOpener(u.ch, t, false)) + 8;
      else u.len = visibleLength(unitHtml(u, t, o, () => ''));
    }
    if (o.userStyle === 'block') {
      const name = (o.names && o.names.user) || 'USER';
      units.forEach((u, i) => { if (u.role === 'user' && (i === 0 || units[i - 1].msg !== u.msg)) u.len += name.length; });
    }
    const coverSrc = srcOf('cover');
    const head = (o.masthead ? renderMasthead(doc, t) : '') + renderCover(doc, t, coverSrc)
      + renderCast(doc, t, srcOf);
    const sizes = {
      first: visibleLength(head) + visibleLength(renderFooter(doc, t, 1, 2)) + 40,
      other: visibleLength(renderPartHeader(doc, t, 2, 2)) + visibleLength(renderFooter(doc, t, 2, 3)) + 60
    };
    const groups = splitParts(units, sizes, o.limit || 60000);
    const total = groups.length;
    const firstPlate = units.find((u) => u.kind === 'img');
    return groups.map((g, i) => {
      const n = i + 1;
      let inner = n === 1 ? head : renderPartHeader(doc, t, n, total);
      inner += renderPartBody(g, t, o, srcOf);
      inner += renderFooter(doc, t, n, total);
      const plateInPart = g.find((u) => u.kind === 'img');
      const thumbKey = n === 1 ? (coverSrc ? 'cover' : firstPlate && firstPlate.key) : (plateInPart ? plateInPart.key : 'cover');
      const thumb = o.thumbnail ? srcOf(thumbKey || '') : '';
      const html = wrapPage(inner, t, thumb, o.font || 'serif', o.credit !== false);
      return { html, chars: visibleLength(html), units: g.length };
    });
  }

  /* =========================================================
   * 5. 이미지 (에셋 읽기 · 리사이즈 · ZIP)
   * ======================================================= */
  const mimeOfExt = (ext) => ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' }[String(ext || '').toLowerCase()] || 'image/png');

  function base64ToBytes(b64) {
    const bin = atob(b64.replace(/^data:[^,]+,/, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function toBlob(data, mime) {
    if (!data) return null;
    if (typeof Blob !== 'undefined' && data instanceof Blob) return data;
    if (data instanceof ArrayBuffer) return new Blob([data], { type: mime });
    if (ArrayBuffer.isView(data)) return new Blob([data], { type: mime });
    if (typeof data === 'string') {
      const m = data.match(/^data:([^;,]+)/);
      return new Blob([base64ToBytes(data)], { type: m ? m[1] : mime });
    }
    if (data && data.data) return toBlob(data.data, mime);
    return null;
  }

  async function readAssetByPath(path, mime) {
    if (!path || !R || typeof R.readImage !== 'function') return null;
    const tries = [...new Set([path, String(path).replace(/^assets\//, ''), String(path).split(/[\\/]/).pop()])];
    for (const p of tries) {
      try {
        const d = await R.readImage(p);
        const b = toBlob(d, mime);
        if (b && b.size) return b;
      } catch (e) { /* 다음 경로 시도 */ }
    }
    return null;
  }

  async function blobToImage(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }

  let webpOK = null;
  function outputMime() {
    if (webpOK === null) {
      try { webpOK = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { webpOK = false; }
    }
    return webpOK ? 'image/webp' : 'image/jpeg';
  }

  // maxW 기준 리사이즈, square면 가운데 정사각형으로 자름
  // 비율(aspect)에 맞는 가장 큰 영역을 줌만큼 줄이고, x·y(0~100%)로 위치를 정함
  const PORTRAIT_CROP = { x: 50, y: 35, zoom: 1 };
  function cropRect(W, H, aspect, crop) {
    const c = crop || {};
    let cw = W, ch = H;
    if (W / H > aspect) cw = H * aspect; else ch = W / aspect;
    const z = clamp(Number(c.zoom) || 1, 1, 4);
    cw /= z; ch /= z;
    const x = clamp(c.x == null ? 50 : Number(c.x), 0, 100), y = clamp(c.y == null ? 50 : Number(c.y), 0, 100);
    return { sx: (W - cw) * x / 100, sy: (H - ch) * y / 100, sw: cw, sh: ch };
  }

  async function encodeImage(blob, { maxW = 960, quality = 0.86, square = 0, aspect = 0, crop = null } = {}) {
    const img = await blobToImage(blob);
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    let dw, dh;
    if (square) {
      const r = cropRect(sw, sh, 1, crop || PORTRAIT_CROP);
      sx = r.sx; sy = r.sy; sw = r.sw; sh = r.sh;
      dw = dh = Math.max(1, Math.round(Math.min(square, sw)));
    } else if (aspect) {
      const r = cropRect(sw, sh, aspect, crop);
      sx = r.sx; sy = r.sy; sw = r.sw; sh = r.sh;
      dw = Math.max(1, Math.round(Math.min(maxW, sw))); dh = Math.max(1, Math.round(dw / aspect));
    } else {
      const k = Math.min(1, maxW / sw);
      dw = Math.round(sw * k); dh = Math.round(sh * k);
    }
    const cv = document.createElement('canvas');
    cv.width = dw; cv.height = dh;
    cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    const mime = outputMime();
    const dataUrl = cv.toDataURL(mime, quality);
    return { dataUrl, mime, w: dw, h: dh, ext: mime === 'image/webp' ? 'webp' : 'jpg' };
  }

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

  // 무압축 ZIP (이미지는 이미 압축되어 있음)
  function makeZip(files) {
    const enc = new TextEncoder();
    const chunks = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const csize = central.reduce((a, c) => a + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  // 아카 코드보기 HTML(또는 URL 목록)에서 이미지 주소를 순서대로 추출
  function extractArcaUrls(text) {
    const urls = [];
    const push = (u) => {
      u = decodeEntities(u.trim());
      if (/^\/\//.test(u)) u = 'https:' + u;
      if (/^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
    };
    const srcRe = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
    let m, found = false;
    while ((m = srcRe.exec(text))) { found = true; push(m[1]); }
    if (!found) {
      const re = /(?:https?:)?\/\/[^\s"'<>()]+?\.(?:webp|png|jpe?g|gif|avif)(?:\?[^\s"'<>()]*)?/gi;
      while ((m = re.exec(text))) push(m[0]);
    }
    return urls;
  }

  /* =========================================================
   * 6. 저장소
   * ======================================================= */
  const store = {
    async get(key) {
      const read = async (k) => {
        try {
          const v = await R.pluginStorage.getItem(k);
          if (v == null) return null;
          return typeof v === 'string' ? JSON.parse(v) : v;
        } catch (e) { return null; }
      };
      const v = await read(key);
      if (v != null || !key.startsWith(KEY)) return v;
      return read(LEGACY + key.slice(KEY.length));
    },
    async set(key, val) {
      try { await R.pluginStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn(NAME + ': 저장 실패', e); }
    }
  };

  // 직접 추가한 이미지는 세이브 파일이 커지지 않도록 기기 로컬 저장소에 둠
  const imgStore = {
    mem: {},
    local: null,
    async ls() {
      if (this.local === null) {
        try { this.local = await R.getLocalPluginStorage(); } catch (e) { this.local = false; }
      }
      return this.local || null;
    },
    async get(id) {
      if (this.mem[id]) return this.mem[id];
      const ls = await this.ls();
      let v = null;
      for (const pre of [KEY, LEGACY]) {
        if (v) break;
        try { v = ls ? await ls.getItem(pre + 'img:' + id) : null; } catch (e) { v = null; }
        if (!v) { try { v = await R.pluginStorage.getItem(pre + 'img:' + id); } catch (e) { v = null; } }
      }
      if (v) this.mem[id] = v;
      return v;
    },
    async set(id, dataUrl) {
      this.mem[id] = dataUrl;
      const ls = await this.ls();
      try { if (ls) { await ls.setItem(KEY + 'img:' + id, dataUrl); return true; } } catch (e) { /* 아래로 */ }
      try { await R.pluginStorage.setItem(KEY + 'img:' + id, dataUrl); return true; } catch (e) { return false; }
    }
  };

  // 에셋 이름 색인
  const noExt = (x) => String(x).replace(/\.[^./]+$/, '');
  function buildAssetIndex(m) {
    const lower = {}, bare = {}, prefix = {};
    const addP = (k, name) => { if (k) (prefix[k] = prefix[k] || []).includes(name) || prefix[k].push(name); };
    for (const name of m.keys()) {
      const l = name.toLowerCase(), b = noExt(l);
      lower[l] = lower[l] || name;
      bare[b] = bare[b] || name;
      // yegor_confused_1 → yegor_confused, yegor 로도 찾을 수 있게
      for (let i = 1; i < b.length; i++) if (b[i] === '_' || b[i] === '-') addP(b.slice(0, i), name);
      const num = b.match(/^(.+?)[_-]?\d+$/);
      if (num) addP(num[1], name);
    }
    return { lower, bare, prefix };
  }
  function assetKeyOf(name, ix) {
    const n = String(name || '').trim().replace(/^\.?\//, '').replace(/^assets\//i, '');
    if (!n) return '';
    const l = n.toLowerCase(), b = noExt(l);
    return ix.lower[l] || ix.lower[b] || ix.bare[l] || ix.bare[b] || ((ix.prefix[l] || ix.prefix[b] || [])[0]) || '';
  }

  if (TEST) {
    globalThis.__LOGEDITORIAL__ = { buildAssetIndex, assetKeyOf, imageFromImgTag, cropRect, deriveTheme, contrast, THEME_ORDER, extractImages, parseMessage, renderDocument, splitParts, extractArcaUrls, makeZip, crc32, THEMES, blocksToEditable, blocksToText, visibleLength, applyReplacements };
    return;
  }
  if (!R) { console.error(NAME + ': RisuAI 플러그인 API를 찾지 못했습니다.'); return; }

  /* =========================================================
   * 7. 상태
   * ======================================================= */
  const DEFAULT_PREFS = {
    theme: 'sage', dlgStyle: 'marker', dropCap: true, toggle: 'first', mode: 'original', plateCaption: true,
    masthead: true, imageMode: 'url', maxW: 960, quality: 0.86, limit: 60000, thumbnail: true, includeGreeting: true,
    split: true, ui: 'auto', recentN: 30, font: 'serif', plateLabel: 'PLATE {n}', userStyle: 'none', hideUser: false, credit: true, otherImages: false, otherSize: 'mid', headings: 'sub',
    custom: { mat: '#e8e6df', sheet: '#fbfaf6', ink: '#2a2f2b', accent: '#5d7466', dlg: '', head: '', overrides: {} }, userThemes: []
  };
  const S = {
    ctx: null, messages: [], prefs: { ...DEFAULT_PREFS }, doc: null, docKey: '', loaded: false, lastGood: {}, srcInfo: {},
    tab: 'cover', part: 0, width: 'pc', parts: [], images: {}, cacheText: {}, busy: false
  };

  const newDoc = (ctx) => ({
    cover: {
      eyebrow: '{{char}} × {{user}}',
      title: '', subtitle: '', author: ctx.userName || '', chips: '', botUrl: '', botLabel: 'Open Bot',
      image: 'auto', imageUrl: '', mastLeft: 'THE ROLEPLAY LOG', mastRight: 'VOL. 01 · ' + new Date().toISOString().slice(0, 10).replace(/-/g, '.')
    },
    cast: {
      on: true, showUser: true,
      char: { name: ctx.charName || '', tags: '', desc: '', portrait: true },
      user: { name: ctx.userName || '', tags: '', desc: '', portrait: true },
      extra: []
    },
    range: { from: 1, to: 0 }, excluded: {}, chapters: {}, overrides: {}, urlMap: {}, partLinks: [], replacements: [], captions: {}
  });

  /* =========================================================
   * 8. 데이터 로드
   * ======================================================= */
  async function loadContext() {
    const charIdx = await R.getCurrentCharacterIndex();
    const chatIdx = await R.getCurrentChatIndex();
    if (charIdx == null || charIdx < 0 || chatIdx == null || chatIdx < 0) throw new Error('열린 채팅이 없습니다.');
    let char = null, chat = null;
    try { char = await R.getCharacter(); } catch (e) { /* 아래에서 재시도 */ }
    if (!char) { try { char = await R.getCharacterFromIndex(charIdx); } catch (e) { /* 무시 */ } }
    try { chat = await R.getChatFromIndex(charIdx, chatIdx); } catch (e) { /* 무시 */ }
    if (!chat && char && char.chats) chat = char.chats[chatIdx];
    if (!char || !chat) throw new Error('캐릭터 또는 채팅 데이터를 읽지 못했습니다.');
    let persona = null, db = null;
    try {
      db = await R.getDatabase(['personas', 'selectedPersona', 'modules', 'enabledModules', 'moduleIntergration']);
      const list = (db && db.personas) || [];
      persona = (chat.bindedPersona && list.find((p) => p.id === chat.bindedPersona)) || list[db && db.selectedPersona] || null;
    } catch (e) { /* 페르소나 없이 진행 */ }
    // 이미지 이름 → 파일: 캐릭터 에셋 > 감정 이미지 > 켜진 모듈 > 나머지 모듈 순으로 찾음
    const assets = new Map();
    const addAsset = (a) => { if (Array.isArray(a) && a[0] && !assets.has(String(a[0]))) assets.set(String(a[0]), { path: a[1], ext: a[2] || '' }); };
    (char.additionalAssets || []).forEach(addAsset);
    (char.emotionImages || []).forEach(addAsset);
    const mods = (db && Array.isArray(db.modules)) ? db.modules : [];
    const on = new Set([...(db && db.enabledModules) || [], ...(char.modules || []), ...(chat.modules || []),
      ...String((db && db.moduleIntergration) || '').split(',').map((x) => x.trim()).filter(Boolean)]);
    const isOn = (m) => m && (on.has(m.id) || (m.namespace && on.has(m.namespace)));
    mods.filter(isOn).forEach((m) => (m.assets || []).forEach(addAsset));
    mods.filter((m) => !isOn(m)).forEach((m) => (m.assets || []).forEach(addAsset));
    const msgs = [];
    const greetings = [char.firstMessage, ...(char.alternateGreetings || [])];
    const greet = greetings[chat.fmIndex >= 0 ? chat.fmIndex + 1 : 0] ?? char.firstMessage;
    if (greet) msgs.push({ key: 'greeting', role: 'char', raw: String(greet), greeting: true });
    (chat.message || []).forEach((m, i) => {
      msgs.push({ key: String(m.chatId || 'i' + i).replace(/[.\s]/g, '_'), role: m.role === 'user' ? 'user' : 'char', raw: String(m.data || '') });
    });
    return {
      charIdx, chatIdx, char, chat, persona, assets, assetIndex: buildAssetIndex(assets),
      charName: char.name || '', userName: (persona && persona.name) || '',
      charImage: char.image || '', userImage: (persona && persona.icon) || '',
      chatKey: KEY + 'doc:' + (char.chaId || charIdx) + ':' + (chat.id || chatIdx),
      messages: msgs
    };
  }

  async function loadTranslationCache() {
    S.cacheText = {};
    if (S.prefs.mode !== 'cache' || typeof R.getTranslationCache !== 'function') return;
    let i = 0;
    const list = rangeMessages();
    const worker = async () => {
      while (i < list.length) {
        const m = list[i++];
        const langs = splitLanguages(stripHidden(m.raw));
        const src = htmlToPlain(extractImages(langs ? langs.original : stripHidden(m.raw)).text).replace(/\u2063IMG\d+\u2063/g, '').trim();
        if (!src) continue;
        try {
          const v = await R.getTranslationCache(src);
          if (v) S.cacheText[m.key] = v;
        } catch (e) { /* 캐시 없음 */ }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  /* =========================================================
   * 9. 모델 구성 · 이미지 준비
   * ======================================================= */
  // 불러온 범위 (번호는 인사말 포함 전체 기준, 1부터)
  function rangeBounds() {
    const total = S.messages.length;
    const from = clamp(S.doc.range.from || 1, 1, Math.max(1, total));
    const to = S.doc.range.to > 0 ? clamp(S.doc.range.to, from, total) : total;
    return { from, to, total };
  }

  function rangeMessages() {
    if (!S.loaded) return [];
    const { from, to } = rangeBounds();
    return S.messages.slice(from - 1, to);
  }

  function selectedMessages() {
    return rangeMessages().filter((m) => !S.doc.excluded[m.key] && !(m.greeting && !S.prefs.includeGreeting) && !(S.prefs.hideUser && m.role === 'user'));
  }

  function parseOpts(m) {
    return {
      mode: S.prefs.mode, cacheText: S.cacheText[m.key], charName: S.ctx.charName, userName: S.ctx.userName,
      replacements: S.doc.replacements, override: S.doc.overrides[m.key], otherImages: !!S.prefs.otherImages
    };
  }

  // 같은 조건이면 다시 파싱하지 않음
  const parseCache = new Map();
  function parseCached(m) {
    const o = parseOpts(m);
    const sig = [o.otherImages ? 1 : 0, o.mode, o.cacheText || '', o.charName, o.userName, JSON.stringify(o.replacements || []), o.override == null ? '\u0000' : o.override].join('\u0001');
    const hit = parseCache.get(m.key);
    if (hit && hit.raw === m.raw && hit.sig === sig) return hit.parsed;
    const parsed = parseMessage(m.raw, o);
    parseCache.set(m.key, { raw: m.raw, sig, parsed });
    return parsed;
  }

  function buildModel() {
    const msgs = selectedMessages().map((m) => ({ key: m.key, role: m.role, parsed: parseCached(m) }));
    return { messages: msgs, chapters: S.doc.chapters };
  }

  // 출력에 쓰이는 이미지 키를 순서대로
  function usedImageKeys(model) {
    const keys = [];
    const add = (k) => { if (k && !keys.includes(k)) keys.push(k); };
    if (resolveCoverKey(model)) add('cover');
    if (S.doc.cast.on && S.doc.cast.char.portrait && (S.ctx.charImage || S.doc.cast.char.customId)) add('portrait:char');
    if (S.doc.cast.on && S.doc.cast.showUser && S.doc.cast.user.portrait && (S.ctx.userImage || S.doc.cast.user.customId)) add('portrait:user');
    if (S.doc.cast.on) for (const x of S.doc.cast.extra || []) if (x && x.portrait && (x.customId || x.asset) && (x.name || x.desc || x.tags)) add('portrait:' + x.id);
    for (const m of model.messages) for (const b of m.parsed.blocks) if (b.type === 'img') add(b.key);
    return keys;
  }

  function resolveCoverKey(model) {
    const c = S.doc.cover;
    if (c.image === 'none') return '';
    if (c.image === 'char') return S.ctx.charImage ? 'charimg' : '';
    if (c.image === 'url') return c.imageUrl ? 'url:' + c.imageUrl : '';
    if (c.image === 'custom') return c.customId ? 'custom:' + c.customId : '';
    for (const m of model.messages) for (const b of m.parsed.blocks) if (b.type === 'img') return b.key;
    return S.ctx.charImage ? 'charimg' : '';
  }

  function findAsset(name) {
    const m = S.ctx.assets, ix = S.ctx.assetIndex || buildAssetIndex(m);
    const key = assetKeyOf(name, ix);
    return key ? m.get(key) : null;
  }

  async function sourceBlob(key) {
    if (key.startsWith('asset:')) {
      const name = key.slice(6);
      const a = findAsset(name);
      return a ? readAssetByPath(a.path, mimeOfExt(a.ext)) : readAssetByPath(name, 'image/png');
    }
    if (key.startsWith('custom:')) {
      const d = await imgStore.get(key.slice(7));
      return d ? toBlob(d, 'image/webp') : null;
    }
    if (key === 'portrait:char' && S.doc.cast.char.customId) return sourceBlob('custom:' + S.doc.cast.char.customId);
    if (key === 'portrait:user' && S.doc.cast.user.customId) return sourceBlob('custom:' + S.doc.cast.user.customId);
    if (key.startsWith('portrait:x')) {
      const x = (S.doc.cast.extra || []).find((e) => 'portrait:' + e.id === key);
      if (!x) return null;
      if (x.customId) return sourceBlob('custom:' + x.customId);
      if (x.asset) return sourceBlob('asset:' + x.asset);
      return null;
    }
    if (key === 'charimg' || key === 'portrait:char') return readAssetByPath(S.ctx.charImage, 'image/png');
    if (key === 'portrait:user') return readAssetByPath(S.ctx.userImage, 'image/png');
    if (key.startsWith('inlay:')) {
      try { const r = await R.readInlay(key.slice(6)); return r ? toBlob(r.data, 'image/png') : null; } catch (e) { return null; }
    }
    if (key.startsWith('url:')) {
      const src = key.slice(4);
      if (/^data:/.test(src)) return toBlob(src, 'image/png');
      try {
        const res = await R.nativeFetch(src, { method: 'GET' });
        return res && res.ok ? await res.blob() : null;
      } catch (e) { return null; }
    }
    return null;
  }

  // 미리보기용 + 출력용 이미지를 키별로 캐시
  const COVER_RATIOS = { orig: 0, '3:2': 3 / 2, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '4:5': 4 / 5 };
  // 키에 해당하는 인물 설정 (char / user / 추가 인물)
  function castOf(key) {
    if (key === 'portrait:char') return S.doc.cast.char;
    if (key === 'portrait:user') return S.doc.cast.user;
    if (key.startsWith('portrait:x')) return (S.doc.cast.extra || []).find((e) => 'portrait:' + e.id === key) || null;
    return null;
  }
  // { aspect, crop } — 자르지 않으면 null
  function cropSpec(key) {
    if (key.startsWith('portrait:') && key !== 'portrait:char-full') {
      const p = castOf(key);
      return { aspect: 1, crop: { ...PORTRAIT_CROP, ...((p && p.crop) || {}) } };
    }
    if (key === 'cover') {
      const a = COVER_RATIOS[S.doc.cover.ratio || 'orig'];
      return a ? { aspect: a, crop: { x: 50, y: 50, zoom: 1, ...(S.doc.cover.crop || {}) } } : null;
    }
    return null;
  }

  async function ensureImage(key, coverKey) {
    const real = key === 'cover' ? coverKey : key;
    if (!real) return null;
    const ck = imgCk(key, real);
    if (S.images[ck]) return S.images[ck];
    const spec = cropSpec(key);
    const square = spec && spec.aspect === 1 && key.startsWith('portrait:') ? 256 : 0;
    const job = (async () => {
      const blob = await sourceBlob(real === 'charimg' && key === 'cover' ? 'charimg' : real);
      if (!blob) return { error: true };
      try {
        const out = await encodeImage(blob, { maxW: S.prefs.maxW, quality: S.prefs.quality, square, aspect: square ? 0 : (spec ? spec.aspect : 0), crop: spec ? spec.crop : null });
        S.lastGood[key] = out.dataUrl;
        return { ...out, real };
      } catch (e) {
        return { error: true };
      }
    })();
    S.images[ck] = job;
    const r = await job;
    S.images[ck] = r;
    return r;
  }

  function imgCk(key, real) {
    let extra = key === 'portrait:char' ? S.doc.cast.char.customId || '' : key === 'portrait:user' ? S.doc.cast.user.customId || '' : '';
    if (key.startsWith('portrait:x')) {
      const x = (S.doc.cast.extra || []).find((e) => 'portrait:' + e.id === key);
      extra = x ? (x.customId || '') + '/' + (x.asset || '') : '';
    }
    const spec = cropSpec(key);
    const c = spec ? [spec.aspect.toFixed(4), spec.crop.x, spec.crop.y, spec.crop.zoom].join(',') : '';
    return key + '|' + real + '|' + extra + '|' + c + '|' + S.prefs.maxW + '|' + S.prefs.quality;
  }

  // 원본 이미지 (위치 조정 미리보기용)
  async function loadSrcInfo(key, coverKey) {
    const real = key === 'cover' ? coverKey : key;
    if (!real) return null;
    const sig = imgCk(key, real).split('|').slice(0, 3).join('|');
    if (S.srcInfo[sig]) return S.srcInfo[sig];
    const job = (async () => {
      const blob = await sourceBlob(real);
      if (!blob) return null;
      try {
        const img = await blobToImage(blob);
        const cv = document.createElement('canvas');
        const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        return { url: cv.toDataURL('image/jpeg', 0.8), w: cv.width, h: cv.height };
      } catch (e) { return null; }
    })();
    S.srcInfo[sig] = job;
    S.srcInfo[sig] = await job;
    return S.srcInfo[sig];
  }

  const imgCacheGet = (key, coverKey) => {
    const real = key === 'cover' ? coverKey : key;
    const v = S.images[imgCk(key, real)];
    return v && !(v instanceof Promise) && !v.error ? v : null;
  };

  const urlKeyOf = (key, coverKey) => (key === 'cover' ? (coverKey === 'charimg' ? 'portrait:char-full' : coverKey) : key);
  const directUrl = (uk) => (uk && uk.startsWith('url:') && /^(https?:)?\/\//i.test(uk.slice(4)) ? uk.slice(4) : '');

  // 아카에 올려야 하는 이미지 목록 (같은 이미지는 한 번만, 이미 웹 주소인 것은 제외)
  function exportList(model, coverKey) {
    const seen = new Set(), list = [];
    for (const k of usedImageKeys(model)) {
      const uk = urlKeyOf(k, coverKey);
      if (seen.has(uk) || directUrl(uk)) continue;
      seen.add(uk);
      list.push({ key: k, uk });
    }
    return list;
  }

  /* =========================================================
   * 10. UI
   * ======================================================= */
  const CSS = `
  *{box-sizing:border-box}
  #fo{--focus:#c9a961;--hov:#7f9a8a;--bg:#111214;--bar:#16171a;--side:#141518;--panel:#1c1e22;--card:#17181b;--card2:#20232a;--field:#121316;
    --line:#26282c;--line2:#2e3136;--line3:#33363b;--tx:#e7e5e0;--tx2:#c9cbd0;--tx3:#9a9da3;--tx4:#6f7278;
    --stage:#0d0e10;--pri:#d8c69a;--onpri:#1a1a1a;--ok:#8fd1a8;--no:#e3b16b;--rc:#2b3a33;--rct:#a9d1bd;--ru:#2f3346;--rut:#b3bdf0;
    --barbg:#26292e;--barfg:#9fc3ad;--toast:#e7e5e0;--toastt:#111}
  #fo.light{--bg:#f5f5f7;--bar:#ffffff;--side:#f5f5f7;--panel:#ffffff;--card:#fafafa;--card2:#f2f2f4;--field:#ffffff;
    --line:#e5e5ea;--line2:#d9d9de;--line3:#cfcfd4;--tx:#1d1d1f;--tx2:#3a3a3c;--tx3:#6e6e73;--tx4:#a1a1a6;
    --stage:#ececef;--pri:#1d1d1f;--onpri:#ffffff;--ok:#248a3d;--no:#b25000;--rc:#efeff2;--rct:#3a3a3c;--ru:#e8eefb;--rut:#2c5bb8;
    --barbg:#e8e8ed;--barfg:#3a3a3c;--toast:#1d1d1f;--toastt:#fff;--focus:#2f6fde;--hov:#8e8e93}
  html,body{margin:0;height:100%;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif}
  #fo{position:fixed;inset:0;display:flex;flex-direction:column;background:var(--bg);color:var(--tx)}
  .fo-top{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--bar)}
  .fo-logo{font-family:${FONT};font-weight:700;font-size:16px;letter-spacing:.02em;margin-right:auto}
  .fo-logo small{font-family:inherit;font-weight:400;color:var(--tx3);font-size:11px;margin-left:6px}
  .fo-btn{appearance:none;border:1px solid var(--line3);background:var(--card);color:var(--tx);border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer;white-space:nowrap}
  .fo-btn:hover{border-color:var(--tx4)}
  .fo-btn.pri{background:var(--pri);border-color:var(--pri);color:var(--onpri);font-weight:600}
  .fo-btn.sm{padding:4px 9px;font-size:12px}
  .fo-btn:disabled{opacity:.4;cursor:default}
  .fo-main{flex:1;display:flex;min-height:0}
  .fo-side{width:400px;max-width:100%;display:flex;flex-direction:column;border-right:1px solid var(--line);background:var(--side);min-height:0}
  .fo-tabs{display:flex;flex-wrap:wrap;gap:2px;padding:10px 10px 0}
  .fo-tab{border:0;background:transparent;color:var(--tx3);padding:7px 8px;font-size:12.5px !important;border-radius:8px 8px 0 0;font:inherit;cursor:pointer}
  .fo-tab.on{background:var(--panel);color:var(--tx)}
  .fo-panel{flex:1;overflow:auto;padding:14px 14px 40px;background:var(--panel);margin:0 10px 10px;border-radius:0 10px 10px 10px}
  .fo-sec{margin:0 0 18px}
  .fo-sec h4{margin:0 0 8px;font-size:11px;letter-spacing:.14em;color:var(--tx3);font-weight:600}
  .fo-row{display:flex;gap:8px;align-items:center;margin:0 0 8px}
  .fo-row>label{flex:0 0 86px;color:var(--tx3)}
  .fo-in,.fo-sel,.fo-ta{flex:1;min-width:0;background:var(--field);border:1px solid var(--line2);color:var(--tx);border-radius:7px;padding:7px 9px;font:inherit}
  .fo-in.n{flex:0 0 76px}
  .fo-ta{min-height:70px;resize:vertical;width:100%}
  .fo-chk{display:flex;gap:7px;align-items:center;margin:0 0 7px;color:var(--tx2);cursor:pointer}
  .fo-hint{color:var(--tx3);font-size:11.5px;margin:2px 0 10px}
  .fo-warn{color:var(--no);font-size:12px;margin:6px 0}
  .fo-msg{border:1px solid var(--line);border-radius:9px;padding:8px 9px;margin:0 0 7px;background:var(--card)}
  .fo-msg.off{opacity:.45}
  .fo-msg-h{display:flex;gap:6px;align-items:center}
  .fo-role{font-size:10.5px;padding:1px 7px;border-radius:99px;background:var(--rc);color:var(--rct)}
  .fo-role.user{background:var(--ru);color:var(--rut)}
  .fo-idx{color:var(--tx4);font-size:11px}
  .fo-prev{color:var(--tx2);font-size:12px;margin:5px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .fo-chap{margin:8px 0 0;padding:8px;border-radius:7px;background:var(--card2);display:grid;gap:6px}
  .fo-view{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--stage)}
  .fo-vbar{display:flex;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--bar)}
  .fo-count{margin-left:auto;font-size:12px;color:var(--tx3)}
  .fo-count b{color:var(--tx)}
  .fo-count.over b{color:#e0603c}
  .fo-stage{flex:1;overflow:auto;padding:24px 12px 60px}
  .fo-frame{margin:0 auto;transition:width .2s}
  .fo-img{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:9px;padding:6px;margin:0 0 6px;background:var(--card)}
  .fo-img img{width:52px;height:52px;object-fit:cover;border-radius:6px;background:var(--line)}
  .fo-img .meta{flex:1;min-width:0}
  .fo-img .nm{font-size:11.5px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fo-ok{color:var(--ok)}.fo-no{color:var(--no)}
  .fo-part{border:1px solid var(--line);border-radius:9px;padding:9px;margin:0 0 8px;background:var(--card)}
  .fo-bar{height:5px;border-radius:9px;background:var(--barbg);overflow:hidden;margin:6px 0}
  .fo-bar i{display:block;height:100%;background:var(--barfg)}
  .fo-bar.over i{background:#e0603c}
  .fo-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9}
  .fo-box{background:var(--panel);color:var(--tx);border:1px solid var(--line3);border-radius:12px;width:min(720px,100%);max-height:90vh;display:flex;flex-direction:column;padding:14px;gap:10px}
  .fo-box.sm{width:min(440px,100%)}
  .fo-box .fo-ta{flex:1;min-height:320px}
  .fo-opt{display:flex;gap:10px;align-items:center;border:1px solid var(--line2);border-radius:9px;padding:10px 12px;cursor:pointer;background:var(--card)}
  .fo-opt:has(input:checked){border-color:var(--pri)}
  .fo-opt b{font-weight:600}
  .fo-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:var(--toast);color:var(--toastt);padding:8px 14px;border-radius:99px;font-weight:600;z-index:10}
  .fo-loading{padding:40px;text-align:center;color:var(--tx3)}
  .fo-sub{font-size:11px;color:var(--tx3);margin:10px 0 6px}
  .fo-sw-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  .fo-sw-wrap{position:relative;text-align:center}
  .fo-sw-wrap em{display:block;font-style:normal;font-size:11px;color:var(--tx2);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fo-sw{display:block;width:100%;aspect-ratio:4/3;border:2px solid transparent;border-radius:10px;padding:8px;cursor:pointer}
  .fo-sw.on{border-color:var(--pri)}
  .fo-sw span{display:flex;align-items:flex-end;justify-content:space-between;height:100%;border-radius:6px;padding:5px 6px;font-family:${FONT};font-weight:700;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .fo-sw i{display:block;width:12px;height:12px;border-radius:50%}
  .fo-sw-x{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:1px solid var(--line3);background:var(--panel);color:var(--tx3);font-size:10px;cursor:pointer;padding:0}
  .fo-color{flex:0 0 38px;height:32px;padding:2px;border:1px solid var(--line2);border-radius:7px;background:var(--field);cursor:pointer}
  .fo-adv summary{cursor:pointer;color:var(--tx3);font-size:12px;margin:6px 0}
  .fo-crop{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:6px 0 10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--card)}
  .fo-crop-view{flex:0 0 auto;width:96px;height:96px;background:var(--line) no-repeat;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
  .fo-crop-view[data-shape="circle"]{border-radius:50%}
  .fo-crop-view[data-shape="rect"]{border-radius:8px;max-width:100%}
  .fo-crop-view.empty{background:repeating-linear-gradient(45deg,var(--line) 0 6px,var(--card2) 6px 12px)}
  .fo-crop-sls{flex:1 1 190px;min-width:0}
  .fo-sl{margin:0 0 4px}
  .fo-sl>label{flex:0 0 34px !important}
  .fo-sl input[type=range]{flex:1;min-width:0;accent-color:var(--pri)}
  .fo-slv{flex:0 0 44px;text-align:right;font-size:11.5px;color:var(--tx3);font-variant-numeric:tabular-nums}
  .fo-in.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
  .fo-rep{border:1px solid var(--line);border-radius:9px;padding:8px 8px 2px;margin:0 0 8px;background:var(--card)}
  #fo-frame.editing [data-fo]{outline:1px dashed rgba(127,140,133,.55);outline-offset:4px;border-radius:2px;cursor:text}
  #fo-frame.editing [data-fo]:hover{outline-color:var(--hov)}
  #fo-frame.editing [data-fo]:focus{outline:2px solid var(--focus);outline-offset:4px}
  @media (max-width:820px){
    .fo-main{flex-direction:column}
    .fo-side{width:100%;height:52%;border-right:0;border-bottom:1px solid var(--line)}
    .fo-view{height:48%}
  }`;

  let root = null;
  const $ = (sel) => root.querySelector(sel);

  function toast(msg) {
    const d = document.createElement('div');
    d.className = 'fo-toast';
    d.textContent = msg;
    (root || document.body).appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }

  function field(label, path, ph = '', type = 'text') {
    const v = getPath(S, path);
    return `<div class="fo-row"><label>${esc(label)}</label><input class="fo-in" type="${type}" data-bind="${path}" value="${esc(v ?? '')}" placeholder="${esc(ph)}"></div>`;
  }
  function check(label, path) {
    return `<label class="fo-chk"><input type="checkbox" data-bind="${path}" ${getPath(S, path) ? 'checked' : ''}> ${esc(label)}</label>`;
  }
  function select(label, path, options) {
    const v = getPath(S, path);
    return `<div class="fo-row"><label>${esc(label)}</label><select class="fo-sel" data-bind="${path}">${options.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  }
  function area(label, path, ph = '') {
    return `<div class="fo-sec"><h4>${esc(label)}</h4><textarea class="fo-ta" data-bind="${path}" placeholder="${esc(ph)}">${esc(getPath(S, path) || '')}</textarea></div>`;
  }

  const TABS = [['cover', '표지'], ['cast', '등장인물'], ['chapters', '본문·챕터'], ['style', '스타일'], ['images', '삽화'], ['export', '내보내기']];

  function panelHtml() {
    const d = 'doc', p = 'prefs';
    switch (S.tab) {
      case 'cover': return `
        <div class="fo-sec"><h4>표지</h4>
        ${field('라벨', d + '.cover.eyebrow', '{{char}} × {{user}}')}
        ${field('제목', d + '.cover.title', 'A Day at the Orphanage School')}
        ${field('부제', d + '.cover.subtitle', '고아원 학교에서의 하루')}
        ${field('작성자', d + '.cover.author')}
        ${field('칩', d + '.cover.chips', '모델, 프롬프트 (쉼표로 구분)')}
        ${field('봇 링크', d + '.cover.botUrl', 'https://arca.live/b/characterai/...')}
        ${field('링크 문구', d + '.cover.botLabel', 'Open Bot')}
        <div class="fo-hint">{{char}}, {{user}}는 등장인물 탭의 이름으로 바뀌어요. 제목·부제에도 쓸 수 있어요.</div>
        ${check('맨 아래 "Made with Log Editorial" 표시', 'prefs.credit')}
        </div>
        <div class="fo-sec"><h4>표지 이미지</h4>
        ${select('이미지', d + '.cover.image', [['auto', '첫 삽화 (없으면 캐릭터 이미지)'], ['char', '캐릭터 이미지'], ['custom', '직접 올린 이미지'], ['url', '이미지 주소'], ['none', '없음']])}
        ${S.doc.cover.image === 'url' ? field('주소', d + '.cover.imageUrl', 'https://...') : ''}
        ${S.doc.cover.image !== 'none' ? select('비율', d + '.cover.ratio', [['orig', '원본 비율 (자르지 않음)'], ['3:2', '3:2 가로'], ['16:9', '16:9 와이드'], ['4:3', '4:3'], ['1:1', '1:1 정사각형'], ['4:5', '4:5 세로']]) : ''}
        ${S.doc.cover.image !== 'none' && (S.doc.cover.ratio || 'orig') !== 'orig' ? cropControls(d + '.cover.crop', 'cover', 'rect') : ''}
        ${S.doc.cover.image === 'custom' ? `<div class="fo-row"><button class="fo-btn sm" data-act="up-cover">${S.doc.cover.customId ? '다른 이미지로 바꾸기' : '이미지 올리기'}</button>${S.doc.cover.customId ? '<span class="fo-ok">● 올림</span>' : ''}</div>` : ''}
        </div>
        <div class="fo-sec"><h4>마스트헤드</h4>
        ${check('맨 위 머리글 표시', p + '.masthead')}
        ${field('왼쪽', d + '.cover.mastLeft')}
        ${field('오른쪽', d + '.cover.mastRight')}
        </div>`;
      case 'cast': return `
        <div class="fo-sec">${check('등장인물 섹션 표시', d + '.cast.on')}${check('유저 표시', d + '.cast.showUser')}</div>
        <div class="fo-sec"><h4>캐릭터</h4>
        ${field('이름', d + '.cast.char.name')}${field('태그', d + '.cast.char.tags', '쉼표로 구분')}
        ${area('소개', d + '.cast.char.desc', '두 줄 정도의 짧은 소개')}${check('초상 표시', d + '.cast.char.portrait')}${portraitBtns('char', '캐릭터 아이콘')}${S.doc.cast.char.portrait ? cropControls(d + '.cast.char.crop', 'portrait:char', 'circle') : ''}</div>
        <div class="fo-sec"><h4>유저</h4>
        ${field('이름', d + '.cast.user.name')}${field('태그', d + '.cast.user.tags', '쉼표로 구분')}
        ${area('소개', d + '.cast.user.desc')}${check('초상 표시', d + '.cast.user.portrait')}${portraitBtns('user', '페르소나 이미지')}${S.doc.cast.user.portrait ? cropControls(d + '.cast.user.crop', 'portrait:user', 'circle') : ''}</div>
        ${extraCastHtml()}`;
      case 'chapters': return chaptersHtml();
      case 'style': return `
        ${themeHtml()}
        <div class="fo-sec"><h4>글자</h4>
        ${select('서체', p + '.font', Object.entries(FONT_MODES))}
        ${S.prefs.font !== 'serif' ? '<div class="fo-hint">프리텐다드는 읽는 사람 기기에 없으면 기본 고딕체로 보여요.</div>' : ''}
        ${select('본문 속 #제목', p + '.headings', [['sub', '소제목으로 표시'], ['hide', '숨기기']])}
        ${select('대사 표시', p + '.dlgStyle', [['marker', '형광펜 밑줄'], ['color', '글자색만'], ['tint', '옅은 하이라이트']])}
        ${check('챕터 첫 글자 크게 (드롭캡)', p + '.dropCap')}
        </div>
        <div class="fo-sec"><h4>유저 · 캐릭터 구분</h4>
        ${select('유저 메시지', p + '.userStyle', [['none', '같게 (구분 없음)'], ['block', '카드 · 옅은 바탕에 이름표'], ['muted', '흐리게 · 한 톤 낮추고 들여쓰기'], ['label', '이름표 · 말하는 쪽이 바뀔 때마다']])}
        ${check('유저 메시지 모두 빼기', p + '.hideUser')}
        <div class="fo-hint">이름표에는 등장인물 탭의 이름이 쓰여요.</div>
        </div>
        <div class="fo-sec"><h4>본문</h4>
        ${select('챕터 접기', p + '.toggle', [['first', '토글 · 첫 챕터만 펼침'], ['all', '토글 · 모두 펼침'], ['none', '토글 · 모두 접힘'], ['off', '토글 끄기']])}
        </div>
        <div class="fo-sec"><h4>번역</h4>
        ${select('본문 언어', p + '.mode', [['original', '원문'], ['gigatrans', '번역문 (GigaTrans)'], ['cache', '번역 캐시 (실험적)']])}
        ${check('첫 인사말 포함', p + '.includeGreeting')}
        </div>
        <div class="fo-sec"><h4>텍스트 치환</h4>
        ${(S.doc.replacements || []).map((r, i) => {
          const bad = r.regex && r.from && !compileRegex(r);
          return `<div class="fo-rep"><div class="fo-row"><input class="fo-in${r.regex ? ' mono' : ''}" data-bind="doc.replacements.${i}.from" value="${esc(r.from)}" placeholder="${r.regex ? '정규식 (예: \\((.+?)\\))' : '찾을 말'}"><input class="fo-in" data-bind="doc.replacements.${i}.to" value="${esc(r.to)}" placeholder="${r.regex ? '바꿀 말 ($1 사용 가능)' : '바꿀 말'}"><button class="fo-btn sm" data-act="rep-del" data-i="${i}">✕</button></div>
            <div class="fo-row" style="margin-top:-2px"><label class="fo-chk" style="margin:0"><input type="checkbox" data-bind="doc.replacements.${i}.regex" ${r.regex ? 'checked' : ''}> 정규식</label>
            ${r.regex ? `<span class="fo-idx" style="white-space:nowrap">플래그</span><input class="fo-in n mono" data-bind="doc.replacements.${i}.flags" value="${esc(r.flags == null ? 'g' : r.flags)}" placeholder="g">` : ''}
            ${bad ? '<span class="fo-warn" style="margin:0">잘못된 정규식이라 건너뛰어요</span>' : ''}</div></div>`;
        }).join('')}
        <button class="fo-btn sm" data-act="rep-add">+ 치환 추가</button>
        <div class="fo-hint">정규식은 메시지 본문 전체에 적용돼요. 줄마다 ^ $를 쓰려면 플래그에 m을 더하세요. 직접 편집한 메시지에는 치환이 다시 적용되지 않아요.</div></div>`;
      case 'images': return imagesHtml();
      case 'export': return exportHtml();
    }
    return '';
  }

  function swatch(key, t, on, del) {
    return `<div class="fo-sw-wrap"><button class="fo-sw ${on ? 'on' : ''}" data-theme="${esc(key)}" title="${esc(t.label)}" style="background:${t.mat}"><span style="background:${t.sheet};color:${t.head}"><i style="background:${t.accent}"></i>가</span></button><em>${esc(t.label)}</em>${del ? `<button class="fo-sw-x" data-utdel="${esc(del)}" title="삭제">✕</button>` : ''}</div>`;
  }

  function colorRow(label, path, auto) {
    const v = getPath(S, path) || '';
    const shown = hx(v) ? toHex(hx(v)) : (auto || '#000000');
    return `<div class="fo-row"><label>${esc(label)}</label><input type="color" class="fo-color" data-bind="${path}" value="${shown}"><input class="fo-in mono" data-bind="${path}" value="${esc(v)}" placeholder="${auto ? '자동 ' + auto : '#000000'}"></div>`;
  }

  function themeHtml() {
    const th = S.prefs.theme;
    const light = THEME_ORDER.filter((k) => !THEMES[k].dark), dark = THEME_ORDER.filter((k) => THEMES[k].dark);
    let h = `<div class="fo-sec"><h4>색 테마</h4>
      <div class="fo-sub">밝은 테마</div><div class="fo-sw-grid">${light.map((k) => swatch(k, THEMES[k], th === k)).join('')}</div>
      <div class="fo-sub">어두운 테마</div><div class="fo-sw-grid">${dark.map((k) => swatch(k, THEMES[k], th === k)).join('')}</div>`;
    const users = S.prefs.userThemes || [];
    if (users.length) h += `<div class="fo-sub">내 테마</div><div class="fo-sw-grid">${users.map((u) => swatch('u:' + u.id, deriveTheme(u.base, u.label), th === 'u:' + u.id, u.id)).join('')}</div>`;
    h += `<div class="fo-row" style="margin-top:10px"><button class="fo-btn ${th === 'custom' ? 'pri' : ''}" data-act="theme-custom">${th === 'custom' ? '직접 만드는 중' : '지금 테마에서 직접 만들기'}</button></div>`;
    if (th === 'custom') {
      const t = deriveTheme(S.prefs.custom, '');
      const c = 'prefs.custom';
      const low = contrast(t.ink, t.sheet) < 4.5;
      h += `<div class="fo-rep" style="padding:10px">
        ${colorRow('바깥 배경', c + '.mat')}${colorRow('종이', c + '.sheet')}${colorRow('본문 글자', c + '.ink')}${colorRow('포인트', c + '.accent')}
        ${colorRow('대사 글자', c + '.dlg', t.dlg)}${colorRow('제목 글자', c + '.head', t.head)}
        ${low ? '<div class="fo-warn">본문 글자와 종이 색의 대비가 낮아서 읽기 어려울 수 있어요.</div>' : ''}
        <details class="fo-adv"><summary>세부 색상 조정</summary><div class="fo-hint">비워 두면 기본 색에 맞춰 자동으로 계산돼요.</div>
        ${Object.entries(TOKEN_LABELS).filter(([k]) => k !== 'head').map(([k, l]) => colorRow(l, c + '.overrides.' + k, deriveTheme({ ...S.prefs.custom, overrides: {} }, '')[k])).join('')}</details>
        <div class="fo-row" style="margin-top:8px"><input class="fo-in" id="fo-tname" placeholder="테마 이름"><button class="fo-btn sm pri" data-act="theme-save">내 테마로 저장</button></div></div>`;
    }
    return h + '</div>';
  }

  function castSlotsLeft() {
    const c = S.doc.cast;
    return CAST_MAX - 1 - (c.showUser ? 1 : 0) - (c.extra || []).length;
  }

  function extraCastHtml() {
    const ex = S.doc.cast.extra || [];
    const assets = [...S.ctx.assets.keys()].filter((n) => !/\.__am__\./.test(n)).slice(0, 300);
    let h = '';
    ex.forEach((x, i) => {
      const b = `doc.cast.extra.${i}`;
      h += `<div class="fo-sec fo-rep" style="padding:10px"><div class="fo-msg-h" style="margin:0 0 8px"><b>추가 인물 ${i + 1}</b>
        <button class="fo-btn sm" data-act="cast-up" data-i="${i}" style="margin-left:auto" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="fo-btn sm" data-act="cast-down" data-i="${i}" ${i === ex.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="fo-btn sm" data-act="cast-del" data-i="${i}">삭제</button></div>
        ${field('이름', b + '.name')}${field('역할 라벨', b + '.role', 'CAST')}${field('태그', b + '.tags', '쉼표로 구분')}
        ${area('소개', b + '.desc')}${check('초상 표시', b + '.portrait')}
        ${assets.length ? select('에셋에서', b + '.asset', [['', '— 고르지 않음 —'], ...assets.map((n) => [n, n])]) : ''}
        <div class="fo-row"><span class="fo-idx" style="flex:1">${x.customId ? '직접 올린 이미지 사용 중' : x.asset ? '에셋 이미지 사용 중' : '초상 이미지 없음'}</span><button class="fo-btn sm" data-act="up-x" data-i="${i}">이미지 올리기</button>${x.customId ? `<button class="fo-btn sm" data-act="reset-x" data-i="${i}">올린 이미지 지우기</button>` : ''}</div>${x.portrait && (x.customId || x.asset) ? cropControls(b + '.crop', 'portrait:' + x.id, 'circle') : ''}</div>`;
    });
    const left = castSlotsLeft();
    h += `<div class="fo-sec"><button class="fo-btn" data-act="cast-add" ${left <= 0 ? 'disabled' : ''}>+ 등장인물 추가</button>
      <div class="fo-hint">캐릭터·유저 포함 최대 ${CAST_MAX}명. ${left > 0 ? left + '명 더 추가할 수 있어요.' : '자리가 다 찼어요.'} 3명 이상이면 세 칸 배치로 바뀌어요.</div></div>`;
    return h;
  }

  // 위치 조정: X · Y · 줌 슬라이더와 바로 보이는 미리보기
  function cropControls(base, key, shape) {
    const c = { ...(key === 'cover' ? { x: 50, y: 50, zoom: 1 } : PORTRAIT_CROP), ...(getPath(S, base) || {}) };
    const sl = (label, k, min, max, step, unit) => `<div class="fo-row fo-sl"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${c[k]}" data-bind="${base}.${k}" data-crop="${esc(key)}"><span class="fo-slv">${k === 'zoom' ? Number(c[k]).toFixed(2) + '×' : Math.round(c[k]) + unit}</span></div>`;
    return `<div class="fo-crop"><div class="fo-crop-view" data-cropview="${esc(key)}" data-shape="${shape}"></div><div class="fo-crop-sls">
      ${sl('가로', 'x', 0, 100, 1, '%')}${sl('세로', 'y', 0, 100, 1, '%')}${sl('줌', 'zoom', 1, 4, 0.05, '')}
      <button class="fo-btn sm" data-cropreset="${esc(base)}">위치 초기화</button></div></div>`;
  }

  async function paintCropView(el) {
    const key = el.dataset.cropview;
    const model = buildModel();
    const info = await loadSrcInfo(key, resolveCoverKey(model));
    if (!el.isConnected) return;
    if (!info) { el.style.backgroundImage = ''; el.classList.add('empty'); return; }
    el.classList.remove('empty');
    const spec = cropSpec(key) || { aspect: info.w / info.h, crop: { x: 50, y: 50, zoom: 1 } };
    const D = el.dataset.shape === 'circle' ? 96 : 240;
    const W = D, H = Math.round(D / spec.aspect);
    el.style.width = W + 'px'; el.style.height = H + 'px';
    const r = cropRect(info.w, info.h, spec.aspect, spec.crop);
    const k = W / r.sw;
    el.style.backgroundImage = `url("${info.url}")`;
    el.style.backgroundSize = `${info.w * k}px ${info.h * k}px`;
    el.style.backgroundPosition = `${-r.sx * k}px ${-r.sy * k}px`;
  }

  function paintCropViews() {
    if (!root) return;
    root.querySelectorAll('[data-cropview]').forEach((el) => { paintCropView(el); });
  }

  function portraitBtns(who, def) {
    const id = S.doc.cast[who].customId;
    return `<div class="fo-row"><span class="fo-idx" style="flex:1">${id ? '직접 올린 이미지 사용 중' : '기본: ' + def}</span><button class="fo-btn sm" data-act="up-${who}">초상 바꾸기</button>${id ? `<button class="fo-btn sm" data-act="reset-${who}">기본으로</button>` : ''}</div>`;
  }

  function chaptersHtml() {
    const { from, to, total } = rangeBounds();
    const list = rangeMessages();
    let h = `<div class="fo-sec"><h4>불러온 범위</h4>
      <div class="fo-row"><span style="flex:1">#${from} ~ #${to} <span class="fo-idx">(${list.length}개 / 전체 ${total}개)</span></span><button class="fo-btn sm" data-act="range">범위 바꾸기</button></div></div>
      <div class="fo-sec"><h4>메시지</h4><div class="fo-hint">'챕터 시작'을 켜면 그 메시지부터 새 챕터가 됩니다. 명대사는 챕터 끝에 인용 카드로 들어가요.</div>`;
    list.forEach((m, i) => {
      const n = from + i;
      const off = S.doc.excluded[m.key] || (m.greeting && !S.prefs.includeGreeting);
      const ch = S.doc.chapters[m.key] || {};
      const prev = htmlToPlain(extractImages(stripHidden(m.raw)).text).replace(/\u2063IMG\d+\u2063/g, ' [삽화] ').replace(/<\/?GigaTrans>/gi, '').replace(/\s+/g, ' ').trim().slice(0, 120);
      h += `<div class="fo-msg ${off ? 'off' : ''}"><div class="fo-msg-h">
        <input type="checkbox" data-ex="${esc(m.key)}" ${S.doc.excluded[m.key] ? '' : 'checked'} title="포함">
        <span class="fo-idx">#${n}</span><span class="fo-role ${m.role}">${m.greeting ? '인사말' : m.role === 'user' ? '유저' : '캐릭터'}</span>
        <label class="fo-chk" style="margin:0 0 0 auto"><input type="checkbox" data-chap="${esc(m.key)}" ${ch.on ? 'checked' : ''}> 챕터 시작</label>
        <button class="fo-btn sm" data-addimg="${esc(m.key)}" title="이 메시지에 이미지 추가">＋이미지</button>
        <button class="fo-btn sm" data-edit="${esc(m.key)}">${S.doc.overrides[m.key] != null ? '수정됨' : '편집'}</button></div>
        <div class="fo-prev">${esc(prev || '(빈 메시지)')}</div>
        ${ch.on ? `<div class="fo-chap">
          <input class="fo-in" data-bind="doc.chapters.${esc(m.key)}.title" value="${esc(ch.title || '')}" placeholder="챕터 제목">
          <input class="fo-in" data-bind="doc.chapters.${esc(m.key)}.sub" value="${esc(ch.sub || '')}" placeholder="부제 (선택)">
          <input class="fo-in" data-bind="doc.chapters.${esc(m.key)}.quote" value="${esc(ch.quote || '')}" placeholder="명대사 (선택, 챕터 끝에 표시)">
          <input class="fo-in" data-bind="doc.chapters.${esc(m.key)}.who" value="${esc(ch.who || '')}" placeholder="명대사 화자 (선택)">
        </div>` : ''}</div>`;
    });
    return h + '</div>';
  }

  function imagesHtml() {
    const model = buildModel();
    const coverKey = resolveCoverKey(model);
    const list = exportList(model, coverKey);
    const keys = list.map((x) => x.key);
    const map = S.doc.urlMap;
    const missing = list.filter((x) => !map[x.uk]).length;
    let hiddenN = 0;
    for (const m of selectedMessages()) hiddenN += parseCached(m).hidden || 0;
    let h = `<div class="fo-sec"><h4>넣을 이미지</h4>
      ${check('에셋메이드 외 이미지도 표시', 'prefs.otherImages')}
      <div class="fo-hint">캐릭터 에셋·감정 이미지({{img::}} {{emotion::}} 등), 메시지 속 일반 이미지, 채팅에 첨부한 이미지예요. 끄면 에셋메이드 삽화와 직접 추가한 이미지만 들어가요.</div>
      ${S.prefs.otherImages ? select('크기', 'prefs.otherSize', [['small', '작게 (높이 200px까지)'], ['mid', '중간 (높이 320px까지)'], ['full', '삽화처럼 본문 폭에 맞춤']]) + '<div class="fo-hint">작게·중간은 원래 크기를 넘겨 키우지 않고, 삽화 번호도 매기지 않아요.</div>' : ''}
      ${!S.prefs.otherImages && hiddenN ? `<div class="fo-warn">지금 범위에서 ${hiddenN}장이 숨겨져 있어요.</div>` : ''}
      </div>
      <div class="fo-sec"><h4>이미지 품질</h4>
      <div class="fo-hint">리치 복사는 이미지를 함께 복사해서 아카가 자동으로 업로드해요. 따로 연결할 필요 없어요.</div>
      ${field('최대 폭(px)', 'prefs.maxW', '960', 'number')}
      ${select('화질', 'prefs.quality', [['0.8', '보통 (가벼움)'], ['0.86', '좋음'], ['0.92', '아주 좋음 (무거움)']])}
      ${check('삽화 아래 캡션 표시', 'prefs.plateCaption')}
      ${S.prefs.plateCaption ? field('캡션 문구', 'prefs.plateLabel', 'PLATE {n}') + '<div class="fo-hint">{n} 자리에 01, 02… 번호가 들어가요 ({i}는 1, 2…). 삽화마다 따로 쓰려면 아래 목록에서 바꿀 수 있어요.</div>' : ''}
      </div>
      <div class="fo-sec"><h4>소스 복사용 이미지</h4>
      ${select('이미지', 'prefs.imageMode', [['url', '아카 업로드 주소로 연결'], ['data', '이미지를 본문에 직접 포함']])}
      ${S.prefs.imageMode === 'data' ? '<div class="fo-warn">아카 에디터가 본문 포함 이미지를 차단하거나 용량 제한에 걸릴 수 있어요.</div>' : ''}
      ${check('글 목록 썸네일용 숨김 이미지', 'prefs.thumbnail')}
      </div>`;
    if (S.prefs.imageMode === 'url') {
      h += `<div class="fo-sec"><h4>아카 업로드 연결 (소스 복사용)</h4>
        <div class="fo-hint">① 이미지를 번호순 ZIP으로 받고 ② 아카 글쓰기에 번호순으로 올린 뒤 ③ 코드보기 내용을 통째로 아래에 붙여넣으면 순서대로 연결돼요.</div>
        <div class="fo-row"><button class="fo-btn" data-act="zip">① 이미지 ZIP 받기 (${keys.length}장)</button></div>
        <textarea class="fo-ta" id="fo-urlpaste" placeholder="③ 아카 코드보기 HTML 또는 이미지 주소 목록"></textarea>
        <div class="fo-row" style="margin-top:8px"><button class="fo-btn pri" data-act="urlmatch">순서대로 연결</button>
        <span class="fo-hint" style="margin:0">${missing ? `연결 안 됨 ${missing}장` : '모두 연결됨'}</span></div></div>`;
    }
    h += `<div class="fo-sec"><h4>사용되는 이미지</h4>`;
    keys.forEach((k, i) => {
      const prev = imgCacheGet(k, coverKey);
      const st = S.images[imgCk(k, k === 'cover' ? coverKey : k)];
      const missing = st && !(st instanceof Promise) && st.error;
      const uk = urlKeyOf(k, coverKey);
      const label = k === 'cover' ? '표지' : k === 'portrait:char' ? '캐릭터 초상' : k === 'portrait:user' ? '유저 초상' : '삽화';
      h += `<div class="fo-img"><img src="${prev ? prev.dataUrl : ''}" alt=""><div class="meta"><div><b>${pad2(i + 1)}</b> ${label} ${missing ? '<span class="fo-no">● 파일을 찾지 못함</span>' : ''} ${S.prefs.imageMode === 'url' ? (map[uk] ? '<span class="fo-ok">● 연결됨</span>' : '<span class="fo-no">● 미연결</span>') : ''}</div>
        <div class="nm">${esc(k === 'cover' ? coverKey : k)}</div>
        ${S.prefs.imageMode === 'url' ? `<input class="fo-in" data-url="${esc(uk)}" value="${esc(map[uk] || '')}" placeholder="아카 이미지 주소" style="width:100%;margin-top:4px">` : ''}</div></div>`;
    });
    if (!keys.length) h += '<div class="fo-hint">선택한 범위에 이미지가 없어요.</div>';
    h += '</div>';
    if (S.prefs.plateCaption) {
      const plates = [];
      for (const m of model.messages) for (const b of m.parsed.blocks) if (b.type === 'img') plates.push(b.key);
      if (plates.length) {
        h += '<div class="fo-sec"><h4>삽화별 캡션</h4><div class="fo-hint">비워 두면 위의 캡션 문구를 따라가요.</div>';
        const o = { plateLabel: S.prefs.plateLabel, captions: {} };
        plates.forEach((k, i) => {
          const prev = imgCacheGet(k, coverKey);
          h += `<div class="fo-img"><img src="${prev ? prev.dataUrl : ''}" alt=""><div class="meta"><input class="fo-in" data-cap="${esc(k)}" value="${esc((S.doc.captions || {})[k] || '')}" placeholder="${esc(plateCaption(o, k, i + 1) || '(캡션 없음)')}" style="width:100%"></div></div>`;
        });
        h += '</div>';
      }
    }
    return h;
  }

  function exportHtml() {
    const lim = S.prefs.split ? Number(S.prefs.limit) || 60000 : 70000;
    let h = `<div class="fo-sec"><h4>분할</h4>
      ${check('글자수가 넘으면 자동으로 나누기', 'prefs.split')}
      ${S.prefs.split ? field('편당 글자수', 'prefs.limit', '60000', 'number') : ''}
      <div class="fo-hint">아카는 보이는 글자가 약 70,000자를 넘으면 올라가지 않을 수 있어요. ${S.prefs.split ? '여유를 두고 60,000자를 권장해요.' : '분할을 끄면 길이와 상관없이 한 편으로 출력해요.'}</div></div>
      <div class="fo-sec"><h4>편별 출력</h4>`;
    if (!S.prefs.split && S.parts[0] && S.parts[0].chars > 70000) {
      h += `<div class="fo-warn">한 편이 ${S.parts[0].chars.toLocaleString()}자예요. 아카에 올라가지 않을 수 있어요.</div>`;
    }
    S.parts.forEach((pt, i) => {
      const over = pt.chars > lim;
      h += `<div class="fo-part"><div class="fo-msg-h"><b>Part ${i + 1}</b><span class="fo-idx" style="margin-left:auto">${pt.chars.toLocaleString()} / ${Number(lim).toLocaleString()}자</span></div>
        <div class="fo-bar ${over ? 'over' : ''}"><i style="width:${clamp(pt.chars / lim * 100, 2, 100)}%"></i></div>
        <div class="fo-row"><button class="fo-btn pri sm" data-copy="${i}">리치 복사</button><button class="fo-btn sm" data-src="${i}">소스 복사</button><button class="fo-btn sm" data-save="${i}">HTML 저장</button></div>
        ${S.parts.length > 1 ? `<input class="fo-in" data-bind="doc.partLinks.${i}" value="${esc(S.doc.partLinks[i] || '')}" placeholder="올린 뒤 이 편의 글 주소 (이전/다음 링크용)" style="width:100%">` : ''}</div>`;
    });
    if (S.parts.length > 1) h += '<div class="fo-hint">먼저 링크 없이 순서대로 올리고, 글 주소를 채운 뒤 다시 복사해서 각 글을 수정하면 편끼리 연결돼요.</div>';
    let missing = 0;
    if (S.prefs.imageMode === 'url') {
      const model = buildModel();
      missing = exportList(model, resolveCoverKey(model)).filter((x) => !S.doc.urlMap[x.uk]).length;
    }
    h += `<div class="fo-hint"><b>리치 복사</b> (추천): 아카 글쓰기 일반 모드에 그대로 붙여넣으면 사진이 자동으로 업로드돼요. 챕터 토글은 펼친 상태로 들어가요.</div>
      <div class="fo-hint"><b>소스 복사</b>: 코드보기(HTML) 모드에 붙여넣는 방식이에요. 토글 설정이 그대로 유지되지만, 사진은 삽화 탭에서 아카 주소를 연결해야 해요.</div>`;
    if (missing) h += `<div class="fo-warn">소스 복사 시 아카 주소가 연결되지 않은 이미지 ${missing}장은 빠집니다.</div>`;
    return h + '</div>';
  }

  function shellHtml() {
    return `<div id="fo">
      <div class="fo-top"><div class="fo-logo">Log Editorial<small>${VERSION}</small></div>
        <button class="fo-btn" data-act="ui" id="fo-ui">화면: 자동</button>
        <button class="fo-btn" data-act="reload">새로 불러오기</button>
        <button class="fo-btn" data-act="close">닫기</button></div>
      <div class="fo-main">
        <div class="fo-side"><div class="fo-tabs">${TABS.map(([k, l]) => `<button class="fo-tab" data-tab="${k}">${l}</button>`).join('')}</div><div class="fo-panel" id="fo-panel"></div></div>
        <div class="fo-view"><div class="fo-vbar" id="fo-vbar"></div><div class="fo-stage"><div class="fo-frame" id="fo-frame"><div class="fo-loading">불러오는 중…</div></div></div></div>
      </div></div>`;
  }

  function renderPanel() {
    root.querySelectorAll('.fo-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
    const panel = $('#fo-panel');
    const top = panel.scrollTop;
    panel.innerHTML = panelHtml();
    panel.scrollTop = top;
    paintCropViews();
  }

  function renderViewBar() {
    const pt = S.parts[S.part];
    const over = pt && pt.chars > (S.prefs.split ? S.prefs.limit : 70000);
    $('#fo-vbar').innerHTML =
      S.parts.map((_, i) => `<button class="fo-btn sm ${i === S.part ? 'pri' : ''}" data-part="${i}">Part ${i + 1}</button>`).join('')
      + `<button class="fo-btn sm ${S.width === 'pc' ? 'pri' : ''}" data-width="pc">PC</button><button class="fo-btn sm ${S.width === 'mobile' ? 'pri' : ''}" data-width="mobile">모바일</button>`
      + `<button class="fo-btn sm ${S.editing ? 'pri' : ''}" data-act="editmode">✎ 직접 편집${S.editing ? ' 중' : ''}</button>`
      + (S.editing ? '<span class="fo-idx">고칠 곳을 눌러 수정 · 밖을 누르면 저장 · Esc 취소</span>' : '')
      + (pt ? `<span class="fo-count ${over ? 'over' : ''}"><b>${pt.chars.toLocaleString()}</b>자</span>` : '');
  }

  function resolveTheme() {
    const th = S.prefs.theme;
    if (th === 'custom') return deriveTheme(S.prefs.custom || {}, '직접 만들기');
    if (String(th).startsWith('u:')) {
      const u = (S.prefs.userThemes || []).find((x) => 'u:' + x.id === th);
      if (u) return deriveTheme(u.base, u.label);
    }
    return THEMES[th] || THEMES.sage;
  }

  // 미리보기 / 출력 렌더링
  function renderAll(forOutput) {
    const model = buildModel();
    const coverKey = resolveCoverKey(model);
    const srcOf = (key) => {
      if (!key) return '';
      if (key === 'cover' && !coverKey) return '';
      const uk = urlKeyOf(key, coverKey);
      if (forOutput === true && S.prefs.imageMode === 'url') return directUrl(uk) || S.doc.urlMap[uk] || '';
      const c = imgCacheGet(key, coverKey);
      return c ? c.dataUrl : (forOutput === false && S.lastGood[key]) || directUrl(uk) || '';
    };
    const o = { ...S.prefs, names: { user: S.doc.cast.user.name || S.ctx.userName || 'USER', char: S.doc.cast.char.name || S.ctx.charName || 'CHAR' }, themeObj: resolveTheme(), mark: forOutput === false && !!S.editing, captions: S.doc.captions || {}, limit: S.prefs.split ? (Number(S.prefs.limit) || 60000) : Infinity, thumbnail: !!(forOutput === true && S.prefs.thumbnail && S.prefs.imageMode === 'url') };
    return { parts: renderDocument(model, S.doc, o, srcOf), model, coverKey };
  }

  const refreshPreview = debounce(async () => {
    if (editingInFrame()) { S.pendingRefresh = true; return; }
    S.pendingRefresh = false;
    const { parts, model, coverKey } = renderAll(false);
    // 출력 기준 글자수 (미리보기와 같음: 이미지는 글자수에 영향 없음)
    S.parts = parts;
    if (S.part >= parts.length) S.part = parts.length - 1;
    const frame = $('#fo-frame');
    frame.style.width = S.width === 'mobile' ? '390px' : '760px';
    frame.style.maxWidth = '100%';
    frame.innerHTML = parts[S.part] ? parts[S.part].html : '';
    frame.classList.toggle('editing', !!S.editing);
    if (S.editing) {
      frame.querySelectorAll('[data-fo]').forEach((el) => { el.setAttribute('contenteditable', 'true'); el.spellcheck = false; });
    }
    renderViewBar();
    if (S.tab === 'export' && !typingInPanel()) renderPanel();
    // 이미지가 아직 없으면 불러온 뒤 다시 그림
    const keys = usedImageKeys(model).filter((k) => !imgCacheGet(k, coverKey) && !S.images[imgCk(k, k === 'cover' ? coverKey : k)]);
    if (keys.length) {
      await Promise.all(keys.map((k) => ensureImage(k, coverKey)));
      refreshPreview();
      if (S.tab === 'images' && !typingInPanel()) renderPanel();
    }
  }, 120);

  function typingInPanel() {
    const a = document.activeElement;
    return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.type !== 'checkbox' && $('#fo-panel').contains(a));
  }

  const saveDoc = debounce(() => {
    if (S.ctx && S.doc) store.set(S.ctx.chatKey, S.doc);
    store.set(KEY + 'prefs', S.prefs);
  }, 500);

  function changed(rerenderPanel) {
    saveDoc();
    refreshPreview();
    if (rerenderPanel) renderPanel();
  }

  async function copyText(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) return true;
    } catch (e) { /* 다음 방법 */ }
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  }

  function modal(title, value, { readonly = false, onSave = null, help = '' } = {}) {
    const m = document.createElement('div');
    m.className = 'fo-modal';
    m.innerHTML = `<div class="fo-box"><b>${esc(title)}</b>${help ? `<div class="fo-hint">${esc(help)}</div>` : ''}<textarea class="fo-ta" ${readonly ? 'readonly' : ''}></textarea>
      <div class="fo-row" style="justify-content:flex-end;margin:0">${onSave ? '<button class="fo-btn" data-m="reset">원래대로</button>' : ''}<button class="fo-btn" data-m="close">닫기</button>${onSave ? '<button class="fo-btn pri" data-m="save">저장</button>' : ''}</div></div>`;
    const ta = m.querySelector('textarea');
    ta.value = value;
    m.addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.m;
      if (!a && e.target !== m) return;
      if (a === 'save') onSave(ta.value);
      if (a === 'reset') onSave(null);
      m.remove();
    });
    root.appendChild(m);
    if (readonly) { ta.focus(); ta.select(); }
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }

  const safeName = (s) => String(s || 'log-editorial').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'log-editorial';

  async function doZip() {
    const model = buildModel();
    const coverKey = resolveCoverKey(model);
    const list = exportList(model, coverKey);
    if (!list.length) { toast('내보낼 이미지가 없어요'); return; }
    toast('이미지 준비 중…');
    const files = [];
    let failed = 0;
    for (let i = 0; i < list.length; i++) {
      const k = list[i].key;
      const r = await ensureImage(k, coverKey);
      if (!r || r.error) { failed++; continue; }
      const tag = k === 'cover' ? 'cover' : k.startsWith('portrait:') ? k.slice(9) : 'plate';
      files.push({ name: `${pad2(i + 1)}_${tag}.${r.ext}`, data: base64ToBytes(r.dataUrl) });
    }
    if (failed) toast(`${failed}장은 읽지 못했어요. 번호가 비면 그 자리는 건너뛰고 올려주세요.`);
    download(safeName(S.doc.cover.title) + '_images.zip', makeZip(files));
    toast(`${files.length}장을 ZIP으로 저장했어요`);
  }

  function doUrlMatch() {
    const text = ($('#fo-urlpaste') || {}).value || '';
    const urls = extractArcaUrls(text);
    if (!urls.length) { toast('이미지 주소를 찾지 못했어요'); return; }
    const model = buildModel();
    const list = exportList(model, resolveCoverKey(model));
    list.forEach((x, i) => { if (urls[i]) S.doc.urlMap[x.uk] = urls[i]; });
    toast(`${Math.min(urls.length, list.length)}장 연결됨${urls.length !== list.length ? ` (주소 ${urls.length}개 / 이미지 ${list.length}장)` : ''}`);
    changed(true);
  }

  const isIOSSafari = () => {
    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios && /safari/i.test(ua) && !/crios|fxios|edgios|opr|chrome/i.test(ua);
  };

  // 리치 붙여넣기용 후처리: 토글은 펼친 상태로, iOS 사파리에서는 일반 블록으로
  function prepareRich(html) {
    if (isIOSSafari()) {
      return html.replace(new RegExp(TOGGLE_PILL_RE, 'g'), '')
        .replace(/<details\b[^>]*?(style="[^"]*")[^>]*>/gi, '<div $1>').replace(/<\/details>/gi, '</div>')
        .replace(/<summary\b[^>]*?style="([^"]*)"[^>]*>/gi, (_, st) => `<div style="${st.replace(/list-style:none;cursor:pointer;|outline:none;/g, '')}">`)
        .replace(/<\/summary>/gi, '</div>');
    }
    return html.replace(/<details(?![^>]*\bopen\b)/gi, '<details open=""');
  }

  async function copyRich(html, plain) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        })]);
        return true;
      }
    } catch (e) { /* 샌드박스에서는 막혀 있을 수 있음 */ }
    const sel = window.getSelection();
    // 복사 이벤트를 가로채 HTML을 직접 넣음
    let set = false;
    const onCopy = (e) => {
      if (!e.clipboardData) return;
      e.preventDefault();
      try { e.clipboardData.setData('text/html', html); e.clipboardData.setData('text/plain', plain); set = true; } catch (er) { set = false; }
    };
    const tmp = document.createElement('div');
    tmp.setAttribute('contenteditable', 'true');
    tmp.textContent = NAME;
    tmp.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0.01;';
    root.appendChild(tmp);
    document.addEventListener('copy', onCopy, true);
    let ok = false;
    try {
      tmp.focus();
      const r = document.createRange();
      r.selectNodeContents(tmp);
      sel.removeAllRanges(); sel.addRange(r);
      ok = document.execCommand('copy') && set;
    } catch (e) { ok = false; } finally {
      document.removeEventListener('copy', onCopy, true);
      tmp.remove();
    }
    if (ok) { sel.removeAllRanges(); return true; }
    // 마지막 방법: 렌더링한 내용을 선택해서 복사
    const box = document.createElement('div');
    box.setAttribute('contenteditable', 'true');
    box.innerHTML = html;
    box.style.cssText = 'position:fixed;left:-99999px;top:0;width:760px;opacity:0;';
    root.appendChild(box);
    try {
      box.focus();
      const r = document.createRange();
      r.selectNodeContents(box);
      sel.removeAllRanges(); sel.addRange(r);
      ok = document.execCommand('copy');
    } catch (e) { ok = false; } finally {
      box.remove();
      sel.removeAllRanges();
    }
    return ok;
  }

  async function prepareImages() {
    const model = buildModel();
    const coverKey = resolveCoverKey(model);
    const keys = usedImageKeys(model);
    if (keys.some((k) => !imgCacheGet(k, coverKey))) toast('이미지 준비 중…');
    await Promise.all(keys.map((k) => ensureImage(k, coverKey)));
  }

  // kind: 'rich' | 'source' | 'save'
  async function doCopy(i, kind) {
    if (kind === 'rich' || S.prefs.imageMode === 'data') await prepareImages();
    const { parts } = renderAll(kind === 'rich' ? 'rich' : true);
    const pt = parts[i];
    if (!pt) return;
    if (kind === 'rich') {
      const html = prepareRich(pt.html);
      const plain = visibleLengthText(html);
      const mb = html.length / 1048576;
      if (await copyRich(html, plain)) {
        toast(`Part ${i + 1} 리치 복사 완료 · 아카 글쓰기에 그대로 붙여넣기${mb > 15 ? ` (약 ${mb.toFixed(0)}MB, 붙여넣기가 느릴 수 있어요)` : ''}`);
      } else {
        toast('리치 복사가 막혀 있어요. 소스 복사를 이용해 주세요.');
      }
      return;
    }
    if (kind === 'save') {
      const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(S.doc.cover.title || NAME)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600;700&display=swap"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></head><body style="margin:0;padding:16px 0;background:#888">${pt.html}</body></html>`;
      download(`${safeName(S.doc.cover.title)}_part${i + 1}.html`, new Blob([page], { type: 'text/html' }));
      return;
    }
    if (await copyText(pt.html)) toast(`Part ${i + 1} 복사 완료 · 아카 코드보기에 붙여넣기`);
    else modal(`Part ${i + 1} HTML`, pt.html, { readonly: true, help: '자동 복사가 막혀 있어요. 전체 선택 후 직접 복사해 주세요.' });
  }

  /* ---------- 미리보기 직접 편집 ---------- */
  function editingInFrame() {
    if (!S.editing || !root) return false;
    const a = document.activeElement;
    return !!(a && a.closest && a.closest('#fo-frame [data-fo]'));
  }

  // 편집한 DOM → 본문 문법 (*기울임*, **굵게**, 줄바꿈)
  function domToText(el) {
    let out = '';
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'br') out += '\n';
      else if (tag === 'em' || tag === 'i') out += '*' + domToText(n) + '*';
      else if (tag === 'strong' || tag === 'b') out += '**' + domToText(n) + '**';
      else if (tag === 'div' || tag === 'p') out += '\n' + domToText(n);
      else out += domToText(n);
    });
    return out.replace(/\u00a0/g, ' ');
  }

  function commitEdit(el) {
    if (el.dataset.cancel) { delete el.dataset.cancel; return true; }
    const kind = el.dataset.fo;
    if (kind === 'p') {
      const key = el.dataset.foMsg, bi = +el.dataset.foBi;
      const m = S.messages.find((x) => x.key === key);
      if (!m) return false;
      const lines = parseCached(m).blocks.map(blockLine);
      const text = domToText(el).replace(/\*\*\s*\*\*/g, '').trim();
      if (text === lines[bi]) return false;
      const parts = text ? text.split(/\n+/).map((x) => x.trim()).filter(Boolean) : [];
      lines.splice(bi, 1, ...parts);
      S.doc.overrides[key] = lines.join('\n\n');
      return true;
    }
    if (kind === 'bind') {
      const path = el.dataset.foPath;
      const val = (el.dataset.foMultiline ? domToText(el) : el.innerText).replace(/\u00a0/g, ' ').trim();
      if (val === String(getPath(S, path) ?? '')) return false;
      setPath(S, path, val);
      if (path.startsWith('doc.chapters.')) S.doc.chapters[path.split('.')[2]].on = true;
      return true;
    }
    if (kind === 'cap') {
      if (el.innerText === el.dataset.orig) return false;
      S.doc.captions = S.doc.captions || {};
      // 비우면 이 삽화만 캡션 숨김
      S.doc.captions[el.dataset.foCap] = el.innerText.trim() || ' ';
      return true;
    }
    return false;
  }

  function bindFrameEditing() {
    const frame = $('#fo-frame');
    frame.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-fo]');
      if (el && S.editing) el.dataset.orig = el.innerText;
    });
    frame.addEventListener('focusout', (e) => {
      const el = e.target.closest && e.target.closest('[data-fo]');
      if (!el || !S.editing) return;
      const did = commitEdit(el);
      setTimeout(() => {
        if (editingInFrame()) return;
        if (did) changed(S.tab === 'chapters' || S.tab === 'cover' || S.tab === 'cast');
        else if (S.pendingRefresh) refreshPreview();
      }, 0);
    });
    frame.addEventListener('click', (e) => {
      if (S.editing && e.target.closest('summary') && e.target.closest('[data-fo]')) e.preventDefault();
    });
    frame.addEventListener('keydown', (e) => {
      const el = e.target.closest && e.target.closest('[data-fo]');
      if (!el || !S.editing) return;
      if (e.key === 'Escape') { el.dataset.cancel = '1'; el.blur(); S.pendingRefresh = true; return; }
      const single = el.dataset.fo !== 'p' && !el.dataset.foMultiline;
      if (e.key === 'Enter' && single) { e.preventDefault(); el.blur(); return; }
      if (e.key === ' ' && el.closest('summary')) { e.preventDefault(); document.execCommand('insertText', false, ' '); }
    });
    frame.addEventListener('paste', (e) => {
      if (!S.editing || !e.target.closest('[data-fo]')) return;
      const text = e.clipboardData && e.clipboardData.getData('text/plain');
      if (text == null) return;
      e.preventDefault();
      document.execCommand('insertText', false, text);
    });
  }

  /* ---------- 이미지 직접 추가 ---------- */
  function pickFiles(multiple) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.multiple = !!multiple;
      inp.style.display = 'none';
      inp.addEventListener('change', () => { resolve([...(inp.files || [])]); inp.remove(); });
      root.appendChild(inp);
      inp.click();
    });
  }

  async function uploadImages(files) {
    const ids = [];
    for (const f of files) {
      try {
        const enc = await encodeImage(f, { maxW: 1600, quality: 0.9 });
        const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        if (await imgStore.set(id, enc.dataUrl)) ids.push(id);
      } catch (e) { /* 읽을 수 없는 파일 */ }
    }
    if (ids.length < files.length) toast(`${files.length - ids.length}장은 읽지 못했어요`);
    return ids;
  }

  function insertTokens(key, tokens, pos) {
    const m = S.messages.find((x) => x.key === key);
    if (!m || !tokens.length) return;
    const base = S.doc.overrides[key] != null ? S.doc.overrides[key] : blocksToText(parseCached(m).blocks);
    const add = tokens.join('\n\n');
    S.doc.overrides[key] = pos === 'start' ? add + '\n\n' + base : base + '\n\n' + add;
    changed(true);
    toast(`이미지 ${tokens.length}장을 넣었어요. 위치는 편집에서 옮길 수 있어요`);
  }

  function addImageDialog(key) {
    const m = document.createElement('div');
    m.className = 'fo-modal';
    m.innerHTML = `<div class="fo-box sm"><b style="font-size:15px">이미지 추가</b>
      <div class="fo-row"><label>넣을 위치</label><select class="fo-sel" id="fo-ipos"><option value="end">메시지 끝</option><option value="start">메시지 처음</option></select></div>
      <button class="fo-btn pri" data-i="file">내 기기에서 고르기</button>
      <div class="fo-row" style="margin:0"><input class="fo-in" id="fo-iurl" placeholder="또는 이미지 주소 (https://…)"><button class="fo-btn" data-i="url">주소로 넣기</button></div>
      <div class="fo-hint" style="margin:0">올린 이미지는 이 기기에만 저장돼요. 메시지 편집에서 ⟦이미지:…⟧ 줄을 옮기면 위치를 바꿀 수 있어요.</div>
      <div class="fo-row" style="justify-content:flex-end;margin:0"><button class="fo-btn" data-i="close">닫기</button></div></div>`;
    m.addEventListener('click', async (e) => {
      const a = e.target.dataset && e.target.dataset.i;
      if (!a) return;
      const pos = m.querySelector('#fo-ipos').value;
      if (a === 'close') { m.remove(); return; }
      if (a === 'url') {
        const u = m.querySelector('#fo-iurl').value.trim();
        if (!/^(https?:)?\/\//i.test(u)) { toast('https:// 로 시작하는 주소를 넣어주세요'); return; }
        m.remove();
        insertTokens(key, ['⟦이미지:' + u + '⟧'], pos);
        return;
      }
      if (a === 'file') {
        const files = await pickFiles(true);
        if (!files.length) return;
        m.remove();
        toast('이미지 저장 중…');
        const ids = await uploadImages(files);
        insertTokens(key, ids.map((id) => '⟦이미지:' + id + '⟧'), pos);
      }
    });
    root.appendChild(m);
  }

  async function uploadSingle(apply) {
    const files = await pickFiles(false);
    if (!files.length) return;
    const ids = await uploadImages(files.slice(0, 1));
    if (ids[0]) { apply(ids[0]); changed(true); }
  }

  function editMessage(key) {
    const m = S.messages.find((x) => x.key === key);
    if (!m) return;
    const cur = S.doc.overrides[key];
    const base = blocksToEditable(m.raw, { ...parseOpts(m), override: undefined });
    modal('메시지 편집', cur != null ? cur : base, {
      help: '빈 줄로 문단을 나눠요. ⟦삽화:n⟧·⟦이미지:…⟧ 줄은 이미지 자리이고, * * * 는 장면 전환이에요.',
      onSave: (v) => {
        if (v == null || v === base) delete S.doc.overrides[key];
        else S.doc.overrides[key] = v;
        changed(true);
      }
    });
  }

  function bindEvents() {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab],[data-act],[data-part],[data-width],[data-copy],[data-src],[data-save],[data-edit],[data-addimg],[data-theme],[data-utdel],[data-cropreset]');
      if (!t) return;
      const ds = t.dataset;
      if (ds.tab) { S.tab = ds.tab; renderPanel(); return; }
      if (ds.part != null) { S.part = +ds.part; refreshPreview(); return; }
      if (ds.width) { S.width = ds.width; refreshPreview(); return; }
      if (ds.copy != null) { doCopy(+ds.copy, 'rich'); return; }
      if (ds.src != null) { doCopy(+ds.src, 'source'); return; }
      if (ds.save != null) { doCopy(+ds.save, 'save'); return; }
      if (ds.edit) { editMessage(ds.edit); return; }
      if (ds.addimg) { addImageDialog(ds.addimg); return; }
      if (ds.cropreset) { setPath(S, ds.cropreset, null); changed(true); return; }
      if (ds.utdel) {
        S.prefs.userThemes = (S.prefs.userThemes || []).filter((u) => u.id !== ds.utdel);
        if (S.prefs.theme === 'u:' + ds.utdel) S.prefs.theme = 'sage';
        changed(true); return;
      }
      if (ds.theme) { S.prefs.theme = ds.theme; changed(true); return; }
      switch (ds.act) {
        case 'close': R.hideContainer(); break;
        case 'reload': start(true); break;
        case 'ui': S.prefs.ui = { auto: 'light', light: 'dark', dark: 'auto' }[S.prefs.ui] || 'auto'; applyUiTheme(); saveDoc(); break;
        case 'range': pickRange(true, true).then((r) => { if (r) applyRange(r); }); break;
        case 'zip': doZip(); break;
        case 'urlmatch': doUrlMatch(); break;
        case 'rep-add': S.doc.replacements.push({ from: '', to: '', regex: false, flags: 'g' }); changed(true); break;
        case 'editmode': S.editing = !S.editing; refreshPreview(); break;
        case 'theme-custom': {
          if (S.prefs.theme !== 'custom') {
            const cur = resolveTheme();
            const u = String(S.prefs.theme).startsWith('u:') && (S.prefs.userThemes || []).find((x) => 'u:' + x.id === S.prefs.theme);
            S.prefs.custom = u ? JSON.parse(JSON.stringify(u.base)) : { mat: cur.mat, sheet: cur.sheet, ink: cur.ink, accent: cur.accent, dlg: '', head: '', overrides: {} };
            S.prefs.theme = 'custom';
            changed(true);
          }
          break;
        }
        case 'theme-save': {
          const name = (($('#fo-tname') || {}).value || '').trim() || '내 테마 ' + ((S.prefs.userThemes || []).length + 1);
          const id = 't' + Date.now().toString(36);
          S.prefs.userThemes = [...(S.prefs.userThemes || []), { id, label: name, base: JSON.parse(JSON.stringify(S.prefs.custom)) }];
          S.prefs.theme = 'u:' + id;
          toast(`'${name}' 테마를 저장했어요`);
          changed(true);
          break;
        }
        case 'up-cover': uploadSingle((id) => { S.doc.cover.customId = id; S.doc.cover.image = 'custom'; S.doc.cover.crop = null; }); break;
        case 'up-char': uploadSingle((id) => { S.doc.cast.char.customId = id; S.doc.cast.char.portrait = true; S.doc.cast.char.crop = null; }); break;
        case 'up-user': uploadSingle((id) => { S.doc.cast.user.customId = id; S.doc.cast.user.portrait = true; S.doc.cast.user.crop = null; }); break;
        case 'cast-add':
          if (castSlotsLeft() > 0) {
            S.doc.cast.extra.push({ id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: '', role: 'CAST', tags: '', desc: '', portrait: true, asset: '', customId: '' });
            changed(true);
          }
          break;
        case 'cast-del': S.doc.cast.extra.splice(+ds.i, 1); changed(true); break;
        case 'cast-up': case 'cast-down': {
          const i = +ds.i, j = ds.act === 'cast-up' ? i - 1 : i + 1, ex = S.doc.cast.extra;
          if (ex[j]) { [ex[i], ex[j]] = [ex[j], ex[i]]; changed(true); }
          break;
        }
        case 'up-x': { const i = +ds.i; uploadSingle((id) => { S.doc.cast.extra[i].customId = id; S.doc.cast.extra[i].portrait = true; S.doc.cast.extra[i].crop = null; }); break; }
        case 'reset-x': S.doc.cast.extra[+ds.i].customId = ''; changed(true); break;
        case 'reset-char': S.doc.cast.char.customId = ''; changed(true); break;
        case 'reset-user': S.doc.cast.user.customId = ''; changed(true); break;
        case 'rep-del': S.doc.replacements.splice(+ds.i, 1); changed(true); break;
      }
    });
    const onInput = (e) => {
      const el = e.target;
      if (el.dataset.bind) {
        const path = el.dataset.bind;
        let v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'number' || el.type === 'range') v = Number(v) || 0;
        if (path === 'prefs.maxW') v = clamp(v || 960, 320, 2000);
        if (path === 'prefs.quality') v = clamp(Number(v) || 0.86, 0.5, 0.98);
        setPath(S, path, v);
        if (path.startsWith('doc.chapters.')) { const k = path.split('.')[2]; S.doc.chapters[k].on = true; }
        if (path.startsWith('prefs.custom.') && el.type !== 'color') { v = String(v).trim(); if (v && !v.startsWith('#') && /^[0-9a-f]{3,6}$/i.test(v)) v = '#' + v; setPath(S, path, v); }
        if (el.dataset.crop != null) {
          // 움직이는 동안은 패널 미리보기만, 손을 떼면 본문에 반영
          const out = el.parentElement.querySelector('.fo-slv');
          if (out) out.textContent = path.endsWith('.zoom') ? v.toFixed(2) + '×' : Math.round(v) + '%';
          root.querySelectorAll('[data-cropview]').forEach((x) => { if (x.dataset.cropview === el.dataset.crop) paintCropView(x); });
          if (e.type === 'change') changed(false);
          return;
        }
        const structural = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' || path.startsWith('doc.range') || path.startsWith('doc.replacements') || path.startsWith('prefs.custom.');
        if (path === 'prefs.mode') loadTranslationCache().then(() => changed(true));
        else changed(structural && e.type === 'change');
        return;
      }
      if (el.dataset.ex != null) {
        if (el.checked) delete S.doc.excluded[el.dataset.ex]; else S.doc.excluded[el.dataset.ex] = true;
        changed(true); return;
      }
      if (el.dataset.chap != null) {
        const k = el.dataset.chap;
        S.doc.chapters[k] = { ...(S.doc.chapters[k] || {}), on: el.checked };
        changed(true); return;
      }
      if (el.dataset.cap != null) {
        S.doc.captions = S.doc.captions || {};
        if (el.value.trim()) S.doc.captions[el.dataset.cap] = el.value; else delete S.doc.captions[el.dataset.cap];
        changed(false); return;
      }
      if (el.dataset.url != null) {
        const v = el.value.trim();
        if (v) S.doc.urlMap[el.dataset.url] = v; else delete S.doc.urlMap[el.dataset.url];
        changed(false);
      }
    };
    root.addEventListener('input', (e) => { if (e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') onInput(e); });
    root.addEventListener('change', onInput);
  }

  async function start(reload) {
    if (!root) {
      const style = document.createElement('style');
      style.textContent = CSS;
      document.head.appendChild(style);
      const fl = document.createElement('link');
      fl.rel = 'stylesheet';
      fl.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(fl);
      const pl = document.createElement('link');
      pl.rel = 'stylesheet';
      pl.href = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
      document.head.appendChild(pl);
      document.body.innerHTML = shellHtml();
      root = document.getElementById('fo');
      bindEvents();
      bindFrameEditing();
    }
    try { await R.showContainer('fullscreen'); } catch (e) { /* 이미 표시됨 */ }
    $('#fo-frame').innerHTML = '<div class="fo-loading">채팅 로그를 불러오는 중…</div>';
    try {
      const prefs = await store.get(KEY + 'prefs');
      S.prefs = { ...DEFAULT_PREFS, ...(prefs || {}) };
      if (!['first', 'all', 'none', 'off'].includes(S.prefs.toggle)) S.prefs.toggle = 'first';
      const ctx = await loadContext();
      if (!reload || !S.ctx || S.ctx.chatKey !== ctx.chatKey) S.images = {};
      S.ctx = ctx;
      S.messages = ctx.messages;
      const saved = await store.get(ctx.chatKey);
      const base = newDoc(ctx);
      S.doc = saved ? { ...base, ...saved, cover: { ...base.cover, ...saved.cover }, cast: { ...base.cast, ...saved.cast, char: { ...base.cast.char, ...(saved.cast || {}).char }, user: { ...base.cast.user, ...(saved.cast || {}).user }, extra: ((saved.cast || {}).extra || []) } } : base;
      if (!S.doc.cover.title) S.doc.cover.title = ctx.chat.name && !/^new chat$/i.test(ctx.chat.name) ? ctx.chat.name : (ctx.charName || '');
      applyUiTheme();
      if (reload && S.loaded) { await applyRange(null); return; }
      S.loaded = false;
      $('#fo-panel').innerHTML = '<div class="fo-hint">불러올 범위를 골라주세요.</div>';
      $('#fo-vbar').innerHTML = '';
      $('#fo-frame').innerHTML = `<div class="fo-loading">전체 ${ctx.messages.length}개 메시지 중 어디부터 불러올지 골라주세요.</div>`;
      const r = await pickRange(!!(saved && saved.range && saved.range.picked), false);
      if (!r) { try { await R.hideContainer(); } catch (e) { /* 무시 */ } return; }
      await applyRange(r);
    } catch (e) {
      $('#fo-frame').innerHTML = `<div class="fo-loading">${esc(e.message || String(e))}</div>`;
    }
  }

  async function applyRange(r) {
    if (r) S.doc.range = { from: r.from, to: r.to, picked: true };
    S.loaded = true;
    $('#fo-frame').innerHTML = '<div class="fo-loading">본문을 정리하는 중…</div>';
    await loadTranslationCache();
    renderPanel();
    refreshPreview();
    saveDoc();
  }

  // 처음 열 때 불러올 범위 선택
  function pickRange(hasSaved, cancellable) {
    const total = S.messages.length;
    const n = clamp(S.prefs.recentN || 30, 1, Math.max(1, total));
    const cur = rangeBounds();
    const sel = hasSaved ? 'last' : 'recent';
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'fo-modal';
      m.innerHTML = `<div class="fo-box sm"><b style="font-size:15px">어디부터 불러올까요?</b>
        <div class="fo-hint" style="margin:0">이 채팅에는 메시지가 ${total}개 있어요. 필요한 만큼만 불러오면 빨라요.</div>
        <label class="fo-opt"><input type="radio" name="fo-r" value="recent" ${sel === 'recent' ? 'checked' : ''}><span style="flex:1"><b>최근</b> <input class="fo-in n" type="number" min="1" max="${total}" id="fo-rn" value="${n}"> 개</span></label>
        ${hasSaved ? `<label class="fo-opt"><input type="radio" name="fo-r" value="last" ${sel === 'last' ? 'checked' : ''}><span style="flex:1"><b>지난번 범위</b> <span class="fo-idx">#${cur.from} ~ #${S.doc.range.to > 0 ? cur.to : '끝'}</span></span></label>` : ''}
        <label class="fo-opt"><input type="radio" name="fo-r" value="custom"><span style="flex:1;display:flex;gap:6px;align-items:center"><b>직접</b> #<input class="fo-in n" type="number" min="1" max="${total}" id="fo-ra" value="${hasSaved ? cur.from : Math.max(1, total - n + 1)}"> ~ #<input class="fo-in n" type="number" min="1" max="${total}" id="fo-rb" value="${hasSaved ? cur.to : total}"></span></label>
        <label class="fo-opt"><input type="radio" name="fo-r" value="all"><span style="flex:1"><b>전체</b> <span class="fo-idx">${total}개${total > 300 ? ' · 느릴 수 있어요' : ''}</span></span></label>
        <div class="fo-row" style="justify-content:flex-end;margin:4px 0 0">${cancellable ? '<button class="fo-btn" data-r="cancel">취소</button>' : '<button class="fo-btn" data-r="cancel">닫기</button>'}<button class="fo-btn pri" data-r="ok">불러오기</button></div></div>`;
      const pick = (v) => { const el = m.querySelector(`input[name="fo-r"][value="${v}"]`); if (el) el.checked = true; };
      m.querySelector('#fo-rn').addEventListener('focus', () => pick('recent'));
      m.querySelector('#fo-ra').addEventListener('focus', () => pick('custom'));
      m.querySelector('#fo-rb').addEventListener('focus', () => pick('custom'));
      m.addEventListener('click', (e) => {
        const a = e.target.dataset && e.target.dataset.r;
        if (!a) return;
        if (a === 'cancel') { m.remove(); resolve(null); return; }
        const v = (m.querySelector('input[name="fo-r"]:checked') || {}).value || 'recent';
        let r;
        if (v === 'recent') {
          const k = clamp(parseInt(m.querySelector('#fo-rn').value, 10) || n, 1, total);
          S.prefs.recentN = k;
          r = { from: Math.max(1, total - k + 1), to: 0 };
        } else if (v === 'last') r = { from: S.doc.range.from || 1, to: S.doc.range.to || 0 };
        else if (v === 'all') r = { from: 1, to: 0 };
        else {
          let a1 = clamp(parseInt(m.querySelector('#fo-ra').value, 10) || 1, 1, total);
          let b1 = clamp(parseInt(m.querySelector('#fo-rb').value, 10) || total, 1, total);
          if (b1 < a1) [a1, b1] = [b1, a1];
          r = { from: a1, to: b1 === total ? 0 : b1 };
        }
        m.remove();
        resolve(r);
      });
      root.appendChild(m);
    });
  }

  function applyUiTheme() {
    let light = S.prefs.ui === 'light';
    if (S.prefs.ui === 'auto') {
      try { light = window.matchMedia('(prefers-color-scheme: light)').matches; } catch (e) { light = false; }
    }
    root.classList.toggle('light', light);
    const b = $('#fo-ui');
    if (b) b.textContent = { auto: '화면: 자동', light: '화면: 화이트', dark: '화면: 다크' }[S.prefs.ui] || '화면: 자동';
  }

  // 플러그인 버튼 등록
  try {
    await R.registerButton({ name: NAME, icon: '🗃️', iconType: 'html', location: 'chat', id: 'log-editorial-open' }, () => start(false));
  } catch (e) {
    console.error(NAME + ': 버튼 등록 실패', e);
  }
})();
