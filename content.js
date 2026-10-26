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
  function applySettings(s) { if (!s) return; if (s.opensAt) C.opensAt = s.opensAt; C.closesAt = s.closesAt || ''; C.archived = !!s.archived; }
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
    s7scorers:  [['SEASON 7', 'Top Scorers', 'No Season 7 goals published yet.'], ['সিজন ৭', 'শীর্ষ গোলদাতা', 'সিজন ৭-এর কোনো গোল এখনো প্রকাশ করা হয়নি।']],
    s7motm:     [['SEASON 7', 'Man of the Match', 'No Man of the Match published yet.'], ['সিজন ৭', 'ম্যান অফ দ্য ম্যাচ', 'ম্যান অফ দ্য ম্যাচ এখনো প্রকাশ করা হয়নি।']],
    s7points:   [['SEASON 7', 'Points Table', 'Season 7 standings will appear here once the teams are announced.'], ['সিজন ৭', 'পয়েন্ট টেবিল', 'দল ঘোষণার পর সিজন ৭-এর পয়েন্ট টেবিল এখানে দেখা যাবে।']],
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
        if (t.group) { var chip = h('span', 'mfl-chip'); chip.appendChild(h('span', '', tt('Group', 'গ্রুপ'))); chip.appendChild(document.createTextNode(' ' + t.group)); c.appendChild(chip); }
        if (t.captain) { var cp = h('p'); lbl(cp, 'Captain:', 'ক্যাপ্টেন:', t.captain); c.appendChild(cp); }
        if (t.note) c.appendChild(h('p', 'mfl-muted', t.note));
        g.appendChild(c);
      }); box.appendChild(g);
    },
    s7schedule: function (box, items) {
      items.forEach(function (m) {
        var r = h('div', 'mfl-card mfl-match'), when = h('div', 'mfl-when');
        if (m.no) { lbl(when, 'Match', 'ম্যাচ', m.no); }
        var bits = [m.stage, [m.date, m.time].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');
        if (bits) when.appendChild(document.createTextNode((m.no ? ' · ' : '') + bits));
        if (when.childNodes.length) r.appendChild(when);
        r.appendChild(h('div', 'mfl-vs', (m.home || 'TBA') + '  ' + scoreOf(m) + '  ' + (m.away || 'TBA')));
        if (m.venue) r.appendChild(h('div', 'mfl-muted', m.venue));
        box.appendChild(r);
      });
    },
    s7results: function (box, items) {
      items.forEach(function (m) {
        var r = h('div', 'mfl-card mfl-match'), when = h('div', 'mfl-when');
        if (m.no) { lbl(when, 'Match', 'ম্যাচ', m.no); }
        var bits = [m.stage, m.date].filter(Boolean).join(' · ');
        if (bits) when.appendChild(document.createTextNode((m.no ? ' · ' : '') + bits));
        if (when.childNodes.length) r.appendChild(when);
        r.appendChild(h('div', 'mfl-vs', (m.home || 'TBA') + '  ' + scoreOf(m) + '  ' + (m.away || 'TBA')));
        var sh = lines(m.sh), sa = lines(m.sa);
        if (sh || sa) {
          var d = h('div', 'mfl-muted'); lbl(d, 'Scorers:', 'গোলদাতা:', '');
          if (sh) d.appendChild(h('div', 'mfl-pre', (m.home || '') + ': ' + sh));
          if (sa) d.appendChild(h('div', 'mfl-pre', (m.away || '') + ': ' + sa));
          r.appendChild(d);
        }
        var mo = h('div', 'mfl-muted'); lbl(mo, 'Man of the Match:', 'ম্যান অফ দ্য ম্যাচ:', m.motm ? m.motm : '');
        if (!m.motm) { mo.appendChild(document.createTextNode(' ')); mo.appendChild(h('span', '', tt('Not published', 'প্রকাশ করা হয়নি'))); }
        r.appendChild(mo);
        box.appendChild(r);
      });
    },
    s7motm: function (box, items) {
      var g = h('div', 'mfl-grid');
      items.forEach(function (m) {
        var c = h('div', 'mfl-card'), top = h('div', 'mfl-muted');
        if (m.no) lbl(top, 'Match', 'ম্যাচ', m.no);
        if (m.stage) top.appendChild(document.createTextNode((m.no ? ' · ' : '') + m.stage));
        c.appendChild(top); c.appendChild(h('h3', '', m.motm));
        c.appendChild(h('p', 'mfl-muted', (m.home || 'TBA') + '  ' + scoreOf(m) + '  ' + (m.away || 'TBA')));
        g.appendChild(c);
      }); box.appendChild(g);
    },
    s7points: function (box, groups) {
      var grid = h('div', 'points-grid');
      groups.forEach(function (g) {
        var card = h('div', 'points-card'), ttl = h('div', 'points-title');
        if (g.group) { ttl.appendChild(h('span', '', tt('GROUP', 'গ্রুপ'))); ttl.appendChild(document.createTextNode(' ' + g.group)); }
        else ttl.appendChild(h('span', '', tt('STANDINGS', 'স্ট্যান্ডিং')));
        card.appendChild(ttl);
        var sc = h('div', 'points-scroll'), tb = h('table', 'table standings'), hd = h('tr');
        [['Pos', 'অবস্থান'], ['Team', 'টিম'], ['P', 'খেলা'], ['W', 'জয়'], ['D', 'ড্র'], ['L', 'হার'], ['GF', 'দিয়েছে'], ['GA', 'খেয়েছে'], ['GD', 'গোল ব্যবধান'], ['Pts', 'পয়েন্ট']].forEach(function (c) { hd.appendChild(h('th', '', tt(c[0], c[1]))); });
        var th = h('thead'); th.appendChild(hd); tb.appendChild(th);
        var bd = h('tbody');
        g.rows.forEach(function (t, i) {
          var tr = h('tr'); [i + 1, null, t.p, t.w, t.d, t.l, t.gf, t.ga, (t.gd > 0 ? '+' : '') + t.gd, null].forEach(function (v, n) {
            var td = h('td'); if (n === 1) { td.appendChild(h('b', '', t.name)); } else if (n === 9) { td.appendChild(h('b', '', String(t.pts))); } else td.textContent = String(v);
            tr.appendChild(td);
          }); bd.appendChild(tr);
        });
        tb.appendChild(bd); sc.appendChild(tb); card.appendChild(sc); grid.appendChild(card);
      });
      box.appendChild(grid);
      box.appendChild(h('p', 'points-note', tt('P = Played · W = Won · D = Draw · L = Lost · GF = Goals For · GA = Goals Against · GD = Goal Difference · Pts = Points. Ranking: Points → Goal Difference → Goals For.', 'P = খেলা · W = জয় · D = ড্র · L = হার · GF = দেওয়া গোল · GA = খাওয়া গোল · GD = গোল ব্যবধান · Pts = পয়েন্ট। র‍্যাঙ্কিং: পয়েন্ট → গোল ব্যবধান → দেওয়া গোল।')));
    },
    s7scorers: function (box, items) {
      var sc = h('div', 'points-scroll'), tb = h('table', 'table standings'), hd = h('tr');
      [['Pos', 'অবস্থান'], ['Player', 'খেলোয়াড়'], ['Team', 'টিম'], ['Goals', 'গোল']].forEach(function (c) { hd.appendChild(h('th', '', tt(c[0], c[1]))); });
      var th = h('thead'); th.appendChild(hd); tb.appendChild(th); var bd = h('tbody');
      items.forEach(function (p, i) { var tr = h('tr'); [String(i + 1), p.name, p.team, String(p.goals)].forEach(function (v, n) { var td = h('td'); if (n === 1) td.appendChild(h('b', '', v)); else td.textContent = v; tr.appendChild(td); }); bd.appendChild(tr); });
      tb.appendChild(bd); sc.appendChild(tb); box.appendChild(sc);
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
  function lbl(parent, en, bn, rest) { parent.appendChild(h('span', 'mfl-lbl', tt(en, bn))); if (rest !== '' && rest != null) parent.appendChild(document.createTextNode(' ' + rest)); }
  function lines(t) { return String(t || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).join(', '); }
  function isNum(v) { return /^\d+$/.test(String(v == null ? '' : v)); }
  function hasScore(m) { return isNum(m.hs) && isNum(m.as); }
  function scoreOf(m) {
    if (!hasScore(m)) return 'vs';
    var s = m.hs + ' – ' + m.as;
    if (isNum(m.hp) && isNum(m.ap)) s += ' (' + m.hp + '–' + m.ap + ' ' + tt('pens', 'পেনাল্টি') + ')';
    return s;
  }
  function raw(k) { var c = store && store.collections && store.collections[k]; return Array.isArray(c) ? c : []; }
  function pubMatches() { return raw('s7matches').filter(function (m) { return m && m.status === 'published'; }); }
  /* Season 7 standings: 3 for a win, 1 each for a draw. Only published GROUP matches with a score count, and one match id counts once. */
  function standings() {
    var T = {}, ord = [], seen = {};
    function team(name, group) {
      var n = norm(name); if (!n) return null; var k = n.toLowerCase();
      if (!T[k]) { T[k] = { name: n, group: norm(group), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; ord.push(k); } else if (group && !T[k].group) T[k].group = norm(group);
      return T[k];
    }
    raw('s7teams').forEach(function (t) { team(t.name, t.group); });
    pubMatches().filter(function (m) { return hasScore(m) && /group/i.test(m.stage || ''); }).forEach(function (m) {
      if (seen[m.id]) return; seen[m.id] = 1;
      var a = team(m.home), b = team(m.away); if (!a || !b || a === b) return;
      var x = +m.hs, y = +m.as; a.p++; b.p++; a.gf += x; a.ga += y; b.gf += y; b.ga += x;
      if (x > y) { a.w++; b.l++; } else if (x < y) { b.w++; a.l++; } else { a.d++; b.d++; }
    });
    if (!ord.length) return [];
    var groups = {}, gord = [];
    ord.forEach(function (k) { var t = T[k]; t.gd = t.gf - t.ga; t.pts = t.w * 3 + t.d; var g = t.group || ''; if (!groups[g]) { groups[g] = []; gord.push(g); } groups[g].push(t); });
    gord.sort();
    return gord.map(function (g) { groups[g].sort(function (a, b) { return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name); }); return { group: g, rows: groups[g] }; });
  }
  function items(k) {
    if (k === 's7schedule') return pubMatches();
    if (k === 's7results') return pubMatches().filter(hasScore);
    if (k === 's7motm') return pubMatches().filter(function (m) { return norm(m.motm); });
    if (k === 's7points') return standings();
    if (k === 's7scorers') {                                  // goals are read from the "Name - 2" lines of published matches
      var T = {};
      pubMatches().forEach(function (m) {
        [[m.sh, m.home], [m.sa, m.away]].forEach(function (pr) {
          String(pr[0] || '').split(/\n+/).forEach(function (l) {
            l = norm(l); if (!l) return;
            var x = /^(.*?)[\s\-–:x×]*\(?(\d{1,2})\)?$/.exec(l), name = l, n = 1;
            if (x && norm(x[1])) { name = norm(x[1]); n = +x[2]; }
            var key = name.toLowerCase(); if (!T[key]) T[key] = { name: name, team: pr[1] || '', goals: 0 }; T[key].goals += n;
          });
        });
      });
      return Object.keys(T).map(function (k) { return T[k]; }).sort(function (a, b) { return b.goals - a.goals || a.name.localeCompare(b.name); });
    }
    return raw(k);
  }
  var ARCH = { 'results.html': [2, 3, 4], 'schedule.html': [2], 'teams.html': [1, 2], 'awards.html': [1], 'scorer.html': [1] };
  function applyArchive() {
    var idx = ARCH[PAGE]; if (!idx || RAW) return;
    var view6 = /[?&]season=6\b/.test(location.search), on = !!C.archived && !view6;
    var secs = document.querySelectorAll('main > section');
    idx.forEach(function (i) { if (secs[i]) secs[i].classList.toggle('mfl-s6-hidden', on); });
    var an = document.querySelector('main > .wrap > .archive-notice'); if (an) an.parentNode.classList.toggle('mfl-s6-hidden', on);
    var old = document.querySelector('.mfl-archive-bar'); if (old) old.remove();
    if (!C.archived) return;
    var bar = h('div', 'mfl-archive-bar'), a = h('a');
    bar.appendChild(h('span', '', view6 ? tt('You are viewing the Season 6 archive.', 'আপনি সিজন ৬ আর্কাইভ দেখছেন।') : tt('Season 6 has been moved to the archive.', 'সিজন ৬ আর্কাইভে সরানো হয়েছে।')));
    a.href = view6 ? PAGE : PAGE + '?season=6'; a.textContent = view6 ? tt('Back to Season 7', 'সিজন ৭-এ ফিরুন') : tt('View the Season 6 archive', 'সিজন ৬ আর্কাইভ দেখুন');
    bar.appendChild(a); var m = document.querySelector('main'); if (m) m.insertBefore(bar, m.firstChild);
  }
  window.MFL_items = function (k) { return items(k); };
  window.MFL_render = function () { renderAll(); };
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
      if (!box.hasAttribute('data-nohead')) { var head = h('div', 'mfl-head'); head.appendChild(h('div', 'eyebrow', tx[L][0])); head.appendChild(h('h2', '', tx[L][1])); w.appendChild(head); }
      if (main.length) { var body = h('div', 'mfl-body'); fn(body, main); w.appendChild(body); }
      else w.appendChild(h('div', 'mfl-empty', tx[L][2]));
      if (six.length) { var h6 = h('div', 'mfl-head'); h6.appendChild(h('div', 'eyebrow', tt('SEASON 6 ARCHIVE', 'সিজন ৬ আর্কাইভ'))); w.appendChild(h6); var b6 = h('div', 'mfl-body'); fn(b6, six); w.appendChild(b6); }
    });
    notice(); applyArchive();
    try { document.dispatchEvent(new Event('mfl:data')); } catch (e) {}
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
    if (RAW) return;
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
      var tp = (old.tp && typeof old.tp === 'object') ? old.tp : {}; tp[PAGE] = (d.texts && d.texts.p) || [];
      store = { settings: d.settings, collections: d.collections, patches: patches, tg: (d.texts && d.texts.g) || [], tp: tp, v: d.v };
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
      if (needReload) {                                       // once per change, so the form opens/locks right away
        var tag = JSON.stringify([d.settings.opensAt, d.settings.closesAt, patches[PAGE].length]);
        if (sessionStorage.getItem('mfl_rl') !== tag) { try { sessionStorage.setItem('mfl_rl', tag); } catch (e) {} location.reload(); return; }
      }
      applySettings(d.settings);                                // archive switch etc. take effect on the first visit
      renderAll(); applyPatches(); buildRules(); applyRules();
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
    if (!token || !BASE || RAW) return;
    api('admin_ping', {}).then(function (r) {
      if (!r.ok) { try { localStorage.removeItem(TOK); } catch (e) {} return; }
      setBar('idle'); if (/[?&]mfl-edit=1/.test(location.search)) startEdit();
    }).catch(function () {});
  }


  /* ---------- 4. text rules: every word on every page can be changed from the admin panel ---------- */
  var RAW = /[?&]mfl-raw=1/.test(location.search);          // the admin panel opens pages like this to read the ORIGINAL text
  var TR = { en: {}, bn: {} }, trTmr = 0, SKIPT = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, TEMPLATE: 1 };
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function buildRules() {
    TR = { en: {}, bn: {} };
    if (!store) return;
    [store.tg || [], (store.tp && store.tp[PAGE]) || []].forEach(function (list) {   // page rules come last, so they win
      list.forEach(function (r) {
        var kind = r.a || '';
        if (r.en && r.k) TR.en[kind + '\u0001' + r.k] = r.en;
        if (r.bn && r.kb) TR.bn[kind + '\u0001' + r.kb] = r.bn;
      });
    });
  }
  function applyRules() {
    if (RAW || !document.body) return;
    var L = lang() === 'bn' ? TR.bn : TR.en;
    if (!Object.keys(L).length) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, nodes = [];
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (n) {
      var p = n.parentNode; if (!p || SKIPT[p.nodeName]) return;
      if (p.closest && p.closest('#mfl-bar,[contenteditable],[data-mfl]')) return;
      var raw = n.nodeValue, s = norm(raw); if (!s) return;
      var rep = L['\u0001' + s];
      if (rep && rep !== s) n.nodeValue = raw.match(/^\s*/)[0] + rep + raw.match(/\s*$/)[0];
    });
    function attr(sel, name, kind) {
      document.querySelectorAll(sel).forEach(function (e) {
        var v = e.getAttribute(name), r = L[kind + '\u0001' + norm(v)];
        if (r && r !== v) e.setAttribute(name, r);
      });
    }
    attr('[placeholder]', 'placeholder', 'ph'); attr('img[alt]', 'alt', 'alt'); attr('[aria-label]', 'aria-label', 'aria');
    var tr = L['ttl\u0001' + norm(document.title)]; if (tr && tr !== document.title) document.title = tr;
    var md = document.querySelector('meta[name="description"]');
    if (md) { var r2 = TR.en['md\u0001' + norm(md.getAttribute('content'))]; if (r2 && r2 !== md.getAttribute('content')) md.setAttribute('content', r2); }
  }
  var trN = 0, trT0 = 0;
  function scheduleRules() {
    var now = Date.now(); if (now - trT0 > 3000) { trT0 = now; trN = 0; }
    if (++trN > 25) return;                                   // safety: never loop
    clearTimeout(trTmr); trTmr = setTimeout(applyRules, 120);
  }
  window.MFL_applyRules = function () { buildRules(); applyRules(); };
  try { buildRules(); } catch (e) {}

  /* ---------- start ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderAll(); applyPatches(); buildRules(); applyRules(); sync(); initAdmin();
    try { new MutationObserver(function () { renderAll(); applyPatches(); buildRules(); applyRules(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}
    try { new MutationObserver(scheduleRules).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'alt', 'aria-label'] }); } catch (e) {}
  });
  window.addEventListener('load', function () { applyPatches(); applyRules(); });
})();
