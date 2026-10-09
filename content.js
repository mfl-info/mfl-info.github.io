/* MFL content.js - loaded on every public page, right after config.js.
   1) uses the admin's open/close times from the last saved copy at once (so the form opens/locks on time)
   2) loads admin content (news, Season 7 lists, text edits) from the Apps Script and shows it
   3) when the admin is logged in (admin.html) it adds a small "Admin" button to edit page text */
(function () {
  'use strict';
  var KEY = 'mfl_content_v2', TOK = 'mfl_admin_token';
  var PAGE = location.pathname.split('/').pop() || 'index.html';
  if (!/\.html$/.test(PAGE)) PAGE = 'index.html';
  var C = (typeof CONFIG !== 'undefined') ? CONFIG : {}, BASE = C.scriptUrl || '';
  var store = null;
  try { store = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  var lang = function () { return typeof window.getLang === 'function' ? window.getLang() : 'en'; };
  var tt = function (en, bn) { return lang() === 'bn' ? bn : en; };

  /* ---------- 1. settings (sync, before the page scripts run) ---------- */
  function applySettings(s) { if (!s) return; if (s.opensAt) C.opensAt = s.opensAt; C.closesAt = s.closesAt || ''; }
  if (store && store.settings) applySettings(store.settings);

  /* ---------- helpers ---------- */
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null && txt !== '') e.textContent = txt; return e; }
  function okUrl(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(u || '') ? u : ''; }
  function ext(href, label) { var a = h('a', 'mfl-link', label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }
  var ALLOW = { B: 1, I: 1, STRONG: 1, EM: 1, BR: 1, A: 1, SPAN: 1, SMALL: 1, U: 1, SUB: 1, SUP: 1, TIME: 1 };
  function clean(html) {                                   // keep only simple formatting
    var t = document.createElement('template'); t.innerHTML = html;
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 1) {
          walk(c);
          if (!ALLOW[c.tagName]) { c.replaceWith.apply(c, Array.prototype.slice.call(c.childNodes)); return; }
          Array.prototype.slice.call(c.attributes).forEach(function (a) {
            var ok = c.tagName === 'A' && a.name === 'href' && /^(https?:\/\/|\/|#|mailto:|[a-z0-9_-]+\.html)/i.test(a.value);
            if (!ok) c.removeAttribute(a.name);
          });
        } else if (c.nodeType !== 3) c.remove();
      });
    })(t.content);
    return t.innerHTML;
  }

  /* ---------- 2. rendering admin collections ---------- */
  var TXT = {
    news:       [['LATEST', 'Announcements', 'No new announcements yet.'], ['সর্বশেষ', 'ঘোষণা', 'এখনো কোনো নতুন ঘোষণা নেই।']],
    s7teams:    [['SEASON 7', 'Teams', 'To be announced'], ['সিজন ৭', 'টিম', 'ঘোষণা করা হবে']],
    s7schedule: [['SEASON 7', 'Schedule', 'Schedule will be announced'], ['সিজন ৭', 'সূচি', 'সূচি ঘোষণা করা হবে']],
    s7results:  [['SEASON 7', 'Results', 'No Season 7 results yet.'], ['সিজন ৭', 'ফলাফল', 'সিজন ৭-এর কোনো ফলাফল এখনো নেই।']],
    s7awards:   [['SEASON 7', 'Awards', 'Coming Soon'], ['সিজন ৭', 'পুরস্কার', 'শিগগিরই আসছে']],
    gallery:    [['SEASON 7', 'Gallery', 'Coming Soon'], ['সিজন ৭', 'গ্যালারি', 'শিগগিরই আসছে']],
    highlights: [['SEASON 7', 'Highlights', 'Coming Soon'], ['সিজন ৭', 'হাইলাইটস', 'শিগগিরই আসছে']]
  };
  var R = {
    news: function (box, items) {
      items = items.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      var lim = Number(box.getAttribute('data-limit')) || 0; if (lim) items = items.slice(0, lim);
      items.forEach(function (n) {
        var c = h('article', 'mfl-card mfl-news');
        if (okUrl(n.image)) { var im = h('img'); im.src = n.image; im.alt = ''; im.loading = 'lazy'; c.appendChild(im); }
        if (n.date) c.appendChild(h('time', '', n.date));
        c.appendChild(h('h3', '', n.title));
        if (n.summary) c.appendChild(h('p', 'mfl-pre', n.summary));
        if (okUrl(n.link)) c.appendChild(ext(n.link, tt('Read more ↗', 'আরও পড়ুন ↗')));
        box.appendChild(c);
      });
    },
    s7teams: function (box, items) {
      var g = h('div', 'mfl-grid');
      items.forEach(function (t) {
        var c = h('div', 'mfl-card'); c.appendChild(h('h3', '', t.name));
        if (t.group) c.appendChild(h('span', 'mfl-chip', (tt('Group ', 'গ্রুপ ') + t.group)));
        if (t.captain) c.appendChild(h('p', '', tt('Captain: ', 'ক্যাপ্টেন: ') + t.captain));
        if (t.note) c.appendChild(h('p', 'mfl-muted', t.note));
        g.appendChild(c);
      }); box.appendChild(g);
    },
    s7schedule: function (box, items) {
      items.forEach(function (m) {
        var r = h('div', 'mfl-card mfl-match');
        r.appendChild(h('div', 'mfl-when', [m.date, m.time].filter(Boolean).join(' · ')));
        r.appendChild(h('div', 'mfl-vs', (m.home || 'TBA') + '  vs  ' + (m.away || 'TBA')));
        var meta = [m.stage, m.venue].filter(Boolean).join(' · '); if (meta) r.appendChild(h('div', 'mfl-muted', meta));
        box.appendChild(r);
      });
    },
    s7results: function (box, items) {
      items.forEach(function (m) {
        var r = h('div', 'mfl-card mfl-match');
        var meta = [m.stage, m.date].filter(Boolean).join(' · '); if (meta) r.appendChild(h('div', 'mfl-when', meta));
        var sc = (m.hs !== '' && m.as !== '') ? (m.hs + ' – ' + m.as) : 'vs';
        r.appendChild(h('div', 'mfl-vs', (m.home || 'TBA') + '  ' + sc + '  ' + (m.away || 'TBA')));
        if (m.scorers) r.appendChild(h('div', 'mfl-pre mfl-muted', tt('Scorers: ', 'গোলদাতা: ') + m.scorers));
        r.appendChild(h('div', 'mfl-muted', tt('Man of the Match: ', 'ম্যান অফ দ্য ম্যাচ: ') + (m.motm || tt('Not published', 'প্রকাশ করা হয়নি'))));
        box.appendChild(r);
      });
    },
    s7awards: function (box, items) {
      var g = h('div', 'mfl-grid');
      items.forEach(function (a) { var c = h('div', 'mfl-card'); c.appendChild(h('div', 'mfl-muted', a.title)); c.appendChild(h('h3', '', a.winner || 'TBA')); if (a.note) c.appendChild(h('p', 'mfl-muted', a.note)); g.appendChild(c); });
      box.appendChild(g);
    },
    gallery: function (box, items) {
      var g = h('div', 'mfl-grid');
      items.forEach(function (p) { if (!okUrl(p.url)) return; var f = h('figure', 'mfl-card mfl-photo'), im = h('img'); im.src = p.url; im.alt = p.caption || ''; im.loading = 'lazy'; f.appendChild(im); if (p.caption) f.appendChild(h('figcaption', '', p.caption)); g.appendChild(f); });
      box.appendChild(g);
    },
    highlights: function (box, items) {
      items.forEach(function (v) { if (!okUrl(v.url)) return; var c = h('div', 'mfl-card mfl-hl'); c.appendChild(h('h3', '', v.title || 'Highlight')); c.appendChild(ext(v.url, tt('Watch ↗', 'দেখুন ↗'))); box.appendChild(c); });
    }
  };
  function items(k) { var c = store && store.collections && store.collections[k]; return Array.isArray(c) ? c : []; }
  function renderAll() {
    document.querySelectorAll('[data-mfl]').forEach(function (box) {
      var k = box.getAttribute('data-mfl'), tx = TXT[k], fn = R[k]; if (!tx || !fn) return;
      var L = lang() === 'bn' ? 1 : 0, list = items(k);
      var main = list, six = [];
      if (k === 'gallery' || k === 'highlights') { main = list.filter(function (x) { return x.season !== 'Season 6'; }); six = list.filter(function (x) { return x.season === 'Season 6'; }); }
      box.textContent = '';
      document.querySelectorAll('[data-s7-static="' + k + '"]').forEach(function (s) { s.hidden = list.length > 0; });
      if (!list.length && box.hasAttribute('data-hide-empty')) { box.hidden = true; return; }
      if (k === 'news' && !list.length) { box.hidden = true; return; }
      box.hidden = false;
      var w = h('div', 'wrap'); box.appendChild(w);
      var head = h('div', 'mfl-head'); head.appendChild(h('div', 'eyebrow', tx[L][0])); head.appendChild(h('h2', '', tx[L][1])); w.appendChild(head);
      if (main.length) { var body = h('div', 'mfl-body'); fn(body, main); w.appendChild(body); }
      else w.appendChild(h('div', 'mfl-empty', tx[L][2]));
      if (six.length) { var h6 = h('div', 'mfl-head'); h6.appendChild(h('div', 'eyebrow', tt('SEASON 6 ARCHIVE', 'সিজন ৬ আর্কাইভ'))); w.appendChild(h6); var b6 = h('div', 'mfl-body'); fn(b6, six); w.appendChild(b6); }
    });
    notice();
  }
  function notice() {
    var old = document.querySelector('.mfl-notice'); if (old) old.remove();
    var s = store && store.settings; if (!s || !s.notice) return;
    var n = h('div', 'mfl-notice'); n.appendChild(h('span', '', s.notice));
    if (okUrl(s.noticeLink)) n.appendChild(ext(s.noticeLink, tt('Details ↗', 'বিস্তারিত ↗')));
    var hd = document.querySelector('header'); if (hd) hd.insertAdjacentElement('afterend', n); else document.body.prepend(n);
  }

  /* ---------- 3. text edits made with the admin edit mode ---------- */
  function sigOf(el) { var s = (el.__en !== undefined ? el.__en : el.innerHTML); return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40); }
  function applyPatches() {
    var list = (store && store.patches && store.patches[PAGE]) || [];
    list.forEach(function (p) {
      var el; try { el = document.querySelector(p.p); } catch (e) { return; }
      if (!el) return;
      if (el.__sig === undefined) el.__sig = sigOf(el);
      if (p.o && p.o !== el.__sig) return;                  // the page changed since this edit: skip it
      var html = clean(p.h), hasBn = el.hasAttribute('data-bn');
      if (p.l === 'bn' && hasBn) { el.setAttribute('data-bn', html); if (lang() === 'bn') el.innerHTML = html; }
      else if (p.l === 'en') {
        if (hasBn && el.__en !== undefined) { el.__en = html; if (lang() === 'en') el.innerHTML = html; }
        else if (!hasBn || lang() === 'en') el.innerHTML = html;
      }
    });
  }

  /* ---------- load from the server ---------- */
  function sync() {
    if (!BASE) return;
    fetch(BASE + '?action=content&page=' + encodeURIComponent(PAGE), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) return;
      var old = store || {}, patches = {}; Object.keys(old.patches || {}).forEach(function (k) { patches[k] = old.patches[k]; });
      var hadMore = ((old.patches && old.patches[PAGE]) || []).length > (d.patches || []).length;
      patches[PAGE] = d.patches || [];
      var needReload = (d.settings.opensAt !== C.opensAt) || ((d.settings.closesAt || '') !== (C.closesAt || '')) || hadMore;
      store = { settings: d.settings, collections: d.collections, patches: patches, v: d.v };
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
      if (needReload) {                                       // once per change, so the form opens/locks right away
        var tag = JSON.stringify([d.settings.opensAt, d.settings.closesAt, patches[PAGE].length]);
        if (sessionStorage.getItem('mfl_rl') !== tag) { try { sessionStorage.setItem('mfl_rl', tag); } catch (e) {} location.reload(); return; }
      }
      renderAll(); applyPatches();
    }).catch(function () {});
  }

  /* ---------- admin edit mode ---------- */
  var token = ''; try { token = localStorage.getItem(TOK) || ''; } catch (e) {}
  function api(action, extra) {
    var body = { action: action, token: token }; for (var k in extra) body[k] = extra[k];
    return fetch(BASE, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function pathOf(el) {
    var parts = [];
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id && e !== el) { parts.unshift('#' + (window.CSS && CSS.escape ? CSS.escape(e.id) : e.id)); return parts.join('>'); }
      var i = 1; for (var s = e.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === e.tagName) i++;
      parts.unshift(e.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
    }
    return 'body>' + parts.join('>');
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, SVG: 1, IMG: 1, SUMMARY: 1, LABEL: 1, OPTION: 1, TIME: 0 };
  function plain(el) {
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (!ALLOW[c.tagName] || c.tagName === 'SPAN' && c.attributes.length) return false;
      for (var i = 0; i < c.attributes.length; i++) if (!(c.tagName === 'A' && c.attributes[i].name === 'href')) return false;
      if (!plain(c)) return false;
    }
    return true;
  }
  function direct(el) { for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true; return false; }
  function candidates() {
    var out = [];
    document.querySelectorAll('main *, footer *').forEach(function (el) {
      if (SKIP[el.tagName] || el.id || !direct(el) || !plain(el)) return;
      if (el.closest('[data-mfl],[data-js],form,nav,.mfl-notice,#mfl-bar,[contenteditable]')) return;
      out.push(el);
    });
    var set = new Set(out);                                  // keep only the outer element when one editable sits inside another
    return out.filter(function (el) { for (var p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false; return true; });
  }
  var editing = null;
  function startEdit() {
    var list = candidates(); editing = list;
    document.documentElement.classList.add('mfl-editing');
    list.forEach(function (el) {
      if (el.__sig === undefined) el.__sig = sigOf(el);
      el.__before = el.innerHTML; el.contentEditable = 'true';
      el.addEventListener('keydown', noEnter); el.addEventListener('paste', pastePlain);
    });
    document.addEventListener('click', blockLinks, true);
    setBar('edit');
  }
  function noEnter(e) { if (e.key === 'Enter') e.preventDefault(); }
  function pastePlain(e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t.replace(/\s+/g, ' ')); }
  function blockLinks(e) { if (e.target.closest && e.target.closest('#mfl-bar')) return; var a = e.target.closest && e.target.closest('a'); if (a && a.isContentEditable) e.preventDefault(); }
  function stopEdit() {
    (editing || []).forEach(function (el) { el.removeAttribute('contenteditable'); el.removeEventListener('keydown', noEnter); el.removeEventListener('paste', pastePlain); });
    document.removeEventListener('click', blockLinks, true); document.documentElement.classList.remove('mfl-editing'); editing = null;
  }
  function cancelEdit() { (editing || []).forEach(function (el) { el.innerHTML = el.__before; }); stopEdit(); setBar('idle'); }
  function saveEdit() {
    var changed = [];
    (editing || []).forEach(function (el) {
      var now = clean(el.innerHTML); if (now === clean(el.__before)) return;
      changed.push({ p: pathOf(el), l: el.hasAttribute('data-bn') ? lang() : 'en', h: now, o: el.__sig });
    });
    if (!changed.length) { stopEdit(); setBar('idle'); return; }
    setBar('saving');
    api('admin_content_get', { key: 'patch:' + PAGE }).then(function (r) {
      if (!r.ok) throw new Error(r.error || 'failed');
      var cur = (r.value || []).filter(function (x) { return !changed.some(function (c) { return c.p === x.p && c.l === x.l; }); });
      return api('admin_content_save', { key: 'patch:' + PAGE, value: cur.concat(changed) });
    }).then(function (r) {
      if (!r.ok) throw new Error(r.error || 'failed');
      stopEdit(); try { sessionStorage.removeItem('mfl_rl'); } catch (e) {} location.href = location.pathname;
    }).catch(function (e) { setBar('edit'); alert('Could not save: ' + e.message + (e.message === 'auth' ? ' (log in again at admin.html)' : '')); });
  }
  function resetPage() {
    if (!confirm('Remove ALL text edits made on this page and go back to the original text?')) return;
    api('admin_content_save', { key: 'patch:' + PAGE, value: [] }).then(function () { try { sessionStorage.removeItem('mfl_rl'); } catch (e) {} location.href = location.pathname; });
  }
  var bar;
  function setBar(mode) {
    if (!bar) { bar = h('div'); bar.id = 'mfl-bar'; document.body.appendChild(bar); }
    bar.textContent = ''; bar.setAttribute('data-mode', mode);
    function btn(label, fn, cls) { var b = h('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); bar.appendChild(b); }
    if (mode === 'idle') {
      bar.appendChild(h('span', 'mfl-bar-tag', 'ADMIN'));
      btn('✏️ Edit text', startEdit, 'gold');
      var a = h('a', '', 'Panel'); a.href = 'admin.html'; bar.appendChild(a);
      btn('Undo my edits', resetPage); btn('Log out', function () { try { localStorage.removeItem(TOK); } catch (e) {} api('admin_logout', {}); bar.remove(); });
    } else if (mode === 'edit') {
      bar.appendChild(h('span', 'mfl-bar-tag', 'Editing ' + (lang() === 'bn' ? '(বাংলা)' : '(English)')));
      btn('💾 Save', saveEdit, 'gold'); btn('Cancel', cancelEdit);
    } else bar.appendChild(h('span', 'mfl-bar-tag', 'Saving…'));
  }
  function initAdmin() {
    if (!token || !BASE) return;
    api('admin_ping', {}).then(function (r) {
      if (!r.ok) { try { localStorage.removeItem(TOK); } catch (e) {} return; }
      setBar('idle'); if (/[?&]mfl-edit=1/.test(location.search)) startEdit();
    }).catch(function () {});
  }

  /* ---------- start ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderAll(); applyPatches(); sync(); initAdmin();
    try { new MutationObserver(function () { renderAll(); applyPatches(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}
  });
  window.addEventListener('load', applyPatches);
})();
