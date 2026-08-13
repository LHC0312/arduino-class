/* 아두이노 기초 수업 — 공통 스크립트 */
(function () {
  'use strict';

  var STORE = 'arduino-class:v1';

  /* ---------- 저장소 ---------- */

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) {}
  }
  function get(key, fallback) {
    var v = load()[key];
    return v === undefined ? fallback : v;
  }
  function set(key, value) {
    var d = load();
    d[key] = value;
    save(d);
  }

  /* ---------- 테마 ---------- */

  function initTheme() {
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    var label = btn.querySelector('[data-theme-label]');

    function paint() {
      var dark = document.documentElement.dataset.theme === 'dark';
      if (label) label.textContent = dark ? '라이트' : '다크';
      btn.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
    }

    btn.addEventListener('click', function () {
      var dark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      set('theme', dark ? 'light' : 'dark');
      paint();
    });
    paint();
  }

  /* ---------- 사이드 레일 (모바일) ---------- */

  function initRail() {
    var btn = document.querySelector('[data-rail-toggle]');
    var rail = document.getElementById('rail');
    if (!btn || !rail) return;

    btn.addEventListener('click', function () {
      var open = rail.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    rail.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        rail.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 구문 강조 ---------- */

  var KEYWORDS = ('void int long float double char bool boolean byte unsigned const static'
    + ' if else for while do switch case break continue return true false define'
    + ' struct sizeof volatile String').split(' ');

  var FUNCS = ('setup loop pinMode digitalWrite digitalRead analogWrite analogRead delay'
    + ' delayMicroseconds millis micros Serial begin print println map constrain random'
    + ' tone noTone attachInterrupt pulseIn').split(' ');

  var CONSTS = ('HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN A0 A1 A2 A3 A4 A5 NULL').split(' ');

  var SYNTAX = new RegExp([
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)',           // 1 주석
    '("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')', // 2 문자열
    '(^[ \\t]*#[ \\t]*\\w+)',                           // 3 전처리기
    '\\b(' + KEYWORDS.join('|') + ')\\b',               // 4 키워드
    '\\b(' + FUNCS.join('|') + ')\\b(?=\\s*\\()',       // 5 함수
    '\\b(' + CONSTS.join('|') + ')\\b',                 // 6 상수
    '\\b(\\d+\\.?\\d*)\\b'                              // 7 숫자
  ].join('|'), 'gm');

  var CLASSES = [null, 't-cm', 't-st', 't-pp', 't-kw', 't-fn', 't-cn', 't-nu'];

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(src) {
    var out = '';
    var last = 0;
    var m;
    SYNTAX.lastIndex = 0;
    while ((m = SYNTAX.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      var cls = null;
      for (var g = 1; g < CLASSES.length; g++) {
        if (m[g] !== undefined) { cls = CLASSES[g]; break; }
      }
      out += cls ? '<span class="' + cls + '">' + esc(m[0]) + '</span>' : esc(m[0]);
      last = m.index + m[0].length;
      if (m[0].length === 0) SYNTAX.lastIndex++;
    }
    out += esc(src.slice(last));
    return out;
  }

  function initCode() {
    document.querySelectorAll('.code').forEach(function (block) {
      var code = block.querySelector('code');
      if (!code) return;

      var raw = code.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      code.dataset.raw = raw;
      if (!block.hasAttribute('data-plain')) {
        code.innerHTML = highlight(raw);
      } else {
        code.textContent = raw;
      }

      var btn = block.querySelector('.copy');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var done = function () {
          btn.textContent = '복사됨';
          btn.classList.add('done');
          setTimeout(function () {
            btn.textContent = '복사';
            btn.classList.remove('done');
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(raw).then(done, function () {});
        } else {
          var ta = document.createElement('textarea');
          ta.value = raw;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
    });
  }

  /* ---------- 체크리스트 ---------- */

  function initChecks() {
    document.querySelectorAll('.checks input[type="checkbox"][id]').forEach(function (box) {
      var key = 'chk:' + box.id;
      box.checked = !!get(key, false);
      box.addEventListener('change', function () { set(key, box.checked); });
    });
  }

  /* ---------- 강의 완료 표시 ---------- */

  function doneKey(id) { return 'lesson:' + id; }

  function initDone() {
    var bar = document.querySelector('[data-done-bar]');
    var id = document.body.dataset.lesson;

    if (bar && id) {
      var btn = bar.querySelector('button');
      var msg = bar.querySelector('p');

      var paint = function () {
        var d = !!get(doneKey(id), false);
        bar.classList.toggle('is-done', d);
        msg.textContent = d ? '이 강의를 완료했습니다.' : '내용을 모두 따라 했다면 완료로 표시해 두세요.';
        btn.textContent = d ? '완료 취소' : '학습 완료로 표시';
      };

      btn.addEventListener('click', function () {
        set(doneKey(id), !get(doneKey(id), false));
        paint();
        markRail();
      });
      paint();
    }
    markRail();
  }

  function markRail() {
    document.querySelectorAll('[data-lesson-id]').forEach(function (el) {
      var d = !!get(doneKey(el.dataset.lessonId), false);
      el.classList.toggle('is-done', d);
      var badge = el.querySelector('[data-done-badge]');
      if (badge) badge.textContent = d ? '✓' : '';
    });
  }

  /* ---------- 현재 섹션 하이라이트 ---------- */

  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.rail__sub a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var targets = [];
    links.forEach(function (a) {
      var el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (el) { map[el.id] = a; targets.push(el); }
    });

    var visible = new Set();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target.id);
        else visible.delete(en.target.id);
      });
      var first = targets.filter(function (t) { return visible.has(t.id); })[0];
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (first && map[first.id]) map[first.id].classList.add('is-active');
    }, { rootMargin: '-70px 0px -65% 0px' });

    targets.forEach(function (t) { obs.observe(t); });
  }

  /* ---------- 신호등 시뮬레이터 ---------- */

  var OFF = { red: '#4a3a36', yellow: '#4a4230', green: '#33422f' };
  var ON  = { red: '#e0483a', yellow: '#e8b42c', green: '#4ba35a' };

  function initTrafficSim() {
    var sim = document.getElementById('traffic-sim');
    if (!sim) return;

    var lamps = {
      red: sim.querySelector('[data-lamp="red"]'),
      yellow: sim.querySelector('[data-lamp="yellow"]'),
      green: sim.querySelector('[data-lamp="green"]')
    };
    var startBtn = sim.querySelector('[data-sim-start]');
    var speedInput = sim.querySelector('[data-sim-speed]');
    var speedOut = sim.querySelector('[data-sim-speed-out]');
    var stateOut = sim.querySelector('[data-sim-state]');

    // [켜질 램프, 기본 지속시간(ms), 설명]
    var PHASES = [
      ['green',  5000, '초록 — 통행'],
      ['yellow', 2000, '노랑 — 정지 준비'],
      ['red',    5000, '빨강 — 정지']
    ];

    var idx = 0;
    var timer = null;
    var running = false;

    function scale() { return Number(speedInput.value) || 1; }

    function paintLamps(active) {
      Object.keys(lamps).forEach(function (c) {
        var on = c === active;
        lamps[c].setAttribute('fill', on ? ON[c] : OFF[c]);
        lamps[c].style.opacity = on ? '1' : '.55';
      });
    }

    function paintState(color, ms) {
      var line = PHASES.filter(function (p) { return p[0] === color; })[0];
      stateOut.innerHTML =
        'digitalWrite(<b>' + { red: '10', yellow: '9', green: '8' }[color] + '</b>, HIGH);<br>' +
        'delay(<b>' + ms + '</b>);<br>' +
        '<span style="color:var(--ink-4)">// ' + (line ? line[2] : '') + '</span>';
    }

    function step() {
      var phase = PHASES[idx % PHASES.length];
      var ms = Math.round(phase[1] / scale());
      paintLamps(phase[0]);
      paintState(phase[0], ms);
      idx++;
      timer = setTimeout(step, ms);
    }

    function start() {
      if (running) return;
      running = true;
      startBtn.textContent = '정지';
      step();
    }

    function stop() {
      running = false;
      clearTimeout(timer);
      startBtn.textContent = '실행';
      paintLamps(null);
      stateOut.innerHTML = '<span style="color:var(--ink-4)">// 정지 상태 — 모든 LED LOW</span>';
    }

    startBtn.addEventListener('click', function () { running ? stop() : start(); });

    speedInput.addEventListener('input', function () {
      speedOut.textContent = '×' + scale().toFixed(1);
    });
    speedOut.textContent = '×' + scale().toFixed(1);

    stop();
  }

  /* ---------- LED 깜빡임 시뮬레이터 ---------- */

  function initBlinkSim() {
    var sim = document.getElementById('blink-sim');
    if (!sim) return;

    var lamp = sim.querySelector('[data-lamp="led"]');
    var glow = sim.querySelector('[data-glow]');
    var input = sim.querySelector('[data-blink-delay]');
    var out = sim.querySelector('[data-blink-out]');
    var code = sim.querySelector('[data-blink-code]');
    var toggle = sim.querySelector('[data-blink-toggle]');

    var on = false;
    var timer = null;
    var running = true;

    function ms() { return Number(input.value) || 100; }

    function tick() {
      on = !on;
      lamp.setAttribute('fill', on ? '#e0483a' : '#5a3d38');
      glow.style.opacity = on ? '.4' : '0';
      code.innerHTML = on
        ? 'digitalWrite(13, <b>HIGH</b>);'
        : 'digitalWrite(13, <b>LOW</b>);';
      timer = setTimeout(tick, ms());
    }

    input.addEventListener('input', function () {
      out.textContent = ms() + ' ms';
    });
    out.textContent = ms() + ' ms';

    toggle.addEventListener('click', function () {
      running = !running;
      toggle.textContent = running ? '정지' : '실행';
      if (running) tick();
      else {
        clearTimeout(timer);
        lamp.setAttribute('fill', '#5a3d38');
        glow.style.opacity = '0';
        code.innerHTML = '<span style="color:var(--ink-4)">// 정지</span>';
      }
    });

    tick();
  }

  /* ---------- 부팅 ---------- */

  function boot() {
    initTheme();
    initRail();
    initCode();
    initChecks();
    initDone();
    initScrollSpy();
    initTrafficSim();
    initBlinkSim();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
