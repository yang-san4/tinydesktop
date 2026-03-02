// ===== Haunted Pinball 3D (canvas, 120x210) =====
// Rail-based plunger lane + state machine rebuild

(function () {
  var canvas = document.getElementById('pinball-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // ===== Constants =====
  var CANVAS_W = 180, CANVAS_H = 200;
  var TABLE_W = 80, TABLE_H = 180;
  var BALL_R = 2.5;
  var GRAVITY = 0.08;
  var MAX_VEL = 7.0;
  var FRICTION = 0.999;
  var FIXED_DT = 1 / 60;
  var SUB_STEPS = 3;
  var FORESHORTEN = 0.35;
  var LANE_X = 73; // Plunger lane rail X position

  // ===== Perspective Transform =====
  function tableToScreen(tx, ty) {
    var normY = ty / TABLE_H;
    var perspective = 1.0 - normY * FORESHORTEN;
    var cx = CANVAS_W / 2;
    var sx = cx + (tx - TABLE_W / 2) * perspective * (CANVAS_W / TABLE_W);
    var sy = CANVAS_H - normY * CANVAS_H;
    return { x: sx, y: sy };
  }

  function scaleAt(ty, size) {
    var normY = ty / TABLE_H;
    var perspective = 1.0 - normY * FORESHORTEN;
    return size * perspective * (CANVAS_W / TABLE_W);
  }

  // ===== Table Layout =====
  var BUMPERS = [
    { x: 25, y: 148, r: 5, points: 100, flash: 0, scale: 1 },
    { x: 40, y: 155, r: 6, points: 100, flash: 0, scale: 1 },
    { x: 55, y: 148, r: 5, points: 100, flash: 0, scale: 1 }
  ];

  var DROP_TARGETS = [
    { x: 22, y: 115, w: 6, h: 4, points: 200, hit: false },
    { x: 37, y: 115, w: 6, h: 4, points: 200, hit: false },
    { x: 52, y: 115, w: 6, h: 4, points: 200, hit: false }
  ];

  var TOP_LANES = [
    { x: 20, y: 173, w: 10, lit: false, points: 300 },
    { x: 35, y: 173, w: 10, lit: false, points: 300 },
    { x: 50, y: 173, w: 10, lit: false, points: 300 }
  ];

  var SPINNER = { x: 40, y: 163, w: 12, points: 50, angle: 0, spinning: 0 };

  var SLINGSHOTS = [
    { x1: 10, y1: 85, x2: 10, y2: 60, x3: 22, y3: 60, cooldown: 0 },
    { x1: 70, y1: 85, x2: 70, y2: 60, x3: 58, y3: 60, cooldown: 0 }
  ];

  var TOMBSTONES = [
    { x: 20, y: 98, w: 6, h: 8, points: 50, flash: 0 },
    { x: 60, y: 98, w: 6, h: 8, points: 50, flash: 0 }
  ];

  var CRYPT = {
    x: 40, y: 132, r: 5,
    state: 'idle',
    timer: 0,
    cooldown: 0,
    bonus: 0,
    bonusText: '',
    vortexAngle: 0,
    glowPulse: 0
  };

  var PENDULUM = {
    pivotX: 40, pivotY: 85,
    len: 14,
    angle: 0,
    angVel: 0,
    maxAngle: 0.7,
    bobR: 3.5,
    hitCount: 0,
    midnightReady: false,
    flash: 0,
    clockGlow: 0
  };

  var KICKBACKS = [
    { x: 5, y: 30, active: true, flash: 0 },
    { x: 61, y: 30, active: true, flash: 0 }
  ];

  // Field walls only — no plunger lane walls (lane uses rail system)
  var WALLS = [
    { x1: 2,  y1: 20,  x2: 2,  y2: 170 },   // left wall
    { x1: 66, y1: 55,  x2: 66, y2: 170 },   // right wall
    { x1: 2,  y1: 170, x2: 66, y2: 170 },   // top wall
    { x1: 2,  y1: 20,  x2: 12, y2: 5 },     // left drain guide
    { x1: 66, y1: 55,  x2: 55, y2: 5 }      // right drain guide
  ];

  // Flipper constants — REST = open (V-down), ACTIVE = closed (tips up)
  var FLIPPER_LEN = 20;
  var FLIPPER_SPEED = 0.25;
  var LEFT_REST = -30 * Math.PI / 180;
  var LEFT_ACTIVE = 25 * Math.PI / 180;
  var RIGHT_REST = 210 * Math.PI / 180;
  var RIGHT_ACTIVE = 155 * Math.PI / 180;

  var leftFlipper = { px: 13, py: 38, angle: LEFT_REST, active: false };
  var rightFlipper = { px: 63, py: 38, angle: RIGHT_REST, active: false };

  // ===== Game State =====
  // States: title → ready → launching → in_lane → playing → draining/ballsave → ready/gameover
  var state = 'title';
  var score = 0;
  var balls = 3;
  var ballX = LANE_X, ballY = 10;
  var ballVX = 0, ballVY = 0;
  var plungerPower = 0;
  var comboCount = 0;
  var comboTimer = 0;
  var multiplier = 1;
  var ballSaveTimer = 0;
  var particles = [];
  var scorePopups = [];
  var screenShake = { x: 0, y: 0, timer: 0 };
  var slingCooldown = 0;
  var accumulator = 0;
  var lastTime = 0;
  var animFrame = 0;
  var running = false;
  var frameCount = 0;

  // Horror ambient state
  var lightningTimer = 0;
  var lightningFlash = 0;
  var fogParticles = [];
  var ghostWindowTimer = 0;
  var ghostWindowIndex = -1;

  // Title screen demo ball
  var demoBallX = 40, demoBallY = 90;
  var demoBallVX = 1.2, demoBallVY = -0.8;

  // ===== LED Bitmap Font (3x5) =====
  var FONT = {
    '0': [7,5,5,5,7], '1': [2,6,2,2,7], '2': [7,1,7,4,7], '3': [7,1,7,1,7],
    '4': [5,5,7,1,1], '5': [7,4,7,1,7], '6': [7,4,7,5,7], '7': [7,1,1,1,1],
    '8': [7,5,7,5,7], '9': [7,5,7,1,7], 'A': [7,5,7,5,5], 'B': [6,5,6,5,6],
    'C': [7,4,4,4,7], 'D': [6,5,5,5,6], 'E': [7,4,7,4,7], 'F': [7,4,7,4,4],
    'G': [7,4,5,5,7], 'H': [5,5,7,5,5], 'I': [7,2,2,2,7], 'K': [5,5,6,5,5],
    'L': [4,4,4,4,7], 'M': [5,7,5,5,5], 'N': [5,7,7,5,5], 'O': [7,5,5,5,7],
    'P': [7,5,7,4,4], 'R': [7,5,7,6,5], 'S': [7,4,7,1,7], 'T': [7,2,2,2,2],
    'U': [5,5,5,5,7], 'V': [5,5,5,5,2], 'W': [5,5,5,7,5], 'X': [5,5,2,5,5],
    'Y': [5,5,7,2,2], ' ': [0,0,0,0,0], '+': [0,2,7,2,0], ':': [0,2,0,2,0],
    'x': [0,5,2,5,0], '!': [2,2,2,0,2], '-': [0,0,7,0,0], '.': [0,0,0,0,2],
    'J': [1,1,1,5,7]
  };

  function drawLedChar(cx, cy, ch, color, sz) {
    var data = FONT[ch];
    if (!data) return;
    ctx.fillStyle = color;
    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 3; col++) {
        if (data[row] & (4 >> col)) {
          ctx.fillRect(cx + col * sz, cy + row * sz, sz, sz);
        }
      }
    }
  }

  function drawLedString(x, y, str, color, sz) {
    for (var i = 0; i < str.length; i++) {
      drawLedChar(x + i * (3 * sz + sz), y, str[i], color, sz);
    }
  }

  // ===== Sound =====
  function getAudioCtx() {
    return window._tinyDesktopAudioCtx || null;
  }
  function isMuted() {
    var btn = document.getElementById('taskbar-sound');
    return btn && btn.classList.contains('muted');
  }

  function playBumperHit() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.08);
    g.gain.setValueAtTime(0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.08);
    var buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.2;
    var n = ac.createBufferSource();
    var ng = ac.createGain();
    n.buffer = buf;
    ng.gain.setValueAtTime(0.05, ac.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    n.connect(ng); ng.connect(ac.destination);
    n.start(); n.stop(ac.currentTime + 0.05);
  }

  function playFlipper() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'square';
    o.frequency.value = 150;
    g.gain.setValueAtTime(0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.025);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.025);
  }

  function playLaunch() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(100, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.15);
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.15);
  }

  function playDrain() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(50, ac.currentTime + 0.4);
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.4);
  }

  function playSlingshot() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = 800;
    g.gain.setValueAtTime(0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.02);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.02);
  }

  function playTarget() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.06);
    g.gain.setValueAtTime(0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.06);
  }

  function playBonus() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var notes = [523, 311, 185, 131];
    for (var i = 0; i < notes.length; i++) {
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = 'square';
      o.frequency.value = notes[i];
      var t = ac.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.07);
    }
  }

  function playBallSave() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, ac.currentTime);
    o.frequency.linearRampToValueAtTime(600, ac.currentTime + 0.1);
    o.frequency.linearRampToValueAtTime(300, ac.currentTime + 0.2);
    g.gain.setValueAtTime(0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.2);
  }

  function playCrypt() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o1 = ac.createOscillator();
    var o2 = ac.createOscillator();
    var g = ac.createGain();
    o1.type = 'sine'; o1.frequency.value = 100;
    o2.type = 'sine'; o2.frequency.value = 150;
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    o1.connect(g); o2.connect(g); g.connect(ac.destination);
    o1.start(); o1.stop(ac.currentTime + 0.2);
    o2.start(); o2.stop(ac.currentTime + 0.2);
  }

  function playEject() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.1);
    g.gain.setValueAtTime(0.07, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.1);
    var buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
    var n = ac.createBufferSource();
    var ng = ac.createGain();
    n.buffer = buf;
    ng.gain.setValueAtTime(0.04, ac.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    n.connect(ng); ng.connect(ac.destination);
    n.start(); n.stop(ac.currentTime + 0.05);
  }

  function playKickback() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(250, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.08);
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.08);
  }

  function playThunder() {
    var ac = getAudioCtx();
    if (!ac || isMuted()) return;
    var buf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) {
      var env = Math.exp(-i / (ac.sampleRate * 0.1));
      d[i] = (Math.random() * 2 - 1) * 0.3 * env;
    }
    var n = ac.createBufferSource();
    var ng = ac.createGain();
    n.buffer = buf;
    ng.gain.setValueAtTime(0.05, ac.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    n.connect(ng); ng.connect(ac.destination);
    n.start(); n.stop(ac.currentTime + 0.3);
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = 40;
    g.gain.setValueAtTime(0.04, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.4);
  }

  // ===== Window Visibility =====
  function isWindowVisible() {
    var win = document.getElementById('window-pinball');
    if (!win) return false;
    return !win.classList.contains('closed') && !win.classList.contains('minimized');
  }

  function isTopWindow() {
    var win = document.getElementById('window-pinball');
    if (!win) return false;
    var all = document.querySelectorAll('.window:not(.closed):not(.minimized)');
    var maxZ = 0, topWin = null;
    all.forEach(function (w) {
      var z = parseInt(w.style.zIndex) || 0;
      if (z >= maxZ) { maxZ = z; topWin = w; }
    });
    return topWin === win;
  }

  // ===== Particles =====
  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 0.5 + Math.random() * 1.5;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15 + Math.random() * 15,
        maxLife: 30,
        color: color
      });
    }
  }

  function addScorePopup(x, y, text) {
    scorePopups.push({ x: x, y: y, text: text, life: 40 });
  }

  // ===== Fog Particles =====
  function initFog() {
    fogParticles = [];
    for (var i = 0; i < 12; i++) {
      fogParticles.push({
        x: Math.random() * TABLE_W,
        y: Math.random() * 40,
        r: 5 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 0.15,
        alpha: 0.03 + Math.random() * 0.05
      });
    }
  }

  function updateFog() {
    for (var i = 0; i < fogParticles.length; i++) {
      var f = fogParticles[i];
      f.x += f.vx;
      if (f.x < -10) f.x = TABLE_W + 10;
      if (f.x > TABLE_W + 10) f.x = -10;
      f.alpha = 0.03 + Math.sin(frameCount * 0.02 + i) * 0.02;
    }
  }

  // ===== Reset =====
  function resetGame() {
    score = 0;
    balls = 3;
    multiplier = 1;
    comboCount = 0;
    comboTimer = 0;
    ballSaveTimer = 600;
    particles = [];
    scorePopups = [];
    screenShake = { x: 0, y: 0, timer: 0 };
    for (var i = 0; i < DROP_TARGETS.length; i++) DROP_TARGETS[i].hit = false;
    for (var i = 0; i < TOP_LANES.length; i++) TOP_LANES[i].lit = false;
    for (var i = 0; i < BUMPERS.length; i++) { BUMPERS[i].flash = 0; BUMPERS[i].scale = 1; }
    for (var i = 0; i < TOMBSTONES.length; i++) TOMBSTONES[i].flash = 0;
    SPINNER.spinning = 0;
    SPINNER.angle = 0;
    CRYPT.state = 'idle';
    CRYPT.timer = 0;
    CRYPT.cooldown = 0;
    PENDULUM.angle = 0; PENDULUM.angVel = 0;
    PENDULUM.hitCount = 0; PENDULUM.midnightReady = false;
    PENDULUM.flash = 0; PENDULUM.clockGlow = 0;
    KICKBACKS[0].active = true; KICKBACKS[0].flash = 0;
    KICKBACKS[1].active = true; KICKBACKS[1].flash = 0;
    initFog();
    resetBall();
    state = 'ready';
  }

  function resetBall() {
    ballX = LANE_X;
    ballY = 10;
    ballVX = 0;
    ballVY = 0;
    plungerPower = 0;
    leftFlipper.active = false;
    rightFlipper.active = false;
    leftFlipper.angle = LEFT_REST;
    rightFlipper.angle = RIGHT_REST;
  }

  // ===== Physics Helpers =====
  function clampVel() {
    var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    if (spd > MAX_VEL) {
      ballVX = (ballVX / spd) * MAX_VEL;
      ballVY = (ballVY / spd) * MAX_VEL;
    }
  }

  function pointToSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    if (len2 === 0) return { dist: Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1)), cx: x1, cy: y1 };
    var t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    var cx = x1 + t * dx;
    var cy = y1 + t * dy;
    var ddx = px - cx, ddy = py - cy;
    return { dist: Math.sqrt(ddx * ddx + ddy * ddy), cx: cx, cy: cy, t: t };
  }

  function reflectOff(nx, ny, restitution) {
    var dot = ballVX * nx + ballVY * ny;
    ballVX -= (1 + restitution) * dot * nx;
    ballVY -= (1 + restitution) * dot * ny;
  }

  function flipperEnd(f) {
    return {
      x: f.px + Math.cos(f.angle) * FLIPPER_LEN,
      y: f.py + Math.sin(f.angle) * FLIPPER_LEN
    };
  }

  function addCombo(points, tx, ty) {
    comboTimer = 120;
    comboCount++;
    var mult = 1;
    if (comboCount >= 10) mult = 2.0;
    else if (comboCount >= 5) mult = 1.5;
    var total = Math.floor(points * multiplier * mult);
    score += total;
    addScorePopup(tx, ty, '+' + total);
  }

  // ===== Update =====
  function update() {
    frameCount++;

    // Combo timer
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer <= 0) comboCount = 0;
    }

    // Ball save timer
    if (ballSaveTimer > 0) ballSaveTimer--;

    // Bumper animations
    for (var i = 0; i < BUMPERS.length; i++) {
      if (BUMPERS[i].flash > 0) BUMPERS[i].flash--;
      if (BUMPERS[i].scale > 1) BUMPERS[i].scale -= 0.05;
      if (BUMPERS[i].scale < 1) BUMPERS[i].scale = 1;
    }

    // Tombstone flash
    for (var i = 0; i < TOMBSTONES.length; i++) {
      if (TOMBSTONES[i].flash > 0) TOMBSTONES[i].flash--;
    }

    // Spinner
    if (SPINNER.spinning > 0) {
      SPINNER.angle += SPINNER.spinning * 0.3;
      SPINNER.spinning *= 0.97;
      if (SPINNER.spinning < 0.1) SPINNER.spinning = 0;
    }

    // Slingshot cooldowns
    for (var i = 0; i < SLINGSHOTS.length; i++) {
      if (SLINGSHOTS[i].cooldown > 0) SLINGSHOTS[i].cooldown--;
    }

    // Kickback flash
    for (var i = 0; i < KICKBACKS.length; i++) {
      if (KICKBACKS[i].flash > 0) KICKBACKS[i].flash--;
    }

    // Lightning
    if (lightningTimer > 0) {
      lightningTimer--;
    } else if (Math.random() < 1 / 300) {
      lightningTimer = 2 + Math.floor(Math.random() * 2);
      lightningFlash = 1;
      playThunder();
    }
    if (lightningTimer <= 0) lightningFlash = 0;

    // Ghost window animation
    if (ghostWindowTimer > 0) {
      ghostWindowTimer--;
    } else if (Math.random() < 1 / 180) {
      ghostWindowTimer = 60 + Math.floor(Math.random() * 60);
      ghostWindowIndex = Math.floor(Math.random() * 3);
    }

    // Crypt cooldown
    if (CRYPT.cooldown > 0) CRYPT.cooldown--;

    // Pendulum physics
    var pendGrav = 0.003;
    PENDULUM.angVel -= pendGrav * Math.sin(PENDULUM.angle);
    PENDULUM.angVel *= 0.999;
    PENDULUM.angle += PENDULUM.angVel;
    var ampEst = Math.abs(PENDULUM.angle) + Math.abs(PENDULUM.angVel) * 5;
    if (ampEst < 0.3) {
      PENDULUM.angVel += (PENDULUM.angle > 0 ? -1 : 1) * 0.001;
    }
    if (PENDULUM.flash > 0) PENDULUM.flash--;
    PENDULUM.clockGlow = Math.sin(frameCount * 0.05) * 0.5 + 0.5;

    // Crypt vortex animation
    CRYPT.vortexAngle += 0.05;
    CRYPT.glowPulse = Math.sin(frameCount * 0.08) * 0.5 + 0.5;

    // Crypt state machine
    if (CRYPT.state === 'capturing') {
      var cdx = CRYPT.x - ballX;
      var cdy = CRYPT.y - ballY;
      var cd = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cd > 0.5) {
        ballVX = cdx / cd * 1.5;
        ballVY = cdy / cd * 1.5;
        ballX += ballVX * 0.1;
        ballY += ballVY * 0.1;
      } else {
        CRYPT.state = 'holding';
        CRYPT.timer = 90;
        ballVX = 0; ballVY = 0;
        ballX = CRYPT.x; ballY = CRYPT.y;
        playCrypt();
      }
    } else if (CRYPT.state === 'holding') {
      CRYPT.timer--;
      ballX = CRYPT.x; ballY = CRYPT.y;
      ballVX = 0; ballVY = 0;
      if (CRYPT.timer <= 0) {
        var roll = Math.random();
        if (roll < 0.4) {
          CRYPT.bonus = 500; CRYPT.bonusText = '+500';
        } else if (roll < 0.7) {
          CRYPT.bonus = 1000; CRYPT.bonusText = '+1000';
        } else if (roll < 0.85) {
          CRYPT.bonus = 0; CRYPT.bonusText = 'EXTRA!';
          balls++;
        } else {
          CRYPT.bonus = 0; CRYPT.bonusText = 'RESET!';
          for (var ri = 0; ri < DROP_TARGETS.length; ri++) DROP_TARGETS[ri].hit = false;
        }
        if (CRYPT.bonus > 0) score += CRYPT.bonus;
        addScorePopup(CRYPT.x, CRYPT.y + 5, CRYPT.bonusText);
        CRYPT.state = 'ejecting';
        CRYPT.timer = 10;
      }
    } else if (CRYPT.state === 'ejecting') {
      CRYPT.timer--;
      if (CRYPT.timer <= 0) {
        var ejectDir = (Math.random() > 0.5) ? 1 : -1;
        ballVX = ejectDir * 1.5;
        ballVY = 3.0;
        CRYPT.state = 'idle';
        CRYPT.cooldown = 90;
        spawnParticles(CRYPT.x, CRYPT.y, '#40ff80', 12);
        playEject();
      }
    }

    // Fog
    updateFog();

    // Flippers
    updateFlipper(leftFlipper, LEFT_REST, LEFT_ACTIVE);
    updateFlipper(rightFlipper, RIGHT_REST, RIGHT_ACTIVE);

    // Particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Score popups
    for (var i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].y += 0.3;
      scorePopups[i].life--;
      if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
    }

    // Screen shake
    if (screenShake.timer > 0) {
      screenShake.timer--;
      screenShake.x = (Math.random() - 0.5) * 2;
      screenShake.y = (Math.random() - 0.5) * 2;
    } else {
      screenShake.x = 0;
      screenShake.y = 0;
    }

    if (state === 'title') return;
    if (state === 'gameover') return;
    if (state === 'ready') return;

    if (state === 'launching') {
      plungerPower = Math.min(1, plungerPower + 0.015);
      return;
    }

    // ===== in_lane state — rail-based vertical-only movement =====
    if (state === 'in_lane') {
      // Apply gravity (downward in table coords = negative Y)
      ballVY -= GRAVITY;
      // Vertical-only movement — X is fixed to LANE_X
      ballX = LANE_X;
      ballY += ballVY;
      clampVel();

      // Lane exit: ball reaches top of lane → enter playing field
      if (ballY >= 140) {
        state = 'playing';
        ballX = 64;       // Inject into field at right edge
        ballVX = -2.0;    // Curve left into the field
        ballVY *= 0.7;    // Reduce vertical speed on entry
        clampVel();
      }

      // Velocity insufficient — ball falls back below starting position
      if (ballY < 8) {
        // Not enough power, return to ready
        state = 'ready';
        resetBall();
      }
      return;
    }

    if (state === 'draining') {
      ballVY -= GRAVITY;
      ballY += ballVY;
      if (ballY < -10) {
        balls--;
        if (balls <= 0) {
          state = 'gameover';
        } else {
          state = 'ready';
          resetBall();
        }
      }
      return;
    }

    if (state === 'ballsave') {
      ballVY -= GRAVITY;
      ballY += ballVY;
      if (ballY < -10) {
        playBallSave();
        resetBall();
        state = 'ready';
      }
      return;
    }

    // Crypt holding/ejecting: skip normal physics for ball
    if (CRYPT.state === 'holding' || CRYPT.state === 'ejecting') return;

    // ===== state === 'playing' — full field physics =====
    for (var s = 0; s < SUB_STEPS; s++) {
      // Gravity
      ballVY -= GRAVITY / SUB_STEPS;

      // Position
      ballX += ballVX / SUB_STEPS;
      ballY += ballVY / SUB_STEPS;

      // Friction
      ballVX *= Math.pow(FRICTION, 1 / SUB_STEPS);

      clampVel();

      // Wall collisions
      for (var wi = 0; wi < WALLS.length; wi++) {
        var w = WALLS[wi];
        var res = pointToSeg(ballX, ballY, w.x1, w.y1, w.x2, w.y2);
        if (res.dist < BALL_R + 1.0) {
          var nx = (ballX - res.cx);
          var ny = (ballY - res.cy);
          var nd = Math.sqrt(nx * nx + ny * ny);
          if (nd > 0.001) {
            nx /= nd; ny /= nd;
            ballX = res.cx + nx * (BALL_R + 1.2);
            ballY = res.cy + ny * (BALL_R + 1.2);
            reflectOff(nx, ny, 0.4);
            ballVX *= 0.9;
            ballVY *= 0.9;
          }
        }
      }

      // Field guard — prevent ball from re-entering plunger lane area
      if (ballX > 66 && ballY < 140) {
        ballX = 66;
        ballVX = -Math.abs(ballVX) * 0.5;
      }

      // Bumper collisions
      for (var bi = 0; bi < BUMPERS.length; bi++) {
        var b = BUMPERS[bi];
        var dx = ballX - b.x;
        var dy = ballY - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = b.r + BALL_R;
        if (dist < minDist) {
          var bnx = dx / (dist || 1);
          var bny = dy / (dist || 1);
          ballX = b.x + bnx * (minDist + 0.5);
          ballY = b.y + bny * (minDist + 0.5);
          var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
          var boost = Math.max(spd, 1.5) * 1.3;
          ballVX = bnx * boost;
          ballVY = bny * boost;
          clampVel();
          addCombo(b.points, b.x, b.y);
          b.flash = 10;
          b.scale = 1.3;
          spawnParticles(b.x, b.y, '#40ff80', 8);
          screenShake.timer = 3;
          playBumperHit();
        }
      }

      // Drop target collisions
      for (var ti = 0; ti < DROP_TARGETS.length; ti++) {
        var tg = DROP_TARGETS[ti];
        if (tg.hit) continue;
        if (ballX + BALL_R > tg.x && ballX - BALL_R < tg.x + tg.w &&
            ballY + BALL_R > tg.y && ballY - BALL_R < tg.y + tg.h) {
          tg.hit = true;
          addCombo(tg.points, tg.x + tg.w / 2, tg.y);
          ballVY = -Math.abs(ballVY) * 0.7 - 0.5;
          spawnParticles(tg.x + tg.w / 2, tg.y, '#cc2020', 5);
          playTarget();
          var allHit = true;
          for (var ai = 0; ai < DROP_TARGETS.length; ai++) {
            if (!DROP_TARGETS[ai].hit) { allHit = false; break; }
          }
          if (allHit) {
            score += 1000;
            addScorePopup(40, 115, '+1000');
            playBonus();
            KICKBACKS[0].active = true;
            KICKBACKS[1].active = true;
            for (var ri = 0; ri < DROP_TARGETS.length; ri++) DROP_TARGETS[ri].hit = false;
          }
        }
      }

      // Tombstone collisions (AABB)
      for (var tbi = 0; tbi < TOMBSTONES.length; tbi++) {
        var ts = TOMBSTONES[tbi];
        var tcx = ts.x + ts.w / 2;
        var tcy = ts.y + ts.h / 2;
        var closestX = Math.max(ts.x, Math.min(ballX, ts.x + ts.w));
        var closestY = Math.max(ts.y, Math.min(ballY, ts.y + ts.h));
        var tdx = ballX - closestX;
        var tdy = ballY - closestY;
        var tdist = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tdist < BALL_R + 0.5) {
          var tnx = tdx / (tdist || 1);
          var tny = tdy / (tdist || 1);
          ballX = closestX + tnx * (BALL_R + 1.0);
          ballY = closestY + tny * (BALL_R + 1.0);
          reflectOff(tnx, tny, 0.5);
          ts.flash = 8;
          score += ts.points;
          addScorePopup(tcx, tcy + 3, '+' + ts.points);
          spawnParticles(tcx, tcy, '#888888', 4);
        }
      }

      // Crypt hole collision
      if (CRYPT.state === 'idle' && CRYPT.cooldown <= 0) {
        var cdx2 = ballX - CRYPT.x;
        var cdy2 = ballY - CRYPT.y;
        var cdist = Math.sqrt(cdx2 * cdx2 + cdy2 * cdy2);
        if (cdist < CRYPT.r + BALL_R - 1) {
          CRYPT.state = 'capturing';
          playCrypt();
        }
      }

      // Slingshot collisions
      for (var si = 0; si < SLINGSHOTS.length; si++) {
        var sl = SLINGSHOTS[si];
        if (sl.cooldown > 0) continue;
        var sRes = pointToSeg(ballX, ballY, sl.x1, sl.y1, sl.x2, sl.y2);
        if (sRes.dist < BALL_R + 2) {
          var dir = (si === 0) ? 1 : -1;
          ballVX += dir * 1.2;
          ballVY += 0.5;
          sl.cooldown = 15;
          score += 10;
          spawnParticles(ballX, ballY, '#aa44ff', 4);
          playSlingshot();
        }
      }

      // Spinner collision
      if (Math.abs(ballX - SPINNER.x) < SPINNER.w / 2 &&
          Math.abs(ballY - SPINNER.y) < 3 &&
          Math.abs(ballVY) > 0.5) {
        SPINNER.spinning = Math.abs(ballVY) * 2;
        addCombo(SPINNER.points, SPINNER.x, SPINNER.y);
      }

      // Top lanes
      for (var li = 0; li < TOP_LANES.length; li++) {
        var lane = TOP_LANES[li];
        if (lane.lit) continue;
        if (ballX > lane.x && ballX < lane.x + lane.w &&
            ballY > lane.y - 3 && ballY < lane.y + 3) {
          lane.lit = true;
          addCombo(lane.points, lane.x + lane.w / 2, lane.y);
          var allLit = true;
          for (var al = 0; al < TOP_LANES.length; al++) {
            if (!TOP_LANES[al].lit) { allLit = false; break; }
          }
          if (allLit) {
            multiplier = 2;
            addScorePopup(40, 175, '2x!');
            playBonus();
            for (var rl = 0; rl < TOP_LANES.length; rl++) TOP_LANES[rl].lit = false;
          }
        }
      }

      // Pendulum collision
      var pendBobX = PENDULUM.pivotX + Math.sin(PENDULUM.angle) * PENDULUM.len;
      var pendBobY = PENDULUM.pivotY - Math.cos(PENDULUM.angle) * PENDULUM.len;
      var pdx = ballX - pendBobX;
      var pdy = ballY - pendBobY;
      var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < PENDULUM.bobR + BALL_R) {
        var pnx = pdx / (pdist || 1);
        var pny = pdy / (pdist || 1);
        ballX = pendBobX + pnx * (PENDULUM.bobR + BALL_R + 0.5);
        ballY = pendBobY + pny * (PENDULUM.bobR + BALL_R + 0.5);
        var pendVelX = Math.cos(PENDULUM.angle) * PENDULUM.angVel * PENDULUM.len;
        reflectOff(pnx, pny, 0.6);
        ballVX += pendVelX * 0.8;
        ballVY += 0.5;
        clampVel();
        PENDULUM.angVel = -PENDULUM.angVel * 0.5;
        PENDULUM.flash = 10;
        PENDULUM.hitCount++;
        addCombo(150, pendBobX, pendBobY);
        spawnParticles(pendBobX, pendBobY, '#ffcc44', 6);
        screenShake.timer = 2;
        playBumperHit();
        if (PENDULUM.hitCount >= 5 && !PENDULUM.midnightReady) {
          PENDULUM.midnightReady = true;
          PENDULUM.clockGlow = 1;
          score += 2000;
          addScorePopup(PENDULUM.pivotX, PENDULUM.pivotY + 3, 'MIDNIGHT!');
          addScorePopup(PENDULUM.pivotX, PENDULUM.pivotY, '+2000');
          spawnParticles(PENDULUM.pivotX, PENDULUM.pivotY, '#aa44ff', 15);
          screenShake.timer = 8;
          playBonus();
          PENDULUM.hitCount = 0;
          PENDULUM.midnightReady = false;
        }
      }
      // Pendulum arm collision
      var armRes = pointToSeg(ballX, ballY, PENDULUM.pivotX, PENDULUM.pivotY, pendBobX, pendBobY);
      if (armRes.dist < BALL_R + 0.8 && pdist > PENDULUM.bobR + BALL_R) {
        var anx = (ballX - armRes.cx) / (armRes.dist || 1);
        var any2 = (ballY - armRes.cy) / (armRes.dist || 1);
        ballX = armRes.cx + anx * (BALL_R + 1.2);
        ballY = armRes.cy + any2 * (BALL_R + 1.2);
        reflectOff(anx, any2, 0.3);
      }

      // Flipper collisions
      collideFlipper(leftFlipper, 1);
      collideFlipper(rightFlipper, -1);

      // Kickback check
      if (ballX < 8 && ballY > 20 && ballY < 42 && ballVY < 0) {
        if (KICKBACKS[0].active) {
          KICKBACKS[0].active = false;
          KICKBACKS[0].flash = 15;
          ballVY = Math.abs(ballVY) + 2.0;
          ballVX = 1.5;
          playKickback();
          spawnParticles(ballX, ballY, '#ff4444', 6);
        }
      }
      if (ballX > 58 && ballX < 66 && ballY > 20 && ballY < 42 && ballVY < 0) {
        if (KICKBACKS[1].active) {
          KICKBACKS[1].active = false;
          KICKBACKS[1].flash = 15;
          ballVY = Math.abs(ballVY) + 2.0;
          ballVX = -1.5;
          playKickback();
          spawnParticles(ballX, ballY, '#ff4444', 6);
        }
      }

      // Drain check
      if (ballY < 0) {
        if (ballSaveTimer > 0) {
          state = 'ballsave';
          playBallSave();
          spawnParticles(ballX, ballY, '#cc2020', 12);
          screenShake.timer = 5;
        } else {
          state = 'draining';
          playDrain();
          spawnParticles(ballX, ballY, '#cc2020', 12);
          screenShake.timer = 8;
        }
        break;
      }

      // Hard boundaries (field only)
      if (ballX < 3) { ballX = 3; ballVX = Math.abs(ballVX) * 0.6; }
      if (ballX > 66) { ballX = 66; ballVX = -Math.abs(ballVX) * 0.6; }
      if (ballY > 175) { ballY = 175; ballVY = -Math.abs(ballVY) * 0.5; }
    }
  }

  function updateFlipper(f, restAngle, activeAngle) {
    var target = f.active ? activeAngle : restAngle;
    var diff = target - f.angle;
    if (Math.abs(diff) < 0.02) {
      f.angle = target;
    } else {
      f.angle += (diff > 0 ? 1 : -1) * FLIPPER_SPEED;
      if (diff > 0 && f.angle > target) f.angle = target;
      if (diff < 0 && f.angle < target) f.angle = target;
    }
  }

  function collideFlipper(f, dir) {
    var end = flipperEnd(f);
    var res = pointToSeg(ballX, ballY, f.px, f.py, end.x, end.y);
    if (res.dist < BALL_R + 2.0) {
      var nx = (ballX - res.cx);
      var ny = (ballY - res.cy);
      var nd = Math.sqrt(nx * nx + ny * ny);
      if (nd > 0.001) {
        nx /= nd; ny /= nd;
        ballX = res.cx + nx * (BALL_R + 2.2);
        ballY = res.cy + ny * (BALL_R + 2.2);
        if (f.active) {
          var tipFactor = 1.0 + res.t * 0.5;
          ballVY = 2.8 * tipFactor;
          ballVX += dir * 1.2 * tipFactor;
          clampVel();
          playFlipper();
        } else {
          reflectOff(nx, ny, 0.3);
          ballVX *= 0.5;
          ballVY *= 0.5;
        }
      }
    }
  }

  // ===== Drawing =====
  function draw() {
    ctx.save();

    if (screenShake.timer > 0) {
      ctx.translate(screenShake.x, screenShake.y);
    }

    drawBackground();
    drawTableSurface();
    drawPlungerLane();
    drawHauntedHouse();
    drawWalls3D();
    drawSlingshots3D();
    drawTombstones();
    drawBumpers3D();
    drawDropTargets3D();
    drawCryptHole();
    drawPendulum();
    drawSpinner();
    drawTopLanes();
    drawKickbacks();
    drawFlippers3D();

    // Ball drawing — in_lane ball is drawn inside drawPlungerLane()
    if (state === 'playing' || state === 'draining' || state === 'ballsave') {
      if (CRYPT.state !== 'holding') {
        drawBall3D();
      }
    }

    drawFogParticles();
    drawParticles();
    drawScorePopups();
    drawScoreLED();
    drawBallIndicator();
    drawMultiplier();

    // Ball save indicator
    if (ballSaveTimer > 0 && state === 'playing') {
      if (frameCount % 30 < 20) {
        var sp = tableToScreen(40, 5);
        drawLedString(sp.x - 18, sp.y - 2, 'BALL SAVE', '#ff3333', 1);
      }
    }

    if (state === 'title') drawTitleScreen();
    if (state === 'gameover') drawGameOver();
    if (state === 'ready') drawReady();

    ctx.restore();
  }

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    g.addColorStop(0, '#0a0510');
    g.addColorStop(1, '#150820');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (lightningTimer > 0) {
      ctx.fillStyle = 'rgba(200,180,255,' + (0.15 + Math.random() * 0.1) + ')';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }

  function drawTableSurface() {
    var tl = tableToScreen(0, TABLE_H);
    var tr = tableToScreen(TABLE_W, TABLE_H);
    var bl = tableToScreen(0, 0);
    var br = tableToScreen(TABLE_W, 0);

    var g = ctx.createLinearGradient(0, tl.y, 0, bl.y);
    g.addColorStop(0, '#0d0618');
    g.addColorStop(0.5, '#1a0a20');
    g.addColorStop(1, '#0d0618');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    // Spider web pattern
    ctx.strokeStyle = 'rgba(80, 40, 100, 0.1)';
    ctx.lineWidth = 0.5;
    for (var gy = 0; gy <= TABLE_H; gy += 30) {
      var l = tableToScreen(0, gy);
      var r = tableToScreen(TABLE_W, gy);
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
    }
    var center = tableToScreen(40, 160);
    for (var a = 0; a < 8; a++) {
      var angle = (a / 8) * Math.PI;
      var ex = 40 + Math.cos(angle) * 60;
      var ey = 160 - Math.sin(angle) * 80;
      if (ey < 0) ey = 0;
      var ep = tableToScreen(ex, ey);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(ep.x, ep.y);
      ctx.stroke();
    }
  }

  // ===== Plunger Lane — visual only, no physics walls =====
  function drawPlungerLane() {
    // Lane background strip
    var laneTL = tableToScreen(68, 170);
    var laneTR = tableToScreen(78, 170);
    var laneBL = tableToScreen(68, 5);
    var laneBR = tableToScreen(78, 5);

    ctx.fillStyle = '#05030a';
    ctx.beginPath();
    ctx.moveTo(laneTL.x, laneTL.y);
    ctx.lineTo(laneTR.x, laneTR.y);
    ctx.lineTo(laneBR.x, laneBR.y);
    ctx.lineTo(laneBL.x, laneBL.y);
    ctx.closePath();
    ctx.fill();

    // Lane edge decorative lines (no physics)
    ctx.strokeStyle = 'rgba(60,30,50,0.5)';
    ctx.lineWidth = 1;
    // Left lane wall visual
    var lw1 = tableToScreen(68, 170);
    var lw2 = tableToScreen(68, 5);
    ctx.beginPath();
    ctx.moveTo(lw1.x, lw1.y);
    ctx.lineTo(lw2.x, lw2.y);
    ctx.stroke();
    // Right lane wall visual
    var rw1 = tableToScreen(78, 170);
    var rw2 = tableToScreen(78, 5);
    ctx.beginPath();
    ctx.moveTo(rw1.x, rw1.y);
    ctx.lineTo(rw2.x, rw2.y);
    ctx.stroke();

    // Lane exit curve visual at top
    ctx.strokeStyle = 'rgba(80,40,60,0.4)';
    ctx.lineWidth = 0.5;
    var curveStart = tableToScreen(68, 145);
    var curveEnd = tableToScreen(64, 155);
    ctx.beginPath();
    ctx.moveTo(curveStart.x, curveStart.y);
    ctx.quadraticCurveTo(
      tableToScreen(66, 150).x,
      tableToScreen(66, 150).y,
      curveEnd.x, curveEnd.y
    );
    ctx.stroke();

    // Plunger mechanism
    var plungerY = 10 + plungerPower * 8;
    var barTop = tableToScreen(71, plungerY);
    var barBot = tableToScreen(71, 5);
    var barTopR = tableToScreen(75, plungerY);

    var pg = ctx.createLinearGradient(barTop.x, 0, barTopR.x, 0);
    pg.addColorStop(0, '#4a3848');
    pg.addColorStop(0.5, '#6a5868');
    pg.addColorStop(1, '#4a3848');
    ctx.fillStyle = pg;

    var bw = barTopR.x - barTop.x;
    var bh = barBot.y - barTop.y;
    ctx.fillRect(barTop.x, barTop.y, bw, bh);

    // Plunger head
    ctx.fillStyle = '#8a7880';
    ctx.fillRect(barTop.x - 1, barTop.y - 2, bw + 2, 4);

    // Power bar
    if (state === 'launching') {
      var powerH = plungerPower * 30;
      var pbSp = tableToScreen(LANE_X, 20);
      ctx.fillStyle = '#cc2020';
      ctx.fillRect(pbSp.x - 2, pbSp.y, 4, -powerH);
      ctx.fillStyle = '#ff4040';
      ctx.fillRect(pbSp.x - 2, pbSp.y - powerH, 4, 2);
    }

    // Ball in lane — draw during ready, launching, and in_lane states
    if (state === 'ready' || state === 'launching' || state === 'in_lane') {
      var drawY = (state === 'in_lane') ? ballY : 10;
      var bsp = tableToScreen(LANE_X, drawY);
      var bsr = scaleAt(drawY, BALL_R);
      bsr = Math.max(bsr, 1.5);

      // Eyeball body
      var bg = ctx.createRadialGradient(
        bsp.x - bsr * 0.3, bsp.y - bsr * 0.3, bsr * 0.1,
        bsp.x, bsp.y, bsr
      );
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.5, '#e8e0d8');
      bg.addColorStop(1, '#a09888');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bsp.x, bsp.y, bsr, 0, Math.PI * 2);
      ctx.fill();

      // Red iris — look upward when in lane
      var irisOffX = 0;
      var irisOffY = (state === 'in_lane') ? -bsr * 0.25 : 0;
      ctx.fillStyle = '#cc2020';
      ctx.beginPath();
      ctx.arc(bsp.x + irisOffX, bsp.y + irisOffY, bsr * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Pupil
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(bsp.x + irisOffX, bsp.y + irisOffY, bsr * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHauntedHouse() {
    var roofL = tableToScreen(10, 180);
    var roofC = tableToScreen(40, 185);
    var roofR = tableToScreen(70, 180);
    var baseL = tableToScreen(10, 172);
    var baseR = tableToScreen(70, 172);

    ctx.fillStyle = '#1a0820';
    ctx.beginPath();
    ctx.moveTo(baseL.x, baseL.y);
    ctx.lineTo(roofL.x, roofL.y);
    ctx.lineTo(roofC.x, roofC.y);
    ctx.lineTo(roofR.x, roofR.y);
    ctx.lineTo(baseR.x, baseR.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#3a2840';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(roofL.x, roofL.y);
    ctx.lineTo(roofC.x, roofC.y);
    ctx.lineTo(roofR.x, roofR.y);
    ctx.stroke();

    for (var i = 0; i < 3; i++) {
      var wx = 20 + i * 15 + 5;
      var wy = 176;
      var wsp = tableToScreen(wx, wy);
      var wsz = scaleAt(wy, 4);

      if (ghostWindowTimer > 0 && ghostWindowIndex === i) {
        ctx.fillStyle = 'rgba(80, 255, 120, 0.3)';
        ctx.fillRect(wsp.x - wsz / 2, wsp.y - wsz / 2, wsz, wsz);
        ctx.fillStyle = 'rgba(200, 255, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(wsp.x, wsp.y - wsz * 0.1, wsz * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(wsp.x - wsz * 0.15, wsp.y, wsz * 0.3, wsz * 0.3);
      } else {
        ctx.fillStyle = '#0a0510';
        ctx.fillRect(wsp.x - wsz / 2, wsp.y - wsz / 2, wsz, wsz);
      }
      ctx.strokeStyle = '#3a2840';
      ctx.strokeRect(wsp.x - wsz / 2, wsp.y - wsz / 2, wsz, wsz);
    }
  }

  function drawWalls3D() {
    ctx.lineWidth = 2;
    for (var i = 0; i < WALLS.length; i++) {
      var w = WALLS[i];
      var s1 = tableToScreen(w.x1, w.y1);
      var s2 = tableToScreen(w.x2, w.y2);

      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.moveTo(s1.x + 1, s1.y + 1);
      ctx.lineTo(s2.x + 1, s2.y + 1);
      ctx.stroke();

      ctx.strokeStyle = '#3a2840';
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(106,72,112,0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y - 1);
      ctx.lineTo(s2.x, s2.y - 1);
      ctx.stroke();
      ctx.lineWidth = 2;
    }
    ctx.lineWidth = 1;
  }

  function drawSlingshots3D() {
    for (var i = 0; i < SLINGSHOTS.length; i++) {
      var sl = SLINGSHOTS[i];
      var s1 = tableToScreen(sl.x1, sl.y1);
      var s2 = tableToScreen(sl.x2, sl.y2);
      var s3 = tableToScreen(sl.x3, sl.y3);

      var flash = sl.cooldown > 10;

      ctx.fillStyle = flash ? 'rgba(200,50,80,0.5)' : 'rgba(96,32,64,0.6)';
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.lineTo(s3.x, s3.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = flash ? '#ff4060' : '#602040';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.lineTo(s3.x, s3.y);
      ctx.closePath();
      ctx.stroke();

      if (!flash) {
        ctx.strokeStyle = 'rgba(120,50,80,0.4)';
        var mx = (s1.x + s3.x) / 2;
        var my = (s1.y + s3.y) / 2;
        ctx.beginPath();
        ctx.moveTo(s2.x, s2.y);
        ctx.quadraticCurveTo(mx + (i === 0 ? 3 : -3), my, s3.x, s3.y);
        ctx.stroke();
      }
    }
  }

  function drawTombstones() {
    for (var i = 0; i < TOMBSTONES.length; i++) {
      var ts = TOMBSTONES[i];
      var sp = tableToScreen(ts.x + ts.w / 2, ts.y + ts.h / 2);
      var sw = scaleAt(ts.y, ts.w);
      var sh = scaleAt(ts.y, ts.h);
      var flash = ts.flash > 0;

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(sp.x - sw / 2 + 1, sp.y - sh / 2 + 1, sw, sh);

      var tg = ctx.createLinearGradient(sp.x - sw / 2, sp.y - sh / 2, sp.x + sw / 2, sp.y + sh / 2);
      tg.addColorStop(0, flash ? '#888888' : '#4a4a4a');
      tg.addColorStop(1, flash ? '#666666' : '#2a2a2a');
      ctx.fillStyle = tg;

      ctx.beginPath();
      var topRadius = sw * 0.4;
      ctx.moveTo(sp.x - sw / 2, sp.y + sh / 2);
      ctx.lineTo(sp.x - sw / 2, sp.y - sh / 2 + topRadius);
      ctx.arc(sp.x, sp.y - sh / 2 + topRadius, sw / 2, Math.PI, 0);
      ctx.lineTo(sp.x + sw / 2, sp.y + sh / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(40,80,30,0.4)';
      ctx.fillRect(sp.x - sw / 2, sp.y + sh * 0.1, sw, sh * 0.2);

      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sp.x - sw / 2, sp.y + sh / 2);
      ctx.lineTo(sp.x - sw / 2, sp.y - sh / 2 + topRadius);
      ctx.arc(sp.x, sp.y - sh / 2 + topRadius, sw / 2, Math.PI, 0);
      ctx.lineTo(sp.x + sw / 2, sp.y + sh / 2);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = 'rgba(150,150,150,0.5)';
      ctx.fillRect(sp.x - 1, sp.y - sh * 0.2, 2, 0.5);
    }
  }

  function drawBumpers3D() {
    for (var i = 0; i < BUMPERS.length; i++) {
      var b = BUMPERS[i];
      var sp = tableToScreen(b.x, b.y);
      var sr = scaleAt(b.y, b.r) * b.scale;
      var flash = b.flash > 0;

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(sp.x + sr * 0.2, sp.y + sr * 0.4, sr, sr * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      var g = ctx.createRadialGradient(
        sp.x - sr * 0.25, sp.y - sr * 0.25, sr * 0.1,
        sp.x, sp.y, sr
      );
      if (flash) {
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, '#cc88ff');
        g.addColorStop(1, '#aa44ff');
      } else {
        g.addColorStop(0, '#80ffaa');
        g.addColorStop(0.5, '#30aa50');
        g.addColorStop(1, '#104020');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sr, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = flash ? '#cc88ff' : '#40ff80';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sr + 1, 0, Math.PI * 2);
      ctx.stroke();

      // Skull face
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(sp.x - sr * 0.25, sp.y - sr * 0.15, sr * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sp.x + sr * 0.25, sp.y - sr * 0.15, sr * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sp.x - sr * 0.2, sp.y + sr * 0.25);
      ctx.lineTo(sp.x + sr * 0.2, sp.y + sr * 0.25);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(sp.x - sr * 0.2, sp.y - sr * 0.2, sr * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDropTargets3D() {
    for (var i = 0; i < DROP_TARGETS.length; i++) {
      var t = DROP_TARGETS[i];
      var sp = tableToScreen(t.x + t.w / 2, t.y + t.h / 2);
      var sw = scaleAt(t.y, t.w);
      var sh = scaleAt(t.y, t.h);

      if (t.hit) {
        ctx.fillStyle = '#1a1520';
        ctx.fillRect(sp.x - sw / 2, sp.y - sh / 2, sw, sh);
      } else {
        var g = ctx.createLinearGradient(sp.x - sw / 2, sp.y - sh / 2, sp.x + sw / 2, sp.y + sh / 2);
        g.addColorStop(0, '#cc2020');
        g.addColorStop(1, '#801010');
        ctx.fillStyle = g;

        // Coffin shape
        ctx.beginPath();
        ctx.moveTo(sp.x - sw * 0.3, sp.y - sh / 2);
        ctx.lineTo(sp.x + sw * 0.3, sp.y - sh / 2);
        ctx.lineTo(sp.x + sw / 2, sp.y - sh * 0.2);
        ctx.lineTo(sp.x + sw / 2, sp.y + sh / 2);
        ctx.lineTo(sp.x - sw / 2, sp.y + sh / 2);
        ctx.lineTo(sp.x - sw / 2, sp.y - sh * 0.2);
        ctx.closePath();
        ctx.fill();

        // Cross
        ctx.strokeStyle = '#ff6040';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - sh * 0.3);
        ctx.lineTo(sp.x, sp.y + sh * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sp.x - sw * 0.15, sp.y - sh * 0.1);
        ctx.lineTo(sp.x + sw * 0.15, sp.y - sh * 0.1);
        ctx.stroke();

        // Border
        ctx.strokeStyle = '#ff4020';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sp.x - sw * 0.3, sp.y - sh / 2);
        ctx.lineTo(sp.x + sw * 0.3, sp.y - sh / 2);
        ctx.lineTo(sp.x + sw / 2, sp.y - sh * 0.2);
        ctx.lineTo(sp.x + sw / 2, sp.y + sh / 2);
        ctx.lineTo(sp.x - sw / 2, sp.y + sh / 2);
        ctx.lineTo(sp.x - sw / 2, sp.y - sh * 0.2);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  function drawCryptHole() {
    var sp = tableToScreen(CRYPT.x, CRYPT.y);
    var sr = scaleAt(CRYPT.y, CRYPT.r);

    var hg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr);
    hg.addColorStop(0, '#000000');
    hg.addColorStop(0.6, '#0a0510');
    hg.addColorStop(1, '#1a0a20');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sr, 0, Math.PI * 2);
    ctx.fill();

    // Vortex spiral
    ctx.strokeStyle = 'rgba(64, 255, 128, 0.3)';
    ctx.lineWidth = 0.5;
    for (var v = 0; v < 3; v++) {
      ctx.beginPath();
      var startAngle = CRYPT.vortexAngle + (v * Math.PI * 2 / 3);
      for (var step = 0; step < 20; step++) {
        var a = startAngle + step * 0.3;
        var r = sr * (step / 20);
        var vx = sp.x + Math.cos(a) * r;
        var vy = sp.y + Math.sin(a) * r * 0.6;
        if (step === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }

    if (CRYPT.state === 'holding') {
      var glowAlpha = 0.2 + CRYPT.glowPulse * 0.3;
      ctx.fillStyle = 'rgba(64, 255, 128, ' + glowAlpha + ')';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sr * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = CRYPT.state === 'idle' ? '#204030' : '#40ff80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sr, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawPendulum() {
    var flash = PENDULUM.flash > 0;
    var bobX = PENDULUM.pivotX + Math.sin(PENDULUM.angle) * PENDULUM.len;
    var bobY = PENDULUM.pivotY - Math.cos(PENDULUM.angle) * PENDULUM.len;

    var pivotSp = tableToScreen(PENDULUM.pivotX, PENDULUM.pivotY);
    var bobSp = tableToScreen(bobX, bobY);
    var bobSr = scaleAt(bobY, PENDULUM.bobR);
    var pivotSr = scaleAt(PENDULUM.pivotY, 5);

    // Clock face
    var clockGlow = PENDULUM.clockGlow;
    ctx.strokeStyle = flash ? '#ffcc44' : ('rgba(120,80,40,' + (0.6 + clockGlow * 0.2) + ')');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pivotSp.x, pivotSp.y, pivotSr, 0, Math.PI * 2);
    ctx.stroke();

    var cfg = ctx.createRadialGradient(pivotSp.x, pivotSp.y, 0, pivotSp.x, pivotSp.y, pivotSr);
    cfg.addColorStop(0, flash ? '#443020' : '#1a1008');
    cfg.addColorStop(1, '#0a0504');
    ctx.fillStyle = cfg;
    ctx.beginPath();
    ctx.arc(pivotSp.x, pivotSp.y, pivotSr, 0, Math.PI * 2);
    ctx.fill();

    // Clock numbers
    ctx.fillStyle = flash ? '#ffcc44' : '#806030';
    var numPositions = [
      { a: -Math.PI / 2 }, { a: 0 }, { a: Math.PI / 2 }, { a: Math.PI }
    ];
    for (var ni = 0; ni < numPositions.length; ni++) {
      var na = numPositions[ni].a;
      var nr = pivotSr * 0.7;
      var nx = pivotSp.x + Math.cos(na) * nr;
      var ny = pivotSp.y + Math.sin(na) * nr;
      ctx.beginPath();
      ctx.arc(nx, ny, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clock hands
    var hourAngle = (frameCount * 0.001) % (Math.PI * 2);
    var minuteAngle = (frameCount * 0.012) % (Math.PI * 2);
    ctx.strokeStyle = '#806030';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pivotSp.x, pivotSp.y);
    ctx.lineTo(pivotSp.x + Math.cos(hourAngle - Math.PI/2) * pivotSr * 0.4,
               pivotSp.y + Math.sin(hourAngle - Math.PI/2) * pivotSr * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pivotSp.x, pivotSp.y);
    ctx.lineTo(pivotSp.x + Math.cos(minuteAngle - Math.PI/2) * pivotSr * 0.6,
               pivotSp.y + Math.sin(minuteAngle - Math.PI/2) * pivotSr * 0.6);
    ctx.stroke();

    // Hit count dots
    for (var hi = 0; hi < 5; hi++) {
      var ha = -Math.PI / 2 + (hi / 5) * Math.PI * 2;
      var hx = pivotSp.x + Math.cos(ha) * (pivotSr + 2);
      var hy = pivotSp.y + Math.sin(ha) * (pivotSr + 2);
      ctx.fillStyle = hi < PENDULUM.hitCount ? '#ff4444' : '#2a1a10';
      ctx.beginPath();
      ctx.arc(hx, hy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pendulum arm
    ctx.strokeStyle = flash ? '#cc9944' : '#604020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pivotSp.x, pivotSp.y);
    ctx.lineTo(bobSp.x, bobSp.y);
    ctx.stroke();

    // Bob shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(bobSp.x + bobSr * 0.2, bobSp.y + bobSr * 0.4, bobSr, bobSr * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bob body
    var bg = ctx.createRadialGradient(
      bobSp.x - bobSr * 0.25, bobSp.y - bobSr * 0.25, bobSr * 0.1,
      bobSp.x, bobSp.y, bobSr
    );
    if (flash) {
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.4, '#ffdd88');
      bg.addColorStop(1, '#cc8830');
    } else {
      bg.addColorStop(0, '#cc9944');
      bg.addColorStop(0.5, '#886630');
      bg.addColorStop(1, '#443310');
    }
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bobSp.x, bobSp.y, bobSr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = flash ? '#ffee88' : '#aa7730';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(bobSp.x, bobSp.y, bobSr * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    // Evil eye on bob
    ctx.fillStyle = '#220000';
    ctx.beginPath();
    ctx.arc(bobSp.x, bobSp.y, bobSr * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#ff4444' : '#881111';
    ctx.beginPath();
    ctx.arc(bobSp.x, bobSp.y, bobSr * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,200,0.2)';
    ctx.beginPath();
    ctx.arc(bobSp.x - bobSr * 0.2, bobSp.y - bobSr * 0.2, bobSr * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpinner() {
    var sp = tableToScreen(SPINNER.x, SPINNER.y);
    var sw = scaleAt(SPINNER.y, SPINNER.w);

    ctx.save();
    ctx.translate(sp.x, sp.y);

    ctx.strokeStyle = 'rgba(80, 40, 100, 0.2)';
    ctx.lineWidth = 0.3;
    for (var a = 0; a < 6; a++) {
      var angle = (a / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(angle) * sw / 2, -Math.sin(angle) * 2);
      ctx.lineTo(Math.cos(angle) * sw / 2, Math.sin(angle) * 2);
      ctx.stroke();
    }

    var angle = SPINNER.angle;
    var vis = Math.abs(Math.cos(angle));
    ctx.fillStyle = '#6a4870';
    ctx.fillRect(-sw / 2 * vis, -1, sw * vis, 2);

    ctx.fillStyle = '#8a6890';
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawTopLanes() {
    for (var i = 0; i < TOP_LANES.length; i++) {
      var lane = TOP_LANES[i];
      var sp = tableToScreen(lane.x + lane.w / 2, lane.y);
      var sw = scaleAt(lane.y, lane.w);

      if (lane.lit) {
        ctx.fillStyle = 'rgba(51, 255, 102, 0.4)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sw * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(51, 255, 102, 0.15)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sw * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 255, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y - 1, sw * 0.12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#3a2840';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sw * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(10, 5, 16, 0.5)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sw * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawKickbacks() {
    for (var i = 0; i < KICKBACKS.length; i++) {
      var kb = KICKBACKS[i];
      var sp = tableToScreen(kb.x, kb.y);
      var sz = scaleAt(kb.y, 3);

      if (kb.active) {
        var pulse = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
        ctx.fillStyle = 'rgba(255, 50, 50, ' + pulse + ')';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sz, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y + sz * 0.5);
        ctx.lineTo(sp.x, sp.y - sz * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sp.x - sz * 0.3, sp.y - sz * 0.1);
        ctx.lineTo(sp.x, sp.y - sz * 0.5);
        ctx.lineTo(sp.x + sz * 0.3, sp.y - sz * 0.1);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(40, 20, 30, 0.4)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2a1520';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sz, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (kb.flash > 0) {
        ctx.fillStyle = 'rgba(255, 100, 50, ' + (kb.flash / 15 * 0.5) + ')';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sz * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawFlippers3D() {
    drawOneFlipper(leftFlipper);
    drawOneFlipper(rightFlipper);
  }

  function drawOneFlipper(f) {
    var sp = tableToScreen(f.px, f.py);
    var end = flipperEnd(f);
    var se = tableToScreen(end.x, end.y);

    var pivotR = scaleAt(f.py, 2.5);
    var tipR = scaleAt(end.y, 1.5);

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = pivotR * 2 + 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sp.x + 1, sp.y + 2);
    ctx.lineTo(se.x + 1, se.y + 2);
    ctx.stroke();

    var g = ctx.createLinearGradient(sp.x, sp.y - pivotR, sp.x, sp.y + pivotR);
    g.addColorStop(0, '#d8c8a0');
    g.addColorStop(0.3, '#b8a880');
    g.addColorStop(0.7, '#9a8a68');
    g.addColorStop(1, '#8a7a60');

    ctx.strokeStyle = g;
    ctx.lineWidth = pivotR * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(se.x, se.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,240,200,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y - pivotR * 0.5);
    ctx.lineTo(se.x, se.y - tipR * 0.5);
    ctx.stroke();

    ctx.fillStyle = '#a89870';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, pivotR * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'butt';
  }

  function drawBall3D() {
    var sp = tableToScreen(ballX, ballY);
    var sr = scaleAt(ballY, BALL_R);
    sr = Math.max(sr, 1.5);

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(sp.x + sr * 0.3, sp.y + sr * 0.5, sr, sr * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyeball body
    var g = ctx.createRadialGradient(
      sp.x - sr * 0.3, sp.y - sr * 0.3, sr * 0.1,
      sp.x, sp.y, sr
    );
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#e8e0d8');
    g.addColorStop(1, '#a09888');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sr, 0, Math.PI * 2);
    ctx.fill();

    // Red iris — offset toward velocity
    var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    var irisOffX = 0, irisOffY = 0;
    if (spd > 0.1) {
      irisOffX = ballVX / spd * sr * 0.25;
      irisOffY = -ballVY / spd * sr * 0.25;
    }

    ctx.fillStyle = '#cc2020';
    ctx.beginPath();
    ctx.arc(sp.x + irisOffX, sp.y + irisOffY, sr * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(sp.x + irisOffX, sp.y + irisOffY, sr * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,100,80,0.3)';
    ctx.beginPath();
    ctx.arc(sp.x + irisOffX - sr * 0.1, sp.y + irisOffY - sr * 0.1, sr * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Red veins
    ctx.strokeStyle = 'rgba(180, 30, 30, 0.3)';
    ctx.lineWidth = 0.3;
    for (var v = 0; v < 4; v++) {
      var va = (v / 4) * Math.PI * 2 + frameCount * 0.001;
      ctx.beginPath();
      ctx.moveTo(sp.x + Math.cos(va) * sr * 0.5, sp.y + Math.sin(va) * sr * 0.5);
      ctx.lineTo(sp.x + Math.cos(va) * sr * 0.9, sp.y + Math.sin(va) * sr * 0.9);
      ctx.stroke();
    }
  }

  function drawFogParticles() {
    for (var i = 0; i < fogParticles.length; i++) {
      var f = fogParticles[i];
      var fsp = tableToScreen(f.x, f.y);
      var fr = scaleAt(f.y, f.r);
      ctx.fillStyle = 'rgba(150, 130, 160, ' + f.alpha + ')';
      ctx.beginPath();
      ctx.arc(fsp.x, fsp.y, fr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var sp = tableToScreen(p.x, p.y);
      var alpha = p.life / p.maxLife;
      var r = scaleAt(p.y, 0.8) * alpha;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, Math.max(r, 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawScorePopups() {
    for (var i = 0; i < scorePopups.length; i++) {
      var p = scorePopups[i];
      var sp = tableToScreen(p.x, p.y);
      var alpha = p.life / 40;
      ctx.globalAlpha = alpha;
      drawLedString(sp.x - p.text.length * 2, sp.y, p.text, '#33ff66', 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawScoreLED() {
    var scoreStr = String(score);
    while (scoreStr.length < 6) scoreStr = '0' + scoreStr;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(2, 2, 52, 10);
    drawLedString(4, 3, scoreStr, '#ff3333', 1);
  }

  function drawBallIndicator() {
    var startX = CANVAS_W - 4;
    for (var i = 0; i < balls; i++) {
      var bx = startX - i * 6;
      ctx.fillStyle = '#e8e0d8';
      ctx.beginPath();
      ctx.arc(bx, 7, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cc2020';
      ctx.beginPath();
      ctx.arc(bx, 7, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(bx, 7, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMultiplier() {
    if (multiplier > 1) {
      var text = multiplier + 'x';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(56, 2, 20, 10);
      drawLedString(58, 3, text, '#33ff66', 1);
    }
    if (comboCount >= 3 && comboTimer > 0) {
      var comboStr = comboCount + 'HIT';
      drawLedString(CANVAS_W / 2 - comboStr.length * 2, 14, comboStr, '#aa44ff', 1);
    }
  }

  function drawTitleScreen() {
    ctx.fillStyle = 'rgba(10,5,16,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (lightningTimer > 0) {
      ctx.fillStyle = 'rgba(200,180,255,0.1)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Demo eyeball
    demoBallX += demoBallVX;
    demoBallY += demoBallVY;
    if (demoBallX < 20 || demoBallX > CANVAS_W - 20) demoBallVX = -demoBallVX;
    if (demoBallY < 40 || demoBallY > CANVAS_H - 60) demoBallVY = -demoBallVY;

    ctx.fillStyle = 'rgba(204, 32, 32, 0.1)';
    ctx.beginPath();
    ctx.arc(demoBallX, demoBallY, 8, 0, Math.PI * 2);
    ctx.fill();

    var dbg = ctx.createRadialGradient(
      demoBallX - 1, demoBallY - 1, 1,
      demoBallX, demoBallY, 4
    );
    dbg.addColorStop(0, '#ffffff');
    dbg.addColorStop(0.5, '#e8e0d8');
    dbg.addColorStop(1, '#a09888');
    ctx.fillStyle = dbg;
    ctx.beginPath();
    ctx.arc(demoBallX, demoBallY, 4, 0, Math.PI * 2);
    ctx.fill();

    var dirisX = demoBallVX > 0 ? 0.5 : -0.5;
    var dirisY = demoBallVY > 0 ? -0.5 : 0.5;
    ctx.fillStyle = '#cc2020';
    ctx.beginPath();
    ctx.arc(demoBallX + dirisX, demoBallY + dirisY, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(demoBallX + dirisX, demoBallY + dirisY, 0.8, 0, Math.PI * 2);
    ctx.fill();

    drawLedString(CANVAS_W / 2 - 28, 52, 'HAUNTED', '#ff3333', 2);
    drawLedString(CANVAS_W / 2 - 28, 72, 'PINBALL', '#ff3333', 2);

    ctx.strokeStyle = '#6a2848';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, 92);
    ctx.lineTo(CANVAS_W - 15, 92);
    ctx.stroke();

    ctx.strokeStyle = '#3a1828';
    ctx.beginPath();
    ctx.moveTo(20, 94);
    ctx.lineTo(CANVAS_W - 20, 94);
    ctx.stroke();

    if (frameCount % 60 < 40) {
      drawLedString(CANVAS_W / 2 - 26, 115, 'PRESS SPACE', '#33ff66', 1);
    }

    // Controls section
    var cx = CANVAS_W / 2;
    drawLedString(cx - 16, 108, 'KEYS', '#6a4870', 1);

    // Separator
    ctx.strokeStyle = '#3a1828';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 40, 115);
    ctx.lineTo(cx + 40, 115);
    ctx.stroke();

    // Flipper controls
    drawLedString(cx - 36, 120, 'A . D', '#33ff66', 1);
    drawLedString(cx + 4, 120, 'FLIPPER', '#6a4870', 1);

    // Launch control
    drawLedString(cx - 36, 132, 'SPACE', '#33ff66', 1);
    drawLedString(cx + 4, 132, 'LAUNCH', '#6a4870', 1);

    // Hold hint
    drawLedString(cx - 24, 148, 'HOLD SPACE', '#3a2840', 1);
    drawLedString(cx - 28, 158, 'FOR POWER!', '#3a2840', 1);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(10,5,20,0.85)';
    ctx.fillRect(0, 60, CANVAS_W, 90);

    ctx.strokeStyle = '#cc2020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 62);
    ctx.lineTo(CANVAS_W - 10, 62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 148);
    ctx.lineTo(CANVAS_W - 10, 148);
    ctx.stroke();

    drawLedString(CANVAS_W / 2 - 16, 72, 'GAME', '#ff3333', 2);
    drawLedString(CANVAS_W / 2 - 16, 90, 'OVER', '#ff3333', 2);

    var scoreStr = String(score);
    drawLedString(CANVAS_W / 2 - scoreStr.length * 2, 115, scoreStr, '#33ff66', 1);

    if (frameCount % 60 < 40) {
      drawLedString(CANVAS_W / 2 - 14, 132, 'CLICK', '#3a2840', 1);
    }
  }

  function drawReady() {
    if (frameCount % 50 < 35) {
      var sp = tableToScreen(40, 25);
      drawLedString(sp.x - 14, sp.y, 'SPACE', '#33ff66', 1);
    }
  }

  // ===== Input =====
  var keys = {};

  document.addEventListener('keydown', function (e) {
    if (!isWindowVisible() || !isTopWindow()) return;

    var key = e.key.toLowerCase();

    if (key === ' ' || key === 'spacebar') {
      e.preventDefault();
      if (state === 'title') {
        resetGame();
        return;
      }
      if (state === 'ready' && !keys.space) {
        state = 'launching';
        plungerPower = 0;
      }
      keys.space = true;
    }

    if (key === 'arrowleft' || key === 'a') {
      e.preventDefault();
      if (state === 'title') { resetGame(); return; }
      if (!leftFlipper.active) playFlipper();
      leftFlipper.active = true;
      keys.left = true;
    }

    if (key === 'arrowright' || key === 'd') {
      e.preventDefault();
      if (state === 'title') { resetGame(); return; }
      if (!rightFlipper.active) playFlipper();
      rightFlipper.active = true;
      keys.right = true;
    }
  });

  document.addEventListener('keyup', function (e) {
    var key = e.key.toLowerCase();

    if (key === ' ' || key === 'spacebar') {
      if (state === 'launching') {
        // Launch into in_lane state (rail-based)
        var power = plungerPower;
        ballX = LANE_X;
        ballY = 12;
        ballVY = power * 5.0 + 3.5; // min 3.5, max 8.5
        ballVX = 0;
        plungerPower = 0;
        state = 'in_lane';
        playLaunch();
      }
      keys.space = false;
    }

    if (key === 'arrowleft' || key === 'a') {
      leftFlipper.active = false;
      keys.left = false;
    }

    if (key === 'arrowright' || key === 'd') {
      rightFlipper.active = false;
      keys.right = false;
    }
  });

  canvas.addEventListener('click', function () {
    if (state === 'gameover') {
      state = 'title';
    } else if (state === 'title') {
      resetGame();
    }
  });

  // ===== Game Loop =====
  function loop(timestamp) {
    animFrame = requestAnimationFrame(loop);

    if (!isWindowVisible()) {
      lastTime = 0;
      return;
    }

    if (lastTime === 0) { lastTime = timestamp; return; }
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    accumulator += dt;
    while (accumulator >= FIXED_DT) {
      update();
      accumulator -= FIXED_DT;
    }
    draw();
  }

  // ===== Start / Stop =====
  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    accumulator = 0;
    initFog();
    animFrame = requestAnimationFrame(loop);
  }

  function stop() {
    if (!running) return;
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = 0;
  }

  // Window lifecycle
  document.addEventListener('tinydesktop-update', function () {
    if (isWindowVisible()) start();
  });

  var pinballWin = document.getElementById('window-pinball');
  if (pinballWin) {
    var observer = new MutationObserver(function () {
      if (pinballWin.classList.contains('closed')) {
        stop();
        state = 'title';
        score = 0;
        balls = 3;
        particles = [];
        scorePopups = [];
      } else if (!pinballWin.classList.contains('minimized')) {
        start();
      }
    });
    observer.observe(pinballWin, { attributes: true, attributeFilter: ['class'] });
  }

  // Initial state
  state = 'title';
  initFog();
  PENDULUM.angle = PENDULUM.maxAngle;
  PENDULUM.angVel = 0;
  draw();
})();
