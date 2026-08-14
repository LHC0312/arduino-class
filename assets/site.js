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

  var KEYWORDS = ('uint16_t uint32_t uint8_t int16_t int32_t int8_t'
    + ' void int long float double char bool boolean byte unsigned const static'
    + ' if else for while do switch case break continue return true false define'
    + ' struct sizeof volatile String').split(' ');

  var FUNCS = ('setup loop pinMode digitalWrite digitalRead analogWrite analogRead delay'
    + ' delayMicroseconds millis micros Serial begin print println map constrain random'
    + ' tone noTone attachInterrupt pulseIn sqrt abs min max atan2'
    + ' beginTransmission endTransmission requestFrom available write read').split(' ');

  var CONSTS = ('HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN A0 A1 A2 A3 A4 A5 NULL'
    + ' HEX DEC BIN PI').split(' ');

  var PY_KEYWORDS = ('import from as def class return if elif else for while in is not and or'
    + ' with lambda pass break continue global try except finally raise yield assert del').split(' ');

  // [클래스, 패턴] 목록으로 렉서를 만듭니다.
  function makeLexer(specs) {
    var re = new RegExp(specs.map(function (s) { return '(' + s[1] + ')'; }).join('|'), 'gm');
    return { re: re, cls: [null].concat(specs.map(function (s) { return s[0]; })) };
  }

  var LEX_C = makeLexer([
    ['t-cm', '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'],
    ['t-st', '"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\''],
    ['t-pp', '^[ \\t]*#[ \\t]*\\w+'],
    ['t-kw', '\\b(?:' + KEYWORDS.join('|') + ')\\b'],
    ['t-fn', '\\b(?:' + FUNCS.join('|') + ')\\b(?=\\s*\\()'],
    ['t-cn', '\\b(?:' + CONSTS.join('|') + ')\\b'],
    ['t-nu', '\\b(?:0[xX][0-9a-fA-F]+|\\d+\\.?\\d*)\\b']
  ]);

  var LEX_PY = makeLexer([
    ['t-pp', '^[ \\t]*[!%][^\\n]*'],                      // 코랩 셸 명령 (!pip …)
    ['t-cm', '#[^\\n]*'],
    ['t-st', '[fFrRbB]?"""[\\s\\S]*?"""|[fFrRbB]?\'\'\'[\\s\\S]*?\'\'\''
           + '|[fFrRbB]?"(?:\\\\.|[^"\\\\])*"|[fFrRbB]?\'(?:\\\\.|[^\'\\\\])*\''],
    ['t-cn', '\\b(?:True|False|None)\\b'],
    ['t-kw', '\\b(?:' + PY_KEYWORDS.join('|') + ')\\b'],
    ['t-fn', '\\b[A-Za-z_]\\w*(?=\\s*\\()'],              // 호출되는 이름
    ['t-nu', '\\b(?:\\d+\\.?\\d*)\\b']
  ]);

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(src, lex) {
    var out = '';
    var last = 0;
    var m;
    lex.re.lastIndex = 0;
    while ((m = lex.re.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      var cls = null;
      for (var g = 1; g < lex.cls.length; g++) {
        if (m[g] !== undefined) { cls = lex.cls[g]; break; }
      }
      out += cls ? '<span class="' + cls + '">' + esc(m[0]) + '</span>' : esc(m[0]);
      last = m.index + m[0].length;
      if (m[0].length === 0) lex.re.lastIndex++;
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
        code.innerHTML = highlight(raw, block.dataset.lang === 'py' ? LEX_PY : LEX_C);
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

  /* ---------- 부저 (Web Audio로 소리 흉내) ---------- */

  var audio = null;

  function tone(freq, ms, done) {
    try {
      if (!audio) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio = new AC();
      }
      if (audio.state === 'suspended') audio.resume();

      var t = audio.currentTime;
      var dur = ms / 1000;
      var osc = audio.createOscillator();
      var gain = audio.createGain();

      osc.type = 'square';             // 부저 소리에 가까운 사각파
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
      gain.gain.setValueAtTime(0.09, t + Math.max(dur - 0.03, 0.02));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      if (done) setTimeout(done, ms);
    } catch (e) { if (done) setTimeout(done, ms); }
  }

  function initBuzzerSim() {
    var sim = document.getElementById('buzzer-sim');
    if (!sim) return;

    var out = sim.querySelector('[data-buzz-out]');
    var keys = Array.prototype.slice.call(sim.querySelectorAll('.key'));

    function show(freq, note) {
      if (!out) return;
      out.innerHTML = freq
        ? 'tone(<b>7</b>, <b>' + freq + '</b>, 300);<br><span style="color:var(--ink-4)">// ' + note + '</span>'
        : '<span style="color:var(--ink-4)">// 건반을 누르면 해당 tone() 명령이 표시됩니다</span>';
    }

    keys.forEach(function (k) {
      k.addEventListener('click', function () {
        var f = Number(k.dataset.note);
        tone(f, 320);
        show(f, k.dataset.label || '');
        k.classList.add('is-on');
        setTimeout(function () { k.classList.remove('is-on'); }, 320);
      });
    });

    // 멜로디 재생 — 학교종
    var melody = sim.querySelector('[data-melody]');
    if (melody) {
      var NOTES = [392, 392, 440, 440, 392, 392, 330, 0,
                   392, 392, 330, 330, 294, 0, 0, 0];
      var busy = false;

      melody.addEventListener('click', function () {
        if (busy) return;
        busy = true;
        melody.disabled = true;
        var i = 0;

        (function next() {
          if (i >= NOTES.length) {
            busy = false;
            melody.disabled = false;
            show(null);
            return;
          }
          var f = NOTES[i++];
          if (!f) { show(null); setTimeout(next, 340); return; }
          var key = keys.filter(function (k) { return Number(k.dataset.note) === f; })[0];
          if (key) {
            key.classList.add('is-on');
            setTimeout(function () { key.classList.remove('is-on'); }, 300);
          }
          show(f, key ? key.dataset.label : '');
          tone(f, 300, function () { setTimeout(next, 40); });
        })();
      });
    }

    show(null);
  }

  /* ---------- 버튼 입력 시뮬레이터 ---------- */

  function initButtonSim() {
    var sim = document.getElementById('button-sim');
    if (!sim) return;

    var btn = sim.querySelector('[data-push]');
    var lamp = sim.querySelector('[data-lamp="btn-led"]');
    var glow = sim.querySelector('[data-glow]');
    var stateOut = sim.querySelector('[data-btn-state]');
    var labels = Array.prototype.slice.call(sim.querySelectorAll('.seg label'));

    var mode = 'pulldown';   // 'pulldown' | 'pullup'
    var down = false;

    function paint() {
      // 풀다운: 눌리면 HIGH / 풀업: 눌리면 LOW
      var reading = (mode === 'pulldown') ? (down ? 'HIGH' : 'LOW')
                                          : (down ? 'LOW' : 'HIGH');
      var pressed = down;

      lamp.setAttribute('fill', pressed ? '#e0483a' : '#5a3d38');
      glow.style.opacity = pressed ? '.4' : '0';
      btn.classList.toggle('is-down', pressed);

      var cond = (mode === 'pulldown') ? 'HIGH' : 'LOW';
      stateOut.innerHTML =
        'digitalRead(2) → <b>' + reading + '</b><br>' +
        'if (digitalRead(2) == ' + cond + ') → <b>' + (reading === cond ? '참' : '거짓') + '</b><br>' +
        '<span style="color:var(--ink-4)">// LED ' + (pressed ? '켜짐' : '꺼짐') + '</span>';
    }

    function press(v) { down = v; paint(); }

    btn.addEventListener('mousedown', function () { press(true); });
    btn.addEventListener('touchstart', function (e) { e.preventDefault(); press(true); }, { passive: false });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (ev) {
      btn.addEventListener(ev, function () { press(false); });
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(true); }
    });
    btn.addEventListener('keyup', function () { press(false); });

    labels.forEach(function (lab) {
      lab.addEventListener('click', function () {
        mode = lab.dataset.mode;
        labels.forEach(function (l) { l.classList.toggle('is-sel', l === lab); });
        var input = lab.querySelector('input');
        if (input) input.checked = true;
        paint();
      });
    });
    labels.forEach(function (l) { l.classList.toggle('is-sel', l.dataset.mode === mode); });

    paint();
  }

  /* ---------- 보행자 버튼 신호등 시뮬레이터 ---------- */

  function initCrossSim() {
    var sim = document.getElementById('cross-sim');
    if (!sim) return;

    var lamps = {
      red: sim.querySelector('[data-lamp="red"]'),
      yellow: sim.querySelector('[data-lamp="yellow"]'),
      green: sim.querySelector('[data-lamp="green"]')
    };
    var btn = sim.querySelector('[data-push]');
    var stateOut = sim.querySelector('[data-cross-state]');
    var beepBox = sim.querySelector('[data-cross-beep]');

    var YELLOW_MS = 2000, RED_MS = 5000;
    var state = 'WAIT_GREEN';
    var timer = null;

    function paintLamps(active) {
      Object.keys(lamps).forEach(function (c) {
        var on = c === active;
        lamps[c].setAttribute('fill', on ? ON[c] : OFF[c]);
        lamps[c].style.opacity = on ? '1' : '.55';
      });
    }

    function say(html) { stateOut.innerHTML = html; }

    function toGreen() {
      state = 'WAIT_GREEN';
      paintLamps('green');
      btn.disabled = false;
      btn.classList.remove('is-down');
      say('state = <b>WAIT_GREEN</b><br>digitalWrite(8, HIGH);<br>' +
          '<span style="color:var(--ink-4)">// 버튼이 눌리기를 기다리는 중</span>');
    }

    function toYellow() {
      state = 'TO_YELLOW';
      paintLamps('yellow');
      btn.disabled = true;
      if (beepBox && beepBox.checked) tone(880, 120);
      say('state = <b>TO_YELLOW</b><br>digitalWrite(9, HIGH);<br>' +
          '<span style="color:var(--ink-4)">// ' + (YELLOW_MS / 1000) + '초 뒤 빨강으로</span>');
      timer = setTimeout(toRed, YELLOW_MS);
    }

    function toRed() {
      state = 'TO_RED';
      paintLamps('red');
      say('state = <b>TO_RED</b><br>digitalWrite(10, HIGH);<br>' +
          '<span style="color:var(--ink-4)">// ' + (RED_MS / 1000) + '초 뒤 다시 초록으로</span>');

      if (beepBox && beepBox.checked) {
        var n = 0;
        var beep = setInterval(function () {
          if (++n > 5 || state !== 'TO_RED') { clearInterval(beep); return; }
          tone(1200, 90);
        }, 800);
      }
      timer = setTimeout(toGreen, RED_MS);
    }

    function pressed() {
      if (state !== 'WAIT_GREEN') return;
      btn.classList.add('is-down');
      if (beepBox && beepBox.checked) tone(1568, 80);
      setTimeout(function () { btn.classList.remove('is-down'); }, 140);
      clearTimeout(timer);
      toYellow();
    }

    btn.addEventListener('click', pressed);

    var reset = sim.querySelector('[data-cross-reset]');
    if (reset) reset.addEventListener('click', function () { clearTimeout(timer); toGreen(); });

    toGreen();
  }

  /* ---------- 자기장 센서 시리얼 플로터 시뮬레이터 ---------- */

  function initPlotSim() {
    var sim = document.getElementById('plot-sim');
    if (!sim) return;

    var N = 110;
    var series = { x: [], y: [], z: [] };
    var paths = {
      x: sim.querySelector('[data-plot="x"]'),
      y: sim.querySelector('[data-plot="y"]'),
      z: sim.querySelector('[data-plot="z"]')
    };
    var readout = sim.querySelector('[data-plot-read]');
    var dist = sim.querySelector('[data-plot-dist]');
    var distOut = sim.querySelector('[data-plot-dist-out]');
    var toggle = sim.querySelector('[data-plot-toggle]');

    var W = 640, H = 220, BASE = 512;
    var running = true, timer = null, phase = 0;

    function strength() {
      // 슬라이더: 0(멀리) ~ 100(가까이)
      return Number(dist.value) / 100;
    }

    function push(arr, v) {
      arr.push(v);
      if (arr.length > N) arr.shift();
    }

    function toPath(arr) {
      if (!arr.length) return '';
      var step = W / (N - 1);
      var d = '';
      for (var i = 0; i < arr.length; i++) {
        // 0~1023 → 아래에서 위로
        var px = i * step;
        var py = H - (arr[i] / 1023) * H;
        d += (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
      }
      return d;
    }

    function tick() {
      phase += 0.09;
      var s = strength();
      var noise = function () { return (Math.random() - 0.5) * 14; };

      var vx = BASE + s * 300 * Math.sin(phase) + noise();
      var vy = BASE + s * 210 * Math.cos(phase * 0.7) + noise();
      var vz = BASE - s * 260 + noise();

      var clamp = function (v) { return Math.max(0, Math.min(1023, Math.round(v))); };
      vx = clamp(vx); vy = clamp(vy); vz = clamp(vz);

      push(series.x, vx); push(series.y, vy); push(series.z, vz);
      paths.x.setAttribute('d', toPath(series.x));
      paths.y.setAttribute('d', toPath(series.y));
      paths.z.setAttribute('d', toPath(series.z));

      var mag = Math.round(Math.sqrt(
        Math.pow(vx - BASE, 2) + Math.pow(vy - BASE, 2) + Math.pow(vz - BASE, 2)
      ));
      readout.innerHTML =
        'X:' + vx + '  Y:' + vy + '  Z:' + vz + '<br>' +
        '<span style="color:var(--ink-4)">// 세기 = ' + mag +
        (mag > 220 ? '  ← 임계값 초과, 자석 감지!' : '') + '</span>';

      timer = setTimeout(tick, 70);
    }

    dist.addEventListener('input', function () {
      distOut.textContent = Number(dist.value) === 0 ? '없음' : Number(dist.value) + '%';
    });
    distOut.textContent = Number(dist.value) === 0 ? '없음' : Number(dist.value) + '%';

    toggle.addEventListener('click', function () {
      running = !running;
      toggle.textContent = running ? '정지' : '실행';
      if (running) tick(); else clearTimeout(timer);
    });

    tick();
  }

  /* ---------- 최소제곱 직선 맞추기 시뮬레이터 ---------- */

  function initFitSim() {
    var sim = document.getElementById('fit-sim');
    if (!sim) return;

    // 08강 실습에 쓰는 것과 같은 데이터
    var RAW  = [111, 124, 132, 145, 152, 165, 173, 186];
    var TEMP = [5, 10, 15, 20, 25, 30, 35, 40];

    // 최소제곱 해를 데이터에서 직접 구합니다 (페이지의 실습 결과와 같은 값)
    var BEST_A, BEST_B, BEST_SSE;
    (function () {
      var n = RAW.length, sx = 0, sy = 0, i;
      for (i = 0; i < n; i++) { sx += RAW[i]; sy += TEMP[i]; }
      var mx = sx / n, my = sy / n, sxy = 0, sxx = 0;
      for (i = 0; i < n; i++) {
        sxy += (RAW[i] - mx) * (TEMP[i] - my);
        sxx += (RAW[i] - mx) * (RAW[i] - mx);
      }
      BEST_A = sxy / sxx;
      BEST_B = my - BEST_A * mx;
      BEST_SSE = 0;
      for (i = 0; i < n; i++) {
        var e = TEMP[i] - (BEST_A * RAW[i] + BEST_B);
        BEST_SSE += e * e;
      }
    })();

    var slA = sim.querySelector('[data-fit-a]');
    var slB = sim.querySelector('[data-fit-b]');
    var outA = sim.querySelector('[data-fit-a-out]');
    var outB = sim.querySelector('[data-fit-b-out]');
    var line = sim.querySelector('[data-fit-line]');
    var res  = sim.querySelector('[data-fit-res]');
    var info = sim.querySelector('[data-fit-info]');
    var best = sim.querySelector('[data-fit-best]');

    // 데이터 좌표 → 그림 좌표
    var X0 = 100, X1 = 200, Y0 = 0, Y1 = 45;
    var PX0 = 60, PX1 = 490, PY0 = 30, PY1 = 270;
    function px(x) { return PX0 + (x - X0) / (X1 - X0) * (PX1 - PX0); }
    function py(y) { return PY1 - (y - Y0) / (Y1 - Y0) * (PY1 - PY0); }

    // 점 찍기
    var dots = '';
    for (var i = 0; i < RAW.length; i++) {
      dots += '<circle cx="' + px(RAW[i]).toFixed(1) + '" cy="' + py(TEMP[i]).toFixed(1)
            + '" r="5" fill="#d97757" stroke="#26251f" stroke-width="1"/>';
    }
    var dotG = sim.querySelector('[data-fit-dots]');
    if (dotG) dotG.innerHTML = dots;

    function paint() {
      var a = Number(slA.value), b = Number(slB.value);
      outA.textContent = a.toFixed(3);
      outB.textContent = b.toFixed(2);

      line.setAttribute('x1', px(X0).toFixed(1));
      line.setAttribute('y1', py(a * X0 + b).toFixed(1));
      line.setAttribute('x2', px(X1).toFixed(1));
      line.setAttribute('y2', py(a * X1 + b).toFixed(1));

      var sse = 0, d = '';
      for (var i = 0; i < RAW.length; i++) {
        var pred = a * RAW[i] + b;
        var e = TEMP[i] - pred;
        sse += e * e;
        d += 'M' + px(RAW[i]).toFixed(1) + ' ' + py(TEMP[i]).toFixed(1)
           + 'L' + px(RAW[i]).toFixed(1) + ' ' + py(pred).toFixed(1);
      }
      res.setAttribute('d', d);

      var close = sse < BEST_SSE * 1.5;
      info.innerHTML =
        '온도 = <b>' + a.toFixed(3) + '</b> × raw + <b>' + b.toFixed(2) + '</b><br>'
        + '오차 제곱합 SSE = <b style="color:' + (close ? 'var(--ok)' : 'var(--accent)') + '">'
        + sse.toFixed(2) + '</b><br>'
        + '<span style="color:var(--ink-4)">// '
        + (close ? '거의 최적입니다' : '가장 작은 값은 ' + BEST_SSE.toFixed(2) + ' 입니다')
        + '</span>';
    }

    slA.addEventListener('input', paint);
    slB.addEventListener('input', paint);

    if (best) {
      best.addEventListener('click', function () {
        slA.value = BEST_A;
        slB.value = BEST_B;
        paint();
      });
    }

    paint();
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
    initBuzzerSim();
    initButtonSim();
    initCrossSim();
    initPlotSim();
    initFitSim();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
