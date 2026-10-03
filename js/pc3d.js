// ===== Tiny Desktop - 3D PC =====
// The physical machine around the virtual screen: a beige all-in-one CRT
// computer with keyboard and mouse on a desk at night (brass desk lamp,
// moonlight through window blinds, a mug of coffee, floppies, dust in the air).
//
// Rendering: three.js, loaded from the CDN through the import map in
// index.html; the scene itself is js/pc3d-scene.js. Every frame is drawn at
// full resolution, and only when something changes (the camera, the tube's
// colour, the disk LED). Without WebGL2 or the network the page falls back
// to the flat 2D monitor.
//
// The real DOM #screen is laid onto the tube glass with a CSS homography that
// is computed from the same camera, so the desktop stays fully interactive.
// At the seated "home" view that transform is an integer translate, keeping
// pixel text crisp and every existing clientX-based drag handler exact.
(function () {
  'use strict';

  var canvas = document.getElementById('pc3d-canvas');
  var dustCv = document.getElementById('pc3d-dust');
  var monitor = document.getElementById('monitor');
  var screenEl = document.getElementById('screen');
  var hintEl = document.getElementById('pc3d-hint');
  var body = document.body;

  // ----- Power-on gate: boot.js starts printing once the tube lights up -----
  var powered = false, powerWaiters = [];
  window._pc3dPowerOn = function (cb) {
    if (powered) cb(); else powerWaiters.push(cb);
  };
  function firePower() {
    if (powered) return;
    powered = true;
    var w = powerWaiters; powerWaiters = [];
    for (var i = 0; i < w.length; i++) { try { w[i](); } catch (e) {} }
  }

  var started = false, failed = false;
  function fallback(why) {
    if (failed) return;
    failed = true;
    if (why && window.console) console.warn('[pc3d] using the 2D monitor:', why);
    body.classList.remove('pc3d', 'pc3d-off', 'pc3d-away', 'pc3d-live', 'pc3d-dragging');
    if (monitor) monitor.style.transform = '';
    firePower();
  }
  if (!canvas || !monitor || !screenEl) { fallback('missing elements'); return; }

  if (!window.PC3DScene || !window.WebGL2RenderingContext) { fallback('WebGL2 unavailable'); return; }

  body.classList.add('pc3d', 'pc3d-off');
  // three.js comes over the network; give a slow connection some time
  var failTimer = setTimeout(function () { if (!started) fallback('three.js did not load in time'); }, 15000);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fallback('context lost'); });

  // ===== World constants (metres; desk top y=0, PC front face z=0) =====
  // Must match js/pc3d-scene.js. The DOM screen (440x330 CSS px) spans W_S x H_S.
  var W_S = 0.27, H_S = 0.2025, YS = 0.205, ZD = -0.006;
  var PIVOT = [0.0, 0.16, 0.03];
  var HOME_D = 1.05, HOME_X = 0.10;
  var SCR_W = 440, SCR_H = 330;
  var XW = -1.05, BP = 0.034, WZ = [-0.56, 0.95], WY = [0.10, 1.65];
  var MOON_L = norm3([-0.78, 0.50, 0.35]);
  var LA = [-0.39, 0.40, -0.09];
  var LD = norm3([-0.15 - LA[0], 0.0 - LA[1], 0.14 - LA[2]]);
  var LP = [LA[0] + LD[0] * 0.045, LA[1] + LD[1] * 0.045, LA[2] + LD[2] * 0.045];
  var MUG = [-0.262, 0.0, 0.100];

  function norm3(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }

  // ===== Texture atlas: key legends, sticky note, badge, floppy labels, poster =====
  function buildAtlas() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    var x = c.getContext('2d');
    var sans = 'Helvetica, Arial, sans-serif';
    var hand = '"Marker Felt", "Comic Sans MS", "Chalkboard SE", cursive';
    var pix = '"Press Start 2P", monospace';

    // legends: white on transparent (alpha is the mask)
    var keys = '`1234567890-=QWERTYUIOP[]ASDFGHJKL;\'ZXCVBNM,./';
    var shifted = { '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&',
      '8': '*', '9': '(', '0': ')', '-': '_', '=': '+', '[': '{', ']': '}', ';': ':', "'": '"',
      ',': '<', '.': '>', '/': '?' };
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (var i = 0; i < keys.length; i++) {
      var cx = (i % 8) * 64 + 32, cy = Math.floor(i / 8) * 64 + 32, ch = keys[i];
      if (shifted[ch]) {
        x.font = 'bold 18px ' + sans;
        x.fillText(shifted[ch], cx, cy - 11);
        x.fillText(ch, cx, cy + 12);
      } else {
        x.font = 'bold 26px ' + sans;
        x.fillText(ch, cx, cy + 1);
      }
    }
    var words = { 46: 'DELETE', 47: 'TAB', 49: 'CAPS', 50: 'RETURN', 51: 'SHIFT', 52: 'CTRL', 54: 'ALT' };
    x.textAlign = 'left';
    x.font = 'bold 11px ' + sans;
    for (var k in words) {
      var id = +k;
      x.fillText(words[k], (id % 8) * 64 + 7, Math.floor(id / 8) * 64 + 46);
    }
    x.font = 'bold 18px ' + sans;
    x.fillText('|', (48 % 8) * 64 + 12, Math.floor(48 / 8) * 64 + 20);
    x.fillText('\\', (48 % 8) * 64 + 12, Math.floor(48 / 8) * 64 + 44);
    // command key: the TinyOS diamond
    var dx = (53 % 8) * 64 + 20, dy = Math.floor(53 / 8) * 64 + 40;
    x.beginPath(); x.moveTo(dx, dy - 9); x.lineTo(dx + 9, dy); x.lineTo(dx, dy + 9); x.lineTo(dx - 9, dy); x.closePath();
    x.lineWidth = 3; x.strokeStyle = '#fff'; x.stroke();

    // sticky note (512,0 256x256)
    var g = x.createLinearGradient(512, 0, 768, 256);
    g.addColorStop(0, '#f7e98a'); g.addColorStop(1, '#e9d160');
    x.fillStyle = g; x.fillRect(512, 0, 256, 256);
    x.fillStyle = 'rgba(120,90,0,0.10)'; x.fillRect(512, 0, 256, 34);
    x.save();
    x.translate(640, 128); x.rotate(-0.06);
    x.fillStyle = '#1f2d6b'; x.textAlign = 'center';
    x.font = 'bold 50px ' + hand; x.fillText('BACK UP', 0, -40);
    x.font = 'bold 46px ' + hand; x.fillText('FRIDAY!', 0, 22);
    x.lineWidth = 5; x.strokeStyle = '#1f2d6b';
    x.beginPath(); x.moveTo(-80, 58); x.quadraticCurveTo(0, 70, 86, 52); x.stroke();
    x.restore();

    // badge (768,0 128x128)
    x.fillStyle = '#2b2a2e'; roundRect(x, 768, 0, 128, 128, 26); x.fill();
    x.save();
    x.translate(832, 64); x.rotate(Math.PI / 4);
    var dg = x.createLinearGradient(-34, -34, 34, 34);
    dg.addColorStop(0, '#00e5ff'); dg.addColorStop(0.5, '#ff71ce'); dg.addColorStop(1, '#b967ff');
    x.fillStyle = dg; x.fillRect(-32, -32, 64, 64);
    x.restore();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 44px ' + sans; x.fillText('T', 832, 66);

    // floppy labels (512+170i, 256, 170x113)
    var labels = [['SYSTEM', 'DISK 1', '#d83a3a'], ['GAMES!!', 'kage2', '#2c7bd6'], ['BACKUP', '6/94', '#2aa35a']];
    for (var li = 0; li < 3; li++) {
      var lx = 512 + 170 * li;
      x.fillStyle = '#f2efe6'; x.fillRect(lx, 256, 170, 113);
      x.fillStyle = labels[li][2]; x.fillRect(lx, 256, 170, 16);
      x.strokeStyle = 'rgba(80,110,170,0.35)'; x.lineWidth = 1.5;
      for (var ly = 300; ly < 369; ly += 20) { x.beginPath(); x.moveTo(lx + 8, ly); x.lineTo(lx + 162, ly); x.stroke(); }
      x.fillStyle = '#222'; x.textAlign = 'center';
      x.font = 'bold 30px ' + hand; x.fillText(labels[li][0], lx + 85, 312);
      x.font = '24px ' + hand; x.fillText(labels[li][1], lx + 85, 346);
    }

    // poster (0,512 360x504) — pixel art drawn small, scaled up crisp
    var pc = document.createElement('canvas');
    pc.width = 90; pc.height = 126;
    var y = pc.getContext('2d');
    var sky = y.createLinearGradient(0, 0, 0, 126);
    sky.addColorStop(0, '#1b4a98'); sky.addColorStop(0.55, '#5fa8e8'); sky.addColorStop(1, '#c4e8ff');
    y.fillStyle = sky; y.fillRect(0, 0, 90, 126);
    y.fillStyle = '#ffe98a'; y.fillRect(66, 24, 10, 10); y.fillRect(64, 26, 14, 6); y.fillRect(68, 22, 6, 14);
    y.fillStyle = '#ffffff';
    [[6, 40, 18], [52, 52, 22], [14, 96, 26], [60, 104, 20]].forEach(function (cl) {
      y.fillRect(cl[0], cl[1], cl[2], 4); y.fillRect(cl[0] + 3, cl[1] - 3, cl[2] - 8, 3);
    });
    y.fillStyle = '#6b4a2b';
    for (var r = 0; r < 14; r++) y.fillRect(22 + r, 78 + r, 46 - 2 * r, 1);
    y.fillStyle = '#4caf50'; y.fillRect(20, 74, 50, 5);
    y.fillStyle = '#9aa7b8'; y.fillRect(34, 56, 22, 18); y.fillRect(30, 50, 6, 24); y.fillRect(54, 50, 6, 24); y.fillRect(42, 44, 6, 12);
    y.fillStyle = '#c0504d'; y.fillRect(29, 47, 8, 3); y.fillRect(53, 47, 8, 3); y.fillRect(41, 41, 8, 3);
    y.fillStyle = '#2a3140'; y.fillRect(43, 64, 4, 10);
    y.fillStyle = '#e8e2d0'; y.fillRect(24, 64, 3, 10); y.fillRect(20, 62, 11, 1); y.fillRect(25, 58, 1, 9);
    y.fillStyle = '#9ad8ff'; y.fillRect(66, 79, 2, 40); y.fillStyle = '#ffffff'; y.fillRect(66, 84, 1, 30);
    y.fillStyle = 'rgba(0,0,0,0.35)'; y.fillRect(0, 0, 90, 20);
    y.font = '8px ' + pix; y.textAlign = 'center'; y.textBaseline = 'top';
    y.fillStyle = '#1a1030'; y.fillText('SKYHOLM', 46, 7);
    y.fillStyle = '#ffffff'; y.fillText('SKYHOLM', 45, 6);
    y.font = '4px ' + pix; y.fillStyle = '#10253f'; y.fillText('A TINYOS ORIGINAL', 45, 118);
    x.imageSmoothingEnabled = false;
    x.drawImage(pc, 0, 512, 360, 504);

    return c;
  }
  function roundRect(x, l, t, w, h, r) {
    x.beginPath();
    x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
    x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
  }

  // ===== Camera =====
  // cam = { pos:[x,y,z], yaw, pitch, f (px), px, py (principal point, CSS px) }
  // yaw/pitch = Ry(yaw)*Rx(pitch); the camera looks down -Z of that frame.
  var vw = 0, vh = 0, dpr = 1;
  var home = null, homeOrb = null;
  var mode = 'wait';           // wait | intro | home | orbit | return
  var lift = 1;                // 0 = seated home view, 1 = free orbit camera
  var orb = { a: 0, b: 0, d: 1 }, orbT = { a: 0, b: 0, d: 1 };
  var tween = null;

  function camBasis(c) {
    var cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    return { r: [cy, 0, -sy], u: [sy * sp, cp, cy * sp], b: [sy * cp, -sp, cy * cp] };
  }
  function project(c, B, X) {
    var dx = X[0] - c.pos[0], dy = X[1] - c.pos[1], dz = X[2] - c.pos[2];
    var xc = dx * B.r[0] + dy * B.r[1] + dz * B.r[2];
    var yc = dx * B.u[0] + dy * B.u[1] + dz * B.u[2];
    var w = -(dx * B.b[0] + dy * B.b[1] + dz * B.b[2]);
    return [c.px + c.f * xc / w, c.py - c.f * yc / w, w];
  }
  function orbitCam(o) {
    var ca = Math.cos(o.a), sa = Math.sin(o.a), cb = Math.cos(o.b), sb = Math.sin(o.b);
    return {
      pos: [PIVOT[0] + o.d * sa * cb, PIVOT[1] + o.d * sb, PIVOT[2] + o.d * ca * cb],
      yaw: o.a, pitch: -o.b, f: home.f, px: vw / 2, py: vh / 2
    };
  }
  function mix(a, b, t) { return a + (b - a) * t; }
  function blendCam(a, b, t) {
    return {
      pos: [mix(a.pos[0], b.pos[0], t), mix(a.pos[1], b.pos[1], t), mix(a.pos[2], b.pos[2], t)],
      yaw: mix(a.yaw, b.yaw, t), pitch: mix(a.pitch, b.pitch, t),
      f: mix(a.f, b.f, t), px: mix(a.px, b.px, t), py: mix(a.py, b.py, t)
    };
  }
  function currentCam() { return lift <= 0 ? home : blendCam(home, orbitCam(orb), lift); }

  // Seated view: image plane parallel to the tube face (so the screen stays an
  // exact 440x330 rectangle) with lens shift to frame the desk below it.
  function computeHome() {
    var f = SCR_W * HOME_D / W_S;
    var sx = Math.round((vw - SCR_W) / 2);
    var tops = [[-0.19, 0.369, -0.01], [0.19, 0.369, -0.01], [0, 0.369, -0.21]];
    var bots = [[-0.18, 0.0, 0.162], [0.15, 0.0, 0.166], [0.262, 0.0, 0.194], [-0.262, 0.0, 0.140]];
    var mTop = 22, mBot = 30, pick = null;
    var elev = [0.24, 0.21, 0.18, 0.15, 0.12];
    for (var i = 0; i < elev.length; i++) {
      var c = { pos: [HOME_X, YS + elev[i], ZD + HOME_D], yaw: 0, pitch: 0, f: f, px: 0, py: 0 };
      var B = camBasis(c), sc = project(c, B, [0, YS, ZD])[1];
      var lo = Infinity, hi = -Infinity;
      tops.forEach(function (X) { lo = Math.min(lo, project(c, B, X)[1] - sc); });
      bots.forEach(function (X) { hi = Math.max(hi, project(c, B, X)[1] - sc); });
      pick = { e: elev[i], lo: lo, hi: hi };
      if (hi - lo + mTop + mBot <= vh) break;
    }
    var span = pick.hi - pick.lo;
    var scY = span + mTop + mBot <= vh ? mTop + (vh - mTop - mBot - span) / 2 - pick.lo : mTop - pick.lo;
    var sy = Math.round(scY - SCR_H / 2);
    home = {
      pos: [HOME_X, YS + pick.e, ZD + HOME_D], yaw: 0, pitch: 0, f: f,
      px: sx + SCR_W / 2 + f * HOME_X / HOME_D,
      py: sy + SCR_H / 2 - f * pick.e / HOME_D,
      sx: sx, sy: sy
    };
    var dx = home.pos[0] - PIVOT[0], dy = home.pos[1] - PIVOT[1], dz = home.pos[2] - PIVOT[2];
    homeOrb = { a: Math.atan2(dx, dz), b: Math.atan2(dy, Math.hypot(dx, dz)), d: Math.hypot(dx, dy, dz) };
  }

  function clampOrb(o) {
    o.a = Math.max(homeOrb.a - 0.85, Math.min(homeOrb.a + 0.85, o.a));
    o.b = Math.max(0.03, Math.min(0.72, o.b));
    o.d = Math.max(homeOrb.d * 0.55, Math.min(homeOrb.d * 2.4, o.d));
  }
  function copyOrb(o) { return { a: o.a, b: o.b, d: o.d }; }
  function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

  var nowT = 0;
  function startTween(dur, toLift, toOrb, done) {
    tween = { t0: nowT, dur: dur, from: { lift: lift, orb: copyOrb(orb) }, to: { lift: toLift, orb: copyOrb(toOrb) }, done: done };
  }
  function enterOrbit() {
    if (mode === 'orbit') return;
    if (mode === 'home') orb = copyOrb(homeOrb);
    tween = null;
    mode = 'orbit';
    orbT = copyOrb(orb);
    showHint('CLICK TO SIT BACK DOWN  ·  SCROLL TO ZOOM', 0);
  }
  function goHome(dur) {
    mode = 'return';
    hideHint();
    startTween(dur || 1.1, 0, homeOrb, function () { mode = 'home'; lift = 0; });
  }

  // ===== DOM screen placement =====
  var domKey = '';
  function applyDom(c) {
    if (lift <= 0) {
      var k = 'h' + home.sx + ',' + home.sy;
      if (k !== domKey) {
        domKey = k;
        monitor.style.transform = 'translate(' + home.sx + 'px,' + home.sy + 'px)';
        monitor.style.visibility = '';
      }
      body.classList.remove('pc3d-away');
      return;
    }
    body.classList.add('pc3d-away');
    var B = camBasis(c), hw = W_S / 2, hh = H_S / 2;
    var p0 = project(c, B, [-hw, YS + hh, ZD]), p1 = project(c, B, [hw, YS + hh, ZD]);
    var p2 = project(c, B, [hw, YS - hh, ZD]), p3 = project(c, B, [-hw, YS - hh, ZD]);
    if (p0[2] < 0.05 || p1[2] < 0.05 || p2[2] < 0.05 || p3[2] < 0.05) {
      monitor.style.visibility = 'hidden'; domKey = ''; return;
    }
    monitor.style.visibility = '';
    // unit square -> quad (Heckbert), then pre-scale by the element size
    var x0 = p0[0], y0 = p0[1], x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1], x3 = p3[0], y3 = p3[1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    var dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    var det = dx1 * dy2 - dx2 * dy1;
    var gg = (dx3 * dy2 - dx2 * dy3) / det, hh2 = (dx1 * dy3 - dx3 * dy1) / det;
    var a = x1 - x0 + gg * x1, b = x3 - x0 + hh2 * x3, d = y1 - y0 + gg * y1, e = y3 - y0 + hh2 * y3;
    var m = [a / SCR_W, d / SCR_W, 0, gg / SCR_W, b / SCR_H, e / SCR_H, 0, hh2 / SCR_H, 0, 0, 1, 0, x0, y0, 0, 1];
    var s = 'matrix3d(' + m.map(function (v) { return +v.toFixed(8); }).join(',') + ')';
    if (s !== domKey) { domKey = s; monitor.style.transform = s; }
  }

  // ===== Render state =====
  var view = null;             // window.PC3DScene: renderer, scene and passes
  var lastCamKey = '';
  var needRender = true;

  function resize() {
    vw = document.documentElement.clientWidth || window.innerWidth;
    vh = document.documentElement.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // explicit CSS size so the 3D image and the DOM screen share one geometry
    canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    if (dustCv) {
      dustCv.width = Math.round(vw * dpr); dustCv.height = Math.round(vh * dpr);
      dustCv.style.width = vw + 'px'; dustCv.style.height = vh + 'px';
    }
    computeHome();
    if (mode === 'home') lift = 0;
    view.setSize(vw, vh, Math.min(dpr, ratioCap));
    lastCamKey = '';
    domKey = '';
    needRender = true;
  }

  // A GPU that cannot keep up while the view moves gets fewer pixels, for the
  // rest of the session (never below one per CSS pixel).
  var ratioCap = 2, lateHist = [], refresh = 1 / 60, idleDt = [];
  function trackRefresh(dt) {
    idleDt.push(dt);
    if (idleDt.length > 40) idleDt.shift();
    if (idleDt.length < 8) return;
    var s = idleDt.slice().sort(function (a, b) { return a - b; });
    refresh = Math.max(1 / 240, Math.min(1 / 30, s[s.length >> 1]));
  }
  function noteMovingFrame(dt) {
    lateHist.push(dt > refresh * 1.6);
    if (lateHist.length > 20) lateHist.shift();
    var n = 0;
    for (var i = 0; i < lateHist.length; i++) if (lateHist[i]) n++;
    var pr = view.pixelRatio();
    if (n >= 6 && pr > 1) {
      ratioCap = Math.max(1, pr * 0.8);
      lateHist = [];
      view.setSize(vw, vh, Math.min(dpr, ratioCap));
    }
  }

  // ===== Screen glow (the tube lights the room) =====
  var GLOW_GAIN = 2.4;
  var glowT = [0, 0, 0], glowC = [0, 0, 0];
  var powerT0 = -1, ledUntil = 0;
  function powerLevel(t) {
    if (powerT0 < 0) return 0;
    var u = t - powerT0;
    if (u < 0) return 0;
    if (u < 0.09) return u / 0.09 * 2.6;
    return 1 + 1.6 * Math.exp(-(u - 0.09) / 0.22);
  }
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function parseColor(s) {
    s = (s || '').trim();
    var m;
    if ((m = /^#([0-9a-f]{3})$/i.exec(s))) return [17 * parseInt(m[1][0], 16), 17 * parseInt(m[1][1], 16), 17 * parseInt(m[1][2], 16)];
    if ((m = /^#([0-9a-f]{6})$/i.exec(s))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    if ((m = /rgba?\(([^)]+)\)/i.exec(s))) { var p = m[1].split(','); return [+p[0], +p[1], +p[2]]; }
    return null;
  }
  var wallCv = document.getElementById('desktop-wallpaper');
  var bootEl = document.getElementById('boot-screen');
  function sampleGlow() {
    if (bootEl && bootEl.style.display !== 'none' && !bootEl.classList.contains('boot-fade')) {
      glowT = [0.018, 0.02, 0.018];
      return;
    }
    var avg = [0.05, 0.06, 0.09];
    try {
      var d = wallCv.getContext('2d').getImageData(0, 0, wallCv.width, wallCv.height).data;
      var r = 0, g = 0, b = 0, n = 0;
      for (var i = 0; i < d.length; i += 16) { r += lin(d[i]); g += lin(d[i + 1]); b += lin(d[i + 2]); n++; }
      if (n) avg = [r / n, g / n, b / n];
    } catch (e) {}
    var bg = parseColor(getComputedStyle(screenEl).getPropertyValue('--body-bg')) || [200, 200, 200];
    var win = [lin(bg[0]), lin(bg[1]), lin(bg[2])];
    var cov = 0, dark = 0, total = SCR_W * 306;
    var list = screenEl.querySelectorAll('.window:not(.closed):not(.minimized)');
    for (var j = 0; j < list.length; j++) {
      var w = list[j], a = w.offsetWidth * w.offsetHeight;
      var cv = w.querySelector('.window-body canvas');
      if (cv && cv.offsetWidth * cv.offsetHeight > a * 0.5) dark += a; else cov += a;
    }
    cov = Math.min(0.85, cov / total); dark = Math.min(0.85 - cov, dark / total);
    var rest = 1 - cov - dark;
    var next = [], delta = 0;
    for (var c = 0; c < 3; c++) {
      next[c] = (avg[c] * rest + win[c] * cov + 0.05 * dark) * 0.92 + 0.02;
      delta = Math.max(delta, Math.abs(next[c] - glowT[c]) / (glowT[c] + 0.01));
    }
    if (delta > 0.03) glowT = next;
  }

  // ===== Dust motes and coffee steam (2D overlay, projected from 3D) =====
  var dctx = dustCv ? dustCv.getContext('2d') : null;
  var motes = [], steam = [];
  (function seed() {
    var rnd = mulberry(7);
    for (var i = 0; i < 120; i++) {
      motes.push({ x: -0.72 + rnd() * 1.18, y: 0.03 + rnd() * 0.6, z: rnd() * 0.46,
        s: 0.5 + rnd() * 0.9, ph: rnd() * 6.283, sp: 0.4 + rnd() * 0.8 });
    }
    for (var j = 0; j < 12; j++) steam.push({ age: rnd() * 3.2, life: 2.6 + rnd() * 1.4, ph: rnd() * 6.283, ox: (rnd() - 0.5) * 0.02 });
  })();
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function lampAt(x, y, z) {
    var dx = x - LP[0], dy = y - LP[1], dz = z - LP[2], d2 = dx * dx + dy * dy + dz * dz, il = 1 / Math.sqrt(d2);
    return smooth(0.58, 0.86, (dx * LD[0] + dy * LD[1] + dz * LD[2]) * il) / (d2 + 0.006);
  }
  function moonAt(x, y, z) {
    if (x < XW) return 0;
    var s = (XW - 0.022 - x) / MOON_L[0];
    var wy = y + MOON_L[1] * s, wz = z + MOON_L[2] * s;
    if (wy < WY[0] || wy > WY[1] || wz < WZ[0] || wz > WZ[1]) return 0;
    var fy = (wy - WY[0]) / BP; fy -= Math.floor(fy);
    return smooth(0.20, 0.32, Math.abs(fy - 0.5));
  }
  var dustAcc = 0;
  function drawDust(c, dt, t) {
    if (!dctx) return;
    dustAcc += dt;
    if (dustAcc < 1 / 30) return;
    var step = dustAcc; dustAcc = 0;
    var W = dustCv.width, H = dustCv.height, B = camBasis(c);
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.clearRect(0, 0, W, H);
    if (powerT0 < 0 && mode === 'wait') return;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.ph += step * m.sp * 0.6;
      m.x += (Math.sin(m.ph * 0.7 + i) * 0.004 + 0.0015) * step;
      m.y += (Math.cos(m.ph) * 0.003 + 0.0012) * step;
      m.z += Math.sin(m.ph * 1.3 + i * 0.5) * 0.003 * step;
      if (m.y > 0.64) m.y = 0.03; if (m.x > 0.46) m.x = -0.72;
      var il = lampAt(m.x, m.y, m.z) * 0.9, im = moonAt(m.x, m.y, m.z) * 1.3;
      var tw = 0.55 + 0.45 * Math.sin(m.ph * 2.3);
      var a = Math.min(1, (il * 0.06 + im * 0.5) * tw);
      if (a < 0.03) continue;
      var p = project(c, B, [m.x, m.y, m.z]);
      if (p[2] < 0.05) continue;
      var rad = Math.max(0.45, Math.min(2.2, m.s * c.f * 0.0006 / p[2]));
      var wr = il * 0.06 / (il * 0.06 + im * 0.5 + 1e-6);
      dctx.fillStyle = 'rgba(' + Math.round(mix(170, 255, wr)) + ',' + Math.round(mix(200, 214, wr)) + ',' + Math.round(mix(255, 160, wr)) + ',' + (a * 0.8).toFixed(3) + ')';
      dctx.beginPath(); dctx.arc(p[0], p[1], rad, 0, 6.283); dctx.fill();
    }
    dctx.globalCompositeOperation = 'source-over';
    for (var j = 0; j < steam.length; j++) {
      var s = steam[j];
      s.age += step;
      if (s.age > s.life) { s.age = 0; s.ph = Math.random() * 6.283; s.ox = (Math.random() - 0.5) * 0.02; }
      var u = s.age / s.life;
      var sx = MUG[0] + s.ox + Math.sin(u * 5 + s.ph) * 0.012 * u, sy = 0.078 + u * 0.13, sz = MUG[2] + Math.cos(u * 4 + s.ph) * 0.008 * u;
      var q = project(c, B, [sx, sy, sz]);
      if (q[2] < 0.05) continue;
      var r2 = c.f * (0.008 + u * 0.022) / q[2];
      var al = Math.sin(Math.PI * u) * 0.045 * (0.6 + lampAt(sx, sy, sz) * 0.02);
      var gr = dctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r2);
      gr.addColorStop(0, 'rgba(255,236,214,' + Math.min(0.09, al).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(255,236,214,0)');
      dctx.fillStyle = gr;
      dctx.beginPath(); dctx.arc(q[0], q[1], r2, 0, 6.283); dctx.fill();
    }
  }

  // ===== Hint =====
  var hintTimer = null;
  function showHint(text, ms) {
    if (!hintEl) return;
    hintEl.textContent = text;
    hintEl.classList.add('show');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(hideHint, ms);
  }
  function hideHint() { if (hintEl) hintEl.classList.remove('show'); clearTimeout(hintTimer); }

  // ===== Input: drag the room to look around, click to sit back down =====
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !home) return;
    if (mode === 'intro') { skipIntro(); return; }
    drag = { x: e.clientX, y: e.clientY, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return;
      drag.moved = true;
      enterOrbit();
      body.classList.add('pc3d-dragging');
    }
    orbT.a -= dx * 0.0055;
    orbT.b += dy * 0.0045;
    clampOrb(orbT);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  function endDrag() {
    if (!drag) return;
    if (!drag.moved && mode === 'orbit') goHome();
    drag = null;
    body.classList.remove('pc3d-dragging');
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    if (!home || mode === 'intro' || mode === 'wait') return;
    e.preventDefault();
    enterOrbit();
    orbT.d *= Math.exp(e.deltaY * 0.0012);
    clampOrb(orbT);
  }, { passive: false });
  canvas.addEventListener('dblclick', function () {
    if (mode !== 'home') return;
    enterOrbit();
    orbT = { a: homeOrb.a + 0.55, b: 0.40, d: homeOrb.d * 1.5 };
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mode === 'orbit') goHome();
    else if (mode === 'intro') skipIntro();
  });

  // ===== Intro: wide shot of the dark room -> tube powers on -> sit down =====
  var introT0 = 0, tubeOn = false;
  var query = (/[?&]pc3d=([^&]*)/.exec(location.search) || [])[1] || '';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function powerTube() {
    if (tubeOn) return;
    tubeOn = true;
    powerT0 = nowT;
    body.classList.remove('pc3d-off');
    screenEl.classList.add('crt-poweron');
    setTimeout(function () { screenEl.classList.remove('crt-poweron'); }, 900);
    ledUntil = nowT + 3.4;
    firePower();
  }
  function skipIntro() {
    if (mode !== 'intro') return;
    powerTube();
    mode = 'return';
    startTween(0.8, 0, homeOrb, introDone);
  }
  function introDone() {
    mode = 'home'; lift = 0;
    showHint('DRAG THE ROOM TO LOOK AROUND', 5000);
  }
  // opening shot: three-quarter view from the right, window and lamp in frame
  var INTRO = null;
  function beginIntro() {
    INTRO = { a: homeOrb.a + 0.80, b: 0.36, d: homeOrb.d * 1.85 };
    // screenshot hooks: ?pc3d=home | ?pc3d=orbit,<yaw deg from home>,<pitch deg>,<distance x>
    //                   | ?pc3d=introAt,<0..1> (intro frozen at that progress)
    var q = query.split(',');
    if (q[0] === 'orbit') {
      powerTube();
      mode = 'orbit'; lift = 1;
      orb = { a: homeOrb.a + (+q[1] || 0) * Math.PI / 180, b: (+q[2] || 15) * Math.PI / 180, d: homeOrb.d * (+q[3] || 1) };
      orbT = copyOrb(orb);
      return;
    }
    if (q[0] === 'introAt') {
      var e = ease(Math.max(0, Math.min(1, +q[1] || 0)));
      if (e > 0.02) powerTube();
      mode = 'frozen'; lift = 1 - e;
      orb = { a: mix(INTRO.a, homeOrb.a, e), b: mix(INTRO.b, homeOrb.b, e), d: mix(INTRO.d, homeOrb.d, e) };
      return;
    }
    if (q[0] === 'home' || reduced) {
      powerTube();
      mode = 'home'; lift = 0;
      return;
    }
    mode = 'intro';
    introT0 = nowT;
    lift = 1;
    orb = { a: INTRO.a, b: INTRO.b, d: INTRO.d };
    startTween(4.6, 0, homeOrb, introDone);
  }

  // disk activity LED when an app opens
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i], el = r.target;
      if (!el.classList || !(el.classList.contains('window') || el.classList.contains('widget'))) continue;
      if ((r.oldValue || '').indexOf('closed') >= 0 && !el.classList.contains('closed')) ledUntil = Math.max(ledUntil, nowT + 0.7);
    }
  }).observe(screenEl, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });

  // ===== Main loop =====
  var lastT = -1, glowTimer = 0, moved = false;
  function camKey(c) {
    return c.pos[0].toFixed(6) + c.pos[1].toFixed(6) + c.pos[2].toFixed(6) + c.yaw.toFixed(6) +
      c.pitch.toFixed(6) + c.f.toFixed(3) + c.px.toFixed(3) + c.py.toFixed(3);
  }
  function update(dt) {
    if (tween) {
      var u = Math.min(1, (nowT - tween.t0) / tween.dur), e = ease(u);
      lift = mix(tween.from.lift, tween.to.lift, e);
      orb.a = mix(tween.from.orb.a, tween.to.orb.a, e);
      orb.b = mix(tween.from.orb.b, tween.to.orb.b, e);
      orb.d = mix(tween.from.orb.d, tween.to.orb.d, e);
      if (u >= 1) { var done = tween.done; tween = null; if (done) done(); }
    } else if (mode === 'orbit') {
      var k1 = 1 - Math.exp(-dt * 6), k2 = 1 - Math.exp(-dt * 10);
      lift += (1 - lift) * k1; if (lift > 0.9995) lift = 1;
      ['a', 'b', 'd'].forEach(function (key) {
        orb[key] += (orbT[key] - orb[key]) * k2;
        if (Math.abs(orbT[key] - orb[key]) < 1e-4) orb[key] = orbT[key];
      });
    }
    if (mode === 'intro' && !tubeOn && nowT - introT0 > 0.75) powerTube();
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    var t = ts / 1000;
    var dt = lastT < 0 ? 1 / 60 : Math.min(0.1, Math.max(0.001, t - lastT));
    lastT = t; nowT = t;
    if (!home) return;
    update(dt);

    var c = currentCam();
    var key = camKey(c), moving = key !== lastCamKey;
    if (moving) { lastCamKey = key; needRender = true; }
    if (moving && moved) noteMovingFrame(dt);
    else if (!moved) trackRefresh(dt);
    moved = moving;
    applyDom(c);

    // reading the page's colours forces style and layout: not while moving
    glowTimer -= dt;
    if (glowTimer <= 0 && !moving) { glowTimer = 1.0; sampleGlow(); }
    for (var i = 0; i < 3; i++) {
      var dg = glowT[i] - glowC[i];
      if (Math.abs(dg) > 1e-4) { glowC[i] += dg * (1 - Math.exp(-dt * 3.5)); needRender = true; }
    }
    if (t < ledUntil + 0.1 || (powerT0 >= 0 && t - powerT0 < 1.6)) needRender = true;
    if (needRender) {
      var pw = powerLevel(t) * GLOW_GAIN;
      var ledOn = (t < ledUntil && Math.sin(t * 53) + Math.sin(t * 31) > 0.2) ? 1 : 0;
      c.B = camBasis(c);
      view.render(c, [glowC[0] * pw, glowC[1] * pw, glowC[2] * pw], [ledOn * 5.0, ledOn * 2.2, ledOn * 0.25]);
      needRender = false;
      frames++;
    }
    drawDust(c, dt, t);
  }

  // ===== Start: load three.js, build the scene, compile, go =====
  var frames = 0;
  function whenFonts() {
    return new Promise(function (go) {
      try {
        if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(go, go);
        else go();
      } catch (e) { go(); }
      setTimeout(go, 1500);
    });
  }
  Promise.all([
    import('three'),
    import('three/addons/lights/RectAreaLightUniformsLib.js'),
    whenFonts()
  ]).then(function (m) {
    if (failed) return;
    view = window.PC3DScene(m[0], m[1].RectAreaLightUniformsLib, canvas, buildAtlas());
    resize();
    return view.compile(currentCamFor(home));
  }).then(function () {
    if (failed) return;
    started = true;
    clearTimeout(failTimer);
    var rt = null;
    var onResize = function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w = document.documentElement.clientWidth || window.innerWidth;
        var h = document.documentElement.clientHeight || window.innerHeight;
        if (w === vw && h === vh && Math.min(window.devicePixelRatio || 1, 2) === dpr) return;
        resize();
      }, 120);
    };
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.documentElement);
    beginIntro();
    body.classList.add('pc3d-live');
    requestAnimationFrame(frame);
  }).catch(function (e) {
    fallback((e && e.message) || 'three.js failed to load');
  });
  function currentCamFor(c) { var o = Object.assign({}, c); o.B = camBasis(o); return o; }

  // small hook for the headless screenshot harness
  window._pc3d = {
    state: function () {
      return { mode: mode, lift: lift, ready: started, frames: frames,
        ratio: view ? view.pixelRatio() : 0, stats: view ? view.stats() : null };
    },
    view: function () { return view; },
    cam: function () { var c = currentCam(); c = Object.assign({}, c); c.B = camBasis(c); return c; },
    redraw: function () { needRender = true; }
  };
})();
