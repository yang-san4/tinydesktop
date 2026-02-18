// ===== GEKKO — Cyberpunk Frog Robot FPS =====

(function () {
  // ===== 1. Boilerplate =====
  var canvas = document.getElementById('fps-canvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;   // 120
  var H = canvas.height;  // 90

  ctx.imageSmoothingEnabled = false;

  // ===== 2. Constants & Config =====
  var FOV = Math.PI / 3;
  var HALF_FOV = FOV / 2;
  var MAX_DEPTH = 24;
  var MAP_SIZE = 21;

  var MOVE_SPEED = 2.5;
  var STRAFE_SPEED = 2.0;
  var ROT_SPEED = 2.5;
  var PITCH_SPEED = 50;
  var MAX_PITCH = 25;
  var GRAVITY = 12;
  var JUMP_VEL = 5.0;
  var DOUBLE_JUMP_MUL = 0.85;
  var STEP_TOL = 0.2;
  var COLLISION_MARGIN = 0.22;

  var DASH_SPEED = 8.0;
  var DASH_DECAY = 0.88;
  var DASH_CD = 1.5;
  var DASH_MIN = 0.3;

  var PLAYER_MAX_HP = 100;
  var PLAYER_DAMAGE = 25;
  var PLAYER_BULLET_SPEED = 14;
  var BULLET_LIFETIME = 2.5;
  var SHOOT_CD = 0.3;

  var ENEMY_SIGHT = 10;
  var ENEMY_BULLET_SPEED = 6;

  var FOG_R = 10, FOG_G = 8, FOG_B = 32;

  // ===== 3. Color & Math Utilities =====
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function fogBlend(r, g, b, dist) {
    var t = clamp01(dist / MAX_DEPTH);
    t = Math.pow(t, 0.8);
    var inv = 1 - t;
    return [
      (r * inv + FOG_R * t) | 0,
      (g * inv + FOG_G * t) | 0,
      (b * inv + FOG_B * t) | 0
    ];
  }

  var NEON_COLORS = [
    null,
    [0, 220, 255],   // 1: cyan
    [255, 0, 200],   // 2: magenta
    [255, 230, 40],  // 3: yellow
    [0, 255, 100]    // 4: green
  ];

  function hash(n) {
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    n = (n >> 16) ^ n;
    return (n & 0x7fffffff) / 0x7fffffff;
  }

  function hexRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  // ===== 4. Map Generation =====
  var map = [];
  var mapFloor = [];
  var mapColor = [];
  var mapHeight = [];
  var mapNeon = [];
  var mapWindows = [];

  // Building material palette (direct RGB)
  var BLDG_RGB = [
    { ns: [110, 110, 120], ew: [85, 85, 95] },    // 0: outer concrete gray
    { ns: [50, 55, 65], ew: [38, 42, 52] },        // 1: dark metal
    { ns: [70, 80, 100], ew: [55, 65, 82] },       // 2: blue-gray steel
    { ns: [90, 45, 40], ew: [72, 35, 30] },        // 3: dark red brick
    { ns: [40, 100, 95], ew: [30, 80, 75] },       // 4: teal
    { ns: [45, 48, 55], ew: [35, 38, 45] },        // 5: carbon
    { ns: [120, 125, 130], ew: [95, 100, 105] },   // 6: chrome
    { ns: [30, 28, 40], ew: [22, 20, 32] }         // 7: dark (boss pillars)
  ];

  var STEP_NS_RGB = [60, 55, 75];
  var STEP_EW_RGB = [48, 44, 62];

  function generateArena() {
    var S = MAP_SIZE; // 21
    var C = (S / 2) | 0; // center = 10
    var E = S - 1; // 20

    map = []; mapFloor = []; mapColor = []; mapHeight = [];
    mapNeon = []; mapWindows = [];
    for (var y = 0; y < S; y++) {
      map[y] = []; mapFloor[y] = []; mapColor[y] = []; mapHeight[y] = [];
      mapNeon[y] = []; mapWindows[y] = [];
      for (var x = 0; x < S; x++) {
        map[y][x] = 0; mapFloor[y][x] = 0;
        mapColor[y][x] = 0; mapHeight[y][x] = 1.0;
        mapNeon[y][x] = 0; mapWindows[y][x] = 0;
      }
    }

    // Outer walls (tall)
    for (var i = 0; i < S; i++) {
      map[0][i] = map[E][i] = map[i][0] = map[i][E] = 1;
      mapColor[0][i] = mapColor[E][i] = mapColor[i][0] = mapColor[i][E] = 0;
      mapHeight[0][i] = mapHeight[E][i] = mapHeight[i][0] = mapHeight[i][E] = 3.0;
    }

    // Floor heights - concentric rings from center (10,10)
    for (var y = 1; y < E; y++) {
      for (var x = 1; x < E; x++) {
        var d = Math.max(Math.abs(x - C), Math.abs(y - C));
        if (d === 0) mapFloor[y][x] = 1.2;
        else if (d <= 3) mapFloor[y][x] = 0.8;
        else if (d <= 6) mapFloor[y][x] = 0.4;
        else mapFloor[y][x] = 0;
      }
    }

    // --- Safe spawn alcove (bottom-left corner) ---
    // L-shaped walls at (3, E-4) to (3, E-1) and (1, E-4) to (3, E-4)
    // This creates a pocket the player spawns in, open only toward x+
    var spawnWalls = [
      [E-4, 1], [E-4, 2], [E-4, 3],  // horizontal wall
      [E-3, 3], [E-2, 3]              // vertical wall
    ];
    for (var i = 0; i < spawnWalls.length; i++) {
      var p = spawnWalls[i];
      map[p[0]][p[1]] = 1;
      mapColor[p[0]][p[1]] = 4;
      mapHeight[p[0]][p[1]] = 1.5;
    }

    // Cover walls - outer ring (floor=0 area, d>=7)
    var outerWalls = [
      [2,2],[2,E-2],[E-2,2],[E-2,E-2],
      [1,C],[E-1,C],[C,1],[C,E-1],
      [2,7],[2,E-7],[E-2,7],[E-2,E-7],
      [7,2],[E-7,2],[7,E-2],[E-7,E-2]
    ];
    for (var i = 0; i < outerWalls.length; i++) {
      var p = outerWalls[i];
      if (map[p[0]][p[1]]) continue; // skip if already set
      map[p[0]][p[1]] = 1;
      mapColor[p[0]][p[1]] = 1 + ((hash(i * 37 + 11) * 5) | 0);
    }

    // Cover walls - middle ring (floor=0.4 area, d=4-6)
    var midWalls = [
      [5,5],[5,E-5],[E-5,5],[E-5,E-5],
      [4,C],[E-4,C],[C,4],[C,E-4],
      [5,8],[5,E-8],[E-5,8],[E-5,E-8],
      [8,5],[E-8,5],[8,E-5],[E-8,E-5]
    ];
    for (var i = 0; i < midWalls.length; i++) {
      var p = midWalls[i];
      if (map[p[0]][p[1]]) continue;
      map[p[0]][p[1]] = 1;
      mapColor[p[0]][p[1]] = 1 + ((hash(i * 53 + 17) * 5) | 0);
      mapHeight[p[0]][p[1]] = 1.2;
    }

    // Cover walls - inner ring (floor=0.8 area, d=1-3)
    var innerWalls = [
      [C-3,C-3],[C-3,C+3],[C+3,C-3],[C+3,C+3],
      [C-2,C-1],[C-2,C+1],[C+2,C-1],[C+2,C+1]
    ];
    for (var i = 0; i < innerWalls.length; i++) {
      var p = innerWalls[i];
      if (map[p[0]][p[1]]) continue;
      map[p[0]][p[1]] = 1;
      mapColor[p[0]][p[1]] = 2 + ((hash(i * 71 + 23) * 4) | 0);
      mapHeight[p[0]][p[1]] = 1.0;
    }

    // Boss pillars around center
    var bossPillars = [[C-1,C-1],[C-1,C+1],[C+1,C-1],[C+1,C+1]];
    for (var i = 0; i < bossPillars.length; i++) {
      var p = bossPillars[i];
      map[p[0]][p[1]] = 1;
      mapColor[p[0]][p[1]] = 7;
      mapHeight[p[0]][p[1]] = 1.8;
    }

    // Assign neon colors to ~60% of wall cells
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        if (map[y][x] === 1 && mapColor[y][x] !== 7) {
          if (hash(x * 31 + y * 59 + 7) < 0.6) {
            mapNeon[y][x] = 1 + ((hash(x * 13 + y * 47 + 3) * 4) | 0);
          }
        }
      }
    }

    // Assign window bitmasks
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        if (map[y][x] === 1) {
          var h = hash(x * 7 + y * 13 + 37);
          mapWindows[y][x] = ((h * 15) | 0) & 0xf;
        }
      }
    }
  }

  // ===== 5. Player State & Input =====
  var player = {
    x: 1.5, y: 18.5, z: 0, vz: 0,
    angle: -Math.PI / 4, pitch: 0,
    hp: PLAYER_MAX_HP, grounded: true,
    shootCD: 0, hitFlash: 0, muzzleFlash: 0, kills: 0,
    canDoubleJump: true, hasDoubleJumped: false,
    dashVel: 0, dashAngle: 0, dashCD: 0,
    bobPhase: 0, recoil: 0, shakeTimer: 0, shakeAmp: 0
  };

  var keys = {};
  var mouseDX = 0, mouseDY = 0;
  var mouseDown = false;
  var pointerLocked = false;

  var isMobileFps = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) &&
                    (window.innerWidth <= 600 || matchMedia('(hover: none) and (pointer: coarse)').matches);

  var MOUSE_SENS_X = 0.003;
  var MOUSE_SENS_Y = 0.15;

  document.addEventListener('keydown', function (e) {
    if (!isFpsActive()) return;
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].indexOf(e.code) !== -1) {
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', function (e) {
    keys[e.code] = false;
  });

  // Pointer lock for mouse look
  canvas.addEventListener('click', function () {
    if (!isFpsActive()) return;
    if (!pointerLocked) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', function () {
    if (isMobileFps) return; // mobile bypasses pointer lock
    pointerLocked = document.pointerLockElement === canvas;
    if (!pointerLocked) {
      mouseDown = false;
    }
  });

  document.addEventListener('mousemove', function (e) {
    if (!pointerLocked) return;
    mouseDX += e.movementX;
    mouseDY += e.movementY;
  });

  document.addEventListener('mousedown', function (e) {
    if (!pointerLocked) return;
    if (e.button === 0) mouseDown = true;
  });
  document.addEventListener('mouseup', function (e) {
    if (e.button === 0) mouseDown = false;
  });

  // Release pointer lock when window loses focus
  var fpsWin = document.getElementById('window-fps');
  if (fpsWin) {
    var observer = new MutationObserver(function () {
      if (fpsWin.classList.contains('closed') || fpsWin.classList.contains('minimized')) {
        if (pointerLocked) document.exitPointerLock();
      }
    });
    observer.observe(fpsWin, { attributes: true, attributeFilter: ['class'] });
  }

  function isFpsActive() {
    var win = document.getElementById('window-fps');
    if (!win || win.classList.contains('closed') || win.classList.contains('minimized')) return false;
    var allItems = document.querySelectorAll('.window:not(.closed):not(.minimized), .widget:not(.closed):not(.minimized)');
    var maxZ = 0;
    var fpsZ = parseInt(win.style.zIndex) || 0;
    allItems.forEach(function (el) {
      var z = parseInt(el.style.zIndex) || 0;
      if (z > maxZ) maxZ = z;
    });
    return fpsZ >= maxZ;
  }

  function getHudPalette() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return {
      hud:'#c8a84e', crosshair:'#c8a84e', hitFlash:'#c8372d',
      miniWall:'#5a4838', miniPath:'#2a2018', miniPlayer:'#c8a84e', miniEnemy:'#c8372d'
    };
    if (scr.classList.contains('theme-wood')) return {
      hud:'#e0d0a0', crosshair:'#e0d0a0', hitFlash:'#cc3333',
      miniWall:'#4a3828', miniPath:'#201810', miniPlayer:'#e0d0a0', miniEnemy:'#c8a050'
    };
    if (scr.classList.contains('theme-mac')) return {
      hud:'#ffffff', crosshair:'#ffffff', hitFlash:'#ff0000',
      miniWall:'#888888', miniPath:'#444444', miniPlayer:'#ffffff', miniEnemy:'#333333'
    };
    if (scr.classList.contains('theme-osx')) return {
      hud:'#5ab4f0', crosshair:'#5ab4f0', hitFlash:'#f5736e',
      miniWall:'#5a88b0', miniPath:'#1a3050', miniPlayer:'#5ab4f0', miniEnemy:'#f5736e'
    };
    return {
      hud:'#00ffa0', crosshair:'#00ffa0', hitFlash:'#ff2040',
      miniWall:'#1a2a3a', miniPath:'#0a0820', miniPlayer:'#00ffa0', miniEnemy:'#ff3c3c'
    };
  }

  // ===== 6. Enemy Definitions & Spawn =====
  var ENEMY_CFG = {
    WOLF:   { hp: 30, speed: 2.2, chaseSpeed: 3.0, color: [255, 60, 60],   accent: '#ff3c3c', melee: true,  shootCD: 0,   dmg: 15, sprH: 0.65, sprW: 0.4  },
    HAWK:   { hp: 35, speed: 1.4, chaseSpeed: 1.8, color: [0, 220, 255],   accent: '#00dcff', melee: false, shootCD: 1.2, dmg: 7,  sprH: 0.7,  sprW: 0.45 },
    BEAR:   { hp: 80, speed: 0.5, chaseSpeed: 0.6, color: [255, 160, 40],  accent: '#ffa028', melee: false, shootCD: 0.8, dmg: 14, sprH: 0.9,  sprW: 0.55 },
    SNAKE:  { hp: 25, speed: 2.0, chaseSpeed: 2.5, color: [180, 60, 255],  accent: '#b43cff', melee: false, shootCD: 0.5, dmg: 5,  sprH: 0.45, sprW: 0.5  },
    DRAGON: { hp: 200,speed: 0.6, chaseSpeed: 0.7, color: [255, 200, 40],  accent: '#ffc828', melee: false, shootCD: 0.6, dmg: 12, sprH: 1.1,  sprW: 0.6  }
  };

  var enemies = [];
  var totalKillsNeeded = 5;

  function spawnEnemies() {
    enemies = [];
    var spawns = [
      { x:17.5, y:17.5, floor:0,   type:'WOLF'  },
      { x:17.5, y:3.5,  floor:0,   type:'HAWK'  },
      { x:6.5,  y:13.5, floor:0.4, type:'BEAR'  },
      { x:13.5, y:6.5,  floor:0.4, type:'SNAKE' }
    ];
    for (var i = 0; i < spawns.length; i++) {
      var s = spawns[i];
      var cfg = ENEMY_CFG[s.type];
      enemies.push({
        x: s.x, y: s.y, z: s.floor,
        angle: Math.random() * Math.PI * 2,
        hp: cfg.hp, maxHp: cfg.hp, state: 'PATROL',
        shootCD: 0, patrolTimer: 0,
        patrolDirX: 0, patrolDirY: 0,
        hitTimer: 0, type: s.type,
        homeFloor: s.floor, cfg: cfg
      });
    }
    // Dragon boss at center
    var drCfg = ENEMY_CFG.DRAGON;
    enemies.push({
      x: 10.5, y: 10.5, z: 1.2,
      angle: 0, hp: drCfg.hp, maxHp: drCfg.hp, state: 'PATROL',
      shootCD: 0, patrolTimer: 0,
      patrolDirX: 0, patrolDirY: 0,
      hitTimer: 0, type: 'DRAGON',
      homeFloor: 1.2, cfg: drCfg
    });
  }

  // ===== 7. Game State, Bullets, Particles =====
  var gameState = 'playing';
  var stateTimer = 0;
  var bullets = [];
  var particles = [];

  // ===== 8. Collision & Physics Helpers =====
  function isWall(x, y) {
    var mx = x | 0, my = y | 0;
    if (mx < 0 || mx >= MAP_SIZE || my < 0 || my >= MAP_SIZE) return true;
    return map[my][mx] === 1;
  }

  function getFloor(x, y) {
    var mx = x | 0, my = y | 0;
    if (mx < 0 || mx >= MAP_SIZE || my < 0 || my >= MAP_SIZE) return 0;
    return mapFloor[my][mx];
  }

  function canWalkTo(x, y, currentZ) {
    var mx = x | 0, my = y | 0;
    if (mx < 0 || mx >= MAP_SIZE || my < 0 || my >= MAP_SIZE) return false;
    if (map[my][mx] === 1) return false;
    var fl = mapFloor[my][mx];
    if (fl > currentZ + STEP_TOL) return false;
    return true;
  }

  function castRayFrom(ox, oy, angle) {
    var sinA = Math.sin(angle); var cosA = Math.cos(angle);
    var mapX = ox | 0; var mapY = oy | 0;
    var deltaDistX = Math.abs(cosA) < 1e-10 ? 1e10 : Math.abs(1 / cosA);
    var deltaDistY = Math.abs(sinA) < 1e-10 ? 1e10 : Math.abs(1 / sinA);
    var stepX, stepY, sideDistX, sideDistY;
    if (cosA < 0) { stepX = -1; sideDistX = (ox - mapX) * deltaDistX; }
    else { stepX = 1; sideDistX = (mapX + 1 - ox) * deltaDistX; }
    if (sinA < 0) { stepY = -1; sideDistY = (oy - mapY) * deltaDistY; }
    else { stepY = 1; sideDistY = (mapY + 1 - oy) * deltaDistY; }
    var side = 0;
    for (var i = 0; i < 64; i++) {
      if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
      else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
      if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) break;
      if (map[mapY][mapX] === 1) return side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
    }
    return MAX_DEPTH;
  }

  function hasLineOfSight(ax, ay, bx, by) {
    var dx = bx - ax; var dy = by - ay;
    var dist = Math.sqrt(dx * dx + dy * dy);
    return castRayFrom(ax, ay, Math.atan2(dy, dx)) >= dist - 0.3;
  }

  // ===== 9. DDA Raycast =====
  function castRay(angle) {
    var sinA = Math.sin(angle);
    var cosA = Math.cos(angle);
    var mapX = player.x | 0, mapY = player.y | 0;
    var deltaDistX = Math.abs(cosA) < 1e-10 ? 1e10 : Math.abs(1 / cosA);
    var deltaDistY = Math.abs(sinA) < 1e-10 ? 1e10 : Math.abs(1 / sinA);
    var stepX, stepY, sideDistX, sideDistY;

    if (cosA < 0) { stepX = -1; sideDistX = (player.x - mapX) * deltaDistX; }
    else { stepX = 1; sideDistX = (mapX + 1 - player.x) * deltaDistX; }
    if (sinA < 0) { stepY = -1; sideDistY = (player.y - mapY) * deltaDistY; }
    else { stepY = 1; sideDistY = (mapY + 1 - player.y) * deltaDistY; }

    var side = 0;
    var prevFloor = getFloor(player.x, player.y);
    var segments = [];

    for (var i = 0; i < 64; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX; mapX += stepX; side = 0;
      } else {
        sideDistY += deltaDistY; mapY += stepY; side = 1;
      }
      if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) break;

      var perpDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
      var cellFloor = mapFloor[mapY] ? (mapFloor[mapY][mapX] || 0) : 0;

      if (cellFloor !== prevFloor && map[mapY][mapX] !== 1) {
        segments.push({
          type: 'step', dist: perpDist, side: side,
          fromH: prevFloor, toH: cellFloor
        });
        prevFloor = cellFloor;
      }

      if (map[mapY][mapX] === 1) {
        var wallX = side === 0 ? player.y + perpDist * sinA : player.x + perpDist * cosA;
        wallX = wallX - Math.floor(wallX);
        var hf = (mapHeight[mapY] && mapHeight[mapY][mapX]) || 1.0;
        segments.push({
          type: 'wall', dist: perpDist, side: side,
          floorH: cellFloor, wallH: hf,
          wallX: wallX, colorIdx: mapColor[mapY][mapX],
          mapX: mapX, mapY: mapY,
          neon: mapNeon[mapY][mapX],
          windows: mapWindows[mapY][mapX]
        });
        break;
      }
    }
    return segments;
  }

  // ===== Rendering Infrastructure =====
  var depthBuf = new Float32Array(W * H);
  var imgData = ctx.createImageData(W, H);
  var pix = imgData.data;

  function getDepth(col, row) {
    if (col >= 0 && col < W && row >= 0 && row < H) return depthBuf[col * H + row];
    return 0;
  }

  function setPx(x, y, r, g, b) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    var i = (y * W + x) << 2;
    pix[i] = r; pix[i + 1] = g; pix[i + 2] = b; pix[i + 3] = 255;
  }

  // Per-column ray data
  var colCos = new Float32Array(W);
  var colSin = new Float32Array(W);
  var colCosCorr = new Float32Array(W);

  // Static star positions
  var stars = [];
  for (var si = 0; si < 15; si++) {
    stars.push({
      x: (hash(si * 97 + 13) * W) | 0,
      y: (hash(si * 61 + 29) * (H * 0.35)) | 0,
      bright: 0.4 + hash(si * 41 + 7) * 0.6
    });
  }

  // City silhouette building heights (precomputed)
  var cityBuildings = [];
  for (var ci = 0; ci < W; ci++) {
    var bh = 3 + (hash(ci * 17 + 5) * 12) | 0;
    if (hash(ci * 23 + 11) < 0.3) bh += 5;
    cityBuildings.push(bh);
  }

  // ===== 10. Render: Sky =====
  function renderSky(horizon) {
    var skyBase = Math.max(0, horizon);
    for (var y = 0; y < Math.min(skyBase, H); y++) {
      var t = y / Math.max(skyBase, 1);
      // Dark gradient: deep navy -> dark purple
      var sr = (2 + 8 * t) | 0;
      var sg = (3 + 5 * t) | 0;
      var sb = (18 + 14 * t) | 0;
      for (var x = 0; x < W; x++) {
        setPx(x, y, sr, sg, sb);
      }
    }

    // Stars (twinkling)
    var twinkle = Date.now() * 0.003;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (s.y < skyBase) {
        var b = s.bright * (0.5 + 0.5 * Math.sin(twinkle + i * 2.3));
        var v = (180 * b) | 0;
        setPx(s.x, s.y, v, v, (v * 1.2) | 0);
      }
    }

    // City silhouette at horizon line
    var silY = skyBase - 1;
    for (var x = 0; x < W; x++) {
      var bh = cityBuildings[x];
      for (var dy = 0; dy < bh && silY - dy >= 0; dy++) {
        var row = silY - dy;
        setPx(x, row, 6, 5, 15);
        // Scattered window lights
        if (hash(x * 7 + dy * 13 + 101) < 0.08) {
          var wc = hash(x * 11 + dy * 17 + 53) < 0.5 ? [180, 140, 60] : [60, 180, 220];
          setPx(x, row, wc[0], wc[1], wc[2]);
        }
      }
    }
  }

  // ===== 11. Render: Floor Cast =====
  function floorCast(col, y1, y2, floorH, eyeZ, horizon, maxDist) {
    if (y1 >= y2) return;
    var cosA = colCos[col], sinA = colSin[col], cosCorr = colCosCorr[col];
    var hDiff = eyeZ - floorH;
    if (hDiff < 0.001) hDiff = 0.001;

    for (var y = y1; y < y2; y++) {
      var denom = y - horizon;
      if (denom < 1) { depthBuf[col * H + y] = 9999; continue; }

      var perpDist = hDiff * H / denom;
      if (perpDist > maxDist) perpDist = maxDist;
      if (perpDist < 0.1) perpDist = 0.1;

      var rayDist = perpDist / cosCorr;
      var worldX = player.x + cosA * rayDist;
      var worldY = player.y + sinA * rayDist;

      var fracX = worldX - Math.floor(worldX);
      var fracY = worldY - Math.floor(worldY);

      var isGrid = fracX < 0.05 || fracX > 0.95 || fracY < 0.05 || fracY > 0.95;
      var tile = ((Math.floor(worldX) + Math.floor(worldY)) & 1);

      var sh = Math.max(0.12, 1 - perpDist / 14);
      var gridMul = isGrid ? 0.4 : 1.0;
      var tileMul = tile ? 1.05 : 0.95;
      var f = sh * gridMul * tileMul;

      var cr, cg, cb;
      if (floorH < 0.2) {
        // Ground: dark asphalt + grid
        cr = (35 * f + 5) | 0; cg = (32 * f + 5) | 0; cb = (40 * f + 8) | 0;
        // Wet reflection near walls
        if (isGrid && perpDist < 3) {
          var mx = worldX | 0, my = worldY | 0;
          if (mx > 0 && mx < MAP_SIZE - 1 && my > 0 && my < MAP_SIZE - 1) {
            // Check adjacent for wall with neon
            for (var dx = -1; dx <= 1; dx++) {
              for (var dy = -1; dy <= 1; dy++) {
                if (map[my + dy] && map[my + dy][mx + dx] === 1) {
                  var nn = mapNeon[my + dy][mx + dx];
                  if (nn > 0 && NEON_COLORS[nn]) {
                    var nc = NEON_COLORS[nn];
                    var refStr = 0.15 * (1 - perpDist / 3);
                    cr = (cr + nc[0] * refStr) | 0;
                    cg = (cg + nc[1] * refStr) | 0;
                    cb = (cb + nc[2] * refStr) | 0;
                  }
                }
              }
            }
          }
        }
      } else if (floorH < 0.6) {
        // Mid: metal grating
        var grate = ((fracX * 8) | 0) % 2 === ((fracY * 8) | 0) % 2;
        var gm = grate ? 1.1 : 0.7;
        cr = (55 * f * gm) | 0; cg = (58 * f * gm) | 0; cb = (65 * f * gm) | 0;
      } else if (floorH < 1.0) {
        // Upper: polished concrete
        cr = (65 * f + 10) | 0; cg = (63 * f + 10) | 0; cb = (70 * f + 12) | 0;
      } else {
        // Top: cyan glow platform
        var pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.004 + worldX + worldY);
        cr = (20 * f * pulse) | 0;
        cg = (80 * f * pulse) | 0;
        cb = (90 * f * pulse) | 0;
        if (isGrid) { cr += 15; cg += 50; cb += 55; }
      }

      var fogged = fogBlend(cr, cg, cb, perpDist);
      setPx(col, y, Math.min(fogged[0], 255), Math.min(fogged[1], 255), Math.min(fogged[2], 255));
      depthBuf[col * H + y] = perpDist;
    }
  }

  // ===== 12. Render: Wall Column =====
  function drawWallCol(col, y1, y2, seg, shade, d) {
    var ci = seg.colorIdx || 0;
    var brgb = BLDG_RGB[ci] || BLDG_RGB[0];
    var rgb = seg.side === 1 ? brgb.ns : brgb.ew;
    var pixH = y2 - y1;
    var wx = seg.wallX;
    var neonIdx = seg.neon || 0;
    var winMask = seg.windows || 0;

    // Window slots: 4 windows per wall face
    var winSlots = [
      { xMin: 0.1, xMax: 0.3, yMin: 0.2, yMax: 0.45 },
      { xMin: 0.6, xMax: 0.8, yMin: 0.2, yMax: 0.45 },
      { xMin: 0.1, xMax: 0.3, yMin: 0.55, yMax: 0.75 },
      { xMin: 0.6, xMax: 0.8, yMin: 0.55, yMax: 0.75 }
    ];

    for (var y = y1; y < y2; y++) {
      var frac = (y - y1) / pixH;
      var cr = (rgb[0] * shade) | 0;
      var cg = (rgb[1] * shade) | 0;
      var cb = (rgb[2] * shade) | 0;

      // Check windows
      var inWindow = false;
      for (var wi = 0; wi < 4; wi++) {
        var ws = winSlots[wi];
        if (wx > ws.xMin && wx < ws.xMax && frac > ws.yMin && frac < ws.yMax && pixH > 6) {
          inWindow = true;
          if (winMask & (1 << wi)) {
            // Lit window: warm glow
            cr = (180 * shade * 0.9) | 0;
            cg = (140 * shade * 0.9) | 0;
            cb = (60 * shade * 0.7) | 0;
          } else {
            // Dark window
            cr = (15 * shade) | 0;
            cg = (20 * shade) | 0;
            cb = (40 * shade) | 0;
          }
          break;
        }
      }

      // Neon band at top (1-2px) - ignores fog!
      if (neonIdx > 0 && NEON_COLORS[neonIdx]) {
        var nc = NEON_COLORS[neonIdx];
        if (y - y1 < 2 && pixH > 3) {
          // Neon strip at top
          setPx(col, y, nc[0], nc[1], nc[2]);
          depthBuf[col * H + y] = d;
          continue;
        }
        // Neon band at 40% height
        var bandY = (y1 + pixH * 0.4) | 0;
        if (y === bandY && pixH > 5) {
          setPx(col, y, nc[0], nc[1], nc[2]);
          depthBuf[col * H + y] = d;
          continue;
        }
        // Neon bleed (adjacent to bands): 30% color mix
        if ((y - y1 === 2 || (y === bandY + 1 && pixH > 5)) && pixH > 4) {
          cr = (cr * 0.7 + nc[0] * 0.3) | 0;
          cg = (cg * 0.7 + nc[1] * 0.3) | 0;
          cb = (cb * 0.7 + nc[2] * 0.3) | 0;
        }
      }

      // Panel lines (horizontal mortar every ~25%)
      if (!inWindow && ci > 0 && pixH > 8) {
        var rowFrac = (frac * 4) % 1;
        if (rowFrac < 0.06) {
          cr = (cr * 0.5) | 0;
          cg = (cg * 0.5) | 0;
          cb = (cb * 0.5) | 0;
        }
      }

      // Base trim (bottom 12%)
      if (frac > 0.88 && ci > 0) {
        cr = (cr * 0.4) | 0;
        cg = (cg * 0.4) | 0;
        cb = (cb * 0.4) | 0;
      }

      // Roof edge (top 2px, only if no neon)
      if (neonIdx === 0 && y - y1 < 2 && pixH > 3) {
        cr = (cr * 0.3 + 8) | 0;
        cg = (cg * 0.3 + 8) | 0;
        cb = (cb * 0.3 + 12) | 0;
      }

      // Apply fog (but not to neon elements already drawn)
      var fogged = fogBlend(cr, cg, cb, d);
      setPx(col, y, Math.min(fogged[0], 255), Math.min(fogged[1], 255), Math.min(fogged[2], 255));
    }
    depthBuf.fill(d, col * H + y1, col * H + y2);
  }

  // ===== 13. Render: Roof Cast =====
  function roofCast(col, y1, y2, roofH, eyeZ, horizon, colorIdx, minDist, maxDist) {
    var ci = colorIdx || 0;
    var brgb = BLDG_RGB[ci] || BLDG_RGB[0];
    var baseR = (brgb.ns[0] * 0.35 + 10) | 0;
    var baseG = (brgb.ns[1] * 0.35 + 10) | 0;
    var baseB = Math.min(255, (brgb.ns[2] * 0.35 + 20) | 0);
    var cosA = colCos[col], sinA = colSin[col], cosCorr = colCosCorr[col];

    for (var y = y1; y < y2; y++) {
      var denom = y - horizon;
      if (denom < 1) continue;

      var perpDist = (eyeZ - roofH) * H / denom;
      if (perpDist < minDist - 0.1 || perpDist > maxDist) continue;

      var rayDist = perpDist / cosCorr;
      var worldX = player.x + cosA * rayDist;
      var worldY = player.y + sinA * rayDist;
      var cx = worldX | 0, cy = worldY | 0;
      if (cx < 0 || cx >= MAP_SIZE || cy < 0 || cy >= MAP_SIZE) continue;
      if (map[cy][cx] !== 1) continue;

      var fracX = worldX - cx;
      var fracY = worldY - cy;
      var isEdge = fracX < 0.08 || fracX > 0.92 || fracY < 0.08 || fracY > 0.92;

      var sh = Math.max(0.2, 1 - perpDist / 14);
      var edgeMul = isEdge ? 0.5 : 1.0;
      // Edge rail highlight
      var cr = (baseR * sh * edgeMul) | 0;
      var cg = (baseG * sh * edgeMul) | 0;
      var cb = (baseB * sh * edgeMul) | 0;
      if (isEdge) { cr += 8; cg += 8; cb += 12; }

      var fogged = fogBlend(cr, cg, cb, perpDist);
      setPx(col, y, fogged[0], fogged[1], fogged[2]);
      depthBuf[col * H + y] = perpDist;
    }
  }

  // ===== 14. Render: Step Face =====
  function drawStepCol(col, y1, y2, side, shade, d, isDark) {
    var rgb = side === 0 ? STEP_NS_RGB : STEP_EW_RGB;
    var mul = isDark ? 0.65 : 1.0;
    var r = (rgb[0] * shade * mul) | 0;
    var g = (rgb[1] * shade * mul) | 0;
    var b = (rgb[2] * shade * mul) | 0;
    for (var y = y1; y < y2; y++) {
      if (y === y1) {
        // Accent line at top
        var fogged = fogBlend((r * 1.5 + 20) | 0, (g * 1.3 + 30) | 0, (b * 1.5 + 40) | 0, d);
        setPx(col, y, Math.min(fogged[0], 255), Math.min(fogged[1], 255), Math.min(fogged[2], 255));
      } else {
        var fogged = fogBlend(r, g, b, d);
        setPx(col, y, fogged[0], fogged[1], fogged[2]);
      }
    }
    depthBuf.fill(d, col * H + y1, col * H + y2);
  }

  // ===== 15. Render: Scene Orchestrator =====
  function renderScene() {
    var bobOffset = player.grounded ? Math.sin(player.bobPhase) * 1.2 : 0;
    var shakeOffset = 0;
    if (player.shakeTimer > 0) {
      shakeOffset = (Math.random() - 0.5) * player.shakeAmp * 2;
    }
    var eyeZ = player.z + 0.5;
    var horizon = ((H / 2 + player.pitch + bobOffset + shakeOffset) | 0);

    depthBuf.fill(9999);

    // Precompute per-column ray directions
    for (var c = 0; c < W; c++) {
      var ra = player.angle - HALF_FOV + (c / W) * FOV;
      colCos[c] = Math.cos(ra);
      colSin[c] = Math.sin(ra);
      var cc = Math.cos(ra - player.angle);
      colCosCorr[c] = cc < 0.01 ? 0.01 : cc;
    }

    // Sky
    renderSky(horizon);

    // Fill below horizon with fog color initially
    for (var y = Math.max(0, horizon); y < H; y++) {
      for (var x = 0; x < W; x++) {
        setPx(x, y, FOG_R, FOG_G, FOG_B);
      }
    }

    // Raycast each column
    for (var col = 0; col < W; col++) {
      var rayAngle = player.angle - HALF_FOV + (col / W) * FOV;
      var segments = castRay(rayAngle);

      var yBot = H;
      var yTop = 0;

      for (var s = 0; s < segments.length; s++) {
        var seg = segments[s];
        var d = Math.max(seg.dist, 0.05);
        var shade = Math.max(0.12, 1 - d / MAX_DEPTH);

        if (seg.type === 'step') {
          var lowH = Math.min(seg.fromH, seg.toH);
          var highH = Math.max(seg.fromH, seg.toH);
          var faceTopY = (horizon + (eyeZ - highH) * H / d) | 0;
          var faceBotY = (horizon + (eyeZ - lowH) * H / d) | 0;

          if (seg.toH > seg.fromH) {
            var floorStart = Math.max(faceBotY, yTop);
            if (floorStart < yBot) {
              floorCast(col, floorStart, yBot, lowH, eyeZ, horizon, d);
              yBot = floorStart;
            }
            var dTop = Math.max(faceTopY, yTop);
            var dBot = Math.min(faceBotY, yBot);
            if (dTop < dBot) {
              drawStepCol(col, dTop, dBot, seg.side, shade, d, false);
              yBot = dTop;
            }
          } else {
            var floorStart = Math.max(faceBotY, yTop);
            if (floorStart < yBot) {
              floorCast(col, floorStart, yBot, highH, eyeZ, horizon, d);
              yBot = floorStart;
            }
            var dTop = Math.max(faceTopY, yTop);
            var dBot = Math.min(faceBotY, yBot);
            if (dTop < dBot) {
              drawStepCol(col, dTop, dBot, seg.side, shade, d, true);
              yBot = dTop;
            }
          }
        }
        else if (seg.type === 'wall') {
          var wallTopH = seg.floorH + seg.wallH;
          var wallBotH = seg.floorH;
          var wallTopY = (horizon + (eyeZ - wallTopH) * H / d) | 0;
          var wallBotY = (horizon + (eyeZ - wallBotH) * H / d) | 0;

          var floorStart = Math.max(wallBotY, yTop);
          if (floorStart < yBot) {
            floorCast(col, floorStart, yBot, wallBotH, eyeZ, horizon, d);
            yBot = floorStart;
          }

          var wTop = Math.max(wallTopY, yTop);
          var wBot = Math.min(wallBotY, yBot);
          if (wTop < wBot) {
            drawWallCol(col, wTop, wBot, seg, shade, d);
          }

          if (eyeZ > wallTopH + 0.05) {
            var roofNear = Math.min(wallTopY, yBot);
            var roofFarDist = d + 2.0;
            var roofFarY = (horizon + (eyeZ - wallTopH) * H / roofFarDist) | 0;
            roofFarY = Math.max(roofFarY, yTop);
            if (roofFarY < roofNear) {
              roofCast(col, roofFarY, roofNear, wallTopH, eyeZ, horizon, seg.colorIdx, d, roofFarDist);
              depthBuf.fill(9999, col * H + yTop, col * H + roofFarY);
            } else {
              depthBuf.fill(9999, col * H + yTop, col * H + Math.min(wallTopY, yBot));
            }
          } else {
            var skyBot = Math.min(wallTopY, yBot);
            if (yTop < skyBot) depthBuf.fill(9999, col * H + yTop, col * H + skyBot);
          }

          yBot = yTop;
        }

        if (yTop >= yBot) break;
      }

      // Remaining undrawn area
      if (yTop < yBot) {
        var lastFloor = getFloor(player.x, player.y);
        var floorTop = Math.max(horizon + 1, yTop);
        if (floorTop < yBot) floorCast(col, floorTop, yBot, lastFloor, eyeZ, horizon, MAX_DEPTH);
        var skyEnd = Math.min(horizon + 1, yBot);
        if (yTop < skyEnd) depthBuf.fill(9999, col * H + yTop, col * H + skyEnd);
      }
    }
  }

  // ===== 16. Render: Enemy Sprites =====
  function renderEnemies() {
    var visible = [];
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;
      var dx = e.x - player.x; var dy = e.y - player.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.3 || dist > MAX_DEPTH) continue;
      var angleE = Math.atan2(dy, dx);
      var relAngle = angleE - player.angle;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;
      if (Math.abs(relAngle) > HALF_FOV + 0.15) continue;
      visible.push({ e: e, dist: dist, relAngle: relAngle });
    }
    visible.sort(function (a, b) { return b.dist - a.dist; });

    var bobOffset = player.grounded ? Math.sin(player.bobPhase) * 1.2 : 0;
    var shakeOffset = player.shakeTimer > 0 ? (Math.random() - 0.5) * player.shakeAmp * 2 : 0;
    var eyeZ = player.z + 0.5;
    var horizon = ((H / 2 + player.pitch + bobOffset + shakeOffset) | 0);

    for (var v = 0; v < visible.length; v++) {
      var item = visible[v];
      var e = item.e;
      var dist = item.dist;
      var cfg = e.cfg;

      var screenX = ((0.5 + item.relAngle / FOV) * W) | 0;
      var sprScale = H / dist;

      var feetH = e.z;
      var headH = e.z + cfg.sprH;
      var baseY = (horizon + (eyeZ - feetH) * H / dist) | 0;
      var topY = (horizon + (eyeZ - headH) * H / dist) | 0;
      var sprH = baseY - topY;
      if (sprH < 2) sprH = 2;
      var sprW = Math.max(2, (sprScale * cfg.sprW) | 0);
      var halfW = (sprW / 2) | 0;

      var shade = Math.max(0.15, 1 - dist / MAX_DEPTH);
      var isFlash = e.hitTimer > 0;
      var col = cfg.color;
      var bodyR = (col[0] * shade * 0.4) | 0;
      var bodyG = (col[1] * shade * 0.4) | 0;
      var bodyB = (col[2] * shade * 0.4) | 0;
      // Dark body base
      var darkR = (20 * shade) | 0;
      var darkG = (22 * shade) | 0;
      var darkB = (30 * shade) | 0;

      for (var sx = -halfW; sx <= halfW; sx++) {
        var c = screenX + sx;
        if (c < 0 || c >= W) continue;
        var normX = halfW > 0 ? Math.abs(sx) / halfW : 0;

        for (var ry = Math.max(0, topY); ry < Math.min(H, baseY); ry++) {
          if (getDepth(c, ry) <= dist) continue;
          var normY = sprH > 0 ? (ry - topY) / sprH : 0;

          var pr, pg, pb;
          if (isFlash) {
            pr = 255; pg = 255; pb = 255;
          } else {
            // Build sprite based on type
            var drawn = false;
            switch (e.type) {
              case 'WOLF':
                drawn = drawWolfPixel(normX, normY, shade, col, darkR, darkG, darkB);
                break;
              case 'HAWK':
                drawn = drawHawkPixel(normX, normY, shade, col, darkR, darkG, darkB);
                break;
              case 'BEAR':
                drawn = drawBearPixel(normX, normY, shade, col, darkR, darkG, darkB);
                break;
              case 'SNAKE':
                drawn = drawSnakePixel(normX, normY, shade, col, darkR, darkG, darkB);
                break;
              case 'DRAGON':
                drawn = drawDragonPixel(normX, normY, shade, col, darkR, darkG, darkB, e);
                break;
            }
            if (drawn) {
              pr = drawn[0]; pg = drawn[1]; pb = drawn[2];
            } else {
              continue;
            }
          }
          var fogged = fogBlend(pr, pg, pb, dist);
          setPx(c, ry, Math.min(fogged[0], 255), Math.min(fogged[1], 255), Math.min(fogged[2], 255));
        }
      }
    }
  }

  // Sprite pixel functions return [r,g,b] or false (transparent)
  function drawWolfPixel(nx, ny, sh, col, dr, dg, db) {
    // Wolf: horizontal body + pointed ears, red glowing eyes
    // Body outline: narrower at head (ny<0.3), wide torso
    var bodyWidth = ny < 0.2 ? 0.6 : ny < 0.7 ? 0.9 : 0.7;
    if (nx > bodyWidth) return false;
    // Ears at top
    if (ny < 0.15 && nx > 0.3 && nx < 0.7) {
      return [(col[0] * sh * 0.5) | 0, (col[1] * sh * 0.5) | 0, (col[2] * sh * 0.5) | 0];
    }
    // Eyes
    if (ny > 0.15 && ny < 0.25 && nx > 0.15 && nx < 0.4) {
      return [255, 40, 40]; // glowing red
    }
    // Body
    var bsh = ny < 0.3 ? 0.5 : 0.35;
    return [(dr + col[0] * sh * bsh) | 0, (dg + col[1] * sh * bsh) | 0, (db + col[2] * sh * bsh) | 0];
  }

  function drawHawkPixel(nx, ny, sh, col, dr, dg, db) {
    // Hawk: wide wings, narrow body center
    var wingSpan = ny > 0.3 && ny < 0.6 ? 1.0 : 0.5;
    if (nx > wingSpan) return false;
    // Eyes
    if (ny > 0.1 && ny < 0.2 && nx > 0.1 && nx < 0.3) {
      return [0, 220, 255]; // cyan glow
    }
    // Wing tips glow
    if (nx > 0.7 && ny > 0.3 && ny < 0.6) {
      return [(col[0] * sh * 0.6) | 0, (col[1] * sh * 0.6) | 0, (col[2] * sh * 0.6) | 0];
    }
    return [(dr + col[0] * sh * 0.3) | 0, (dg + col[1] * sh * 0.3) | 0, (db + col[2] * sh * 0.3) | 0];
  }

  function drawBearPixel(nx, ny, sh, col, dr, dg, db) {
    // Bear: massive square body
    var bodyWidth = ny < 0.15 ? 0.7 : 0.95;
    if (nx > bodyWidth) return false;
    // Eyes
    if (ny > 0.1 && ny < 0.18 && nx > 0.2 && nx < 0.5) {
      return [255, 160, 40]; // orange glow
    }
    // Armor plates
    var plate = (ny * 5) | 0;
    var plateMul = plate % 2 === 0 ? 0.45 : 0.35;
    return [(dr + col[0] * sh * plateMul) | 0, (dg + col[1] * sh * plateMul) | 0, (db + col[2] * sh * plateMul) | 0];
  }

  function drawSnakePixel(nx, ny, sh, col, dr, dg, db) {
    // Snake: low wide profile
    var bodyWidth = ny < 0.3 ? 0.4 + ny : ny < 0.7 ? 0.9 : 0.9 - (ny - 0.7) * 2;
    if (bodyWidth < 0 || nx > bodyWidth) return false;
    // Eyes
    if (ny > 0.15 && ny < 0.3 && nx < 0.25) {
      return [180, 60, 255]; // purple glow
    }
    return [(dr + col[0] * sh * 0.35) | 0, (dg + col[1] * sh * 0.35) | 0, (db + col[2] * sh * 0.35) | 0];
  }

  function drawDragonPixel(nx, ny, sh, col, dr, dg, db, e) {
    // Dragon: largest, crown/horns, gold glow
    var bodyWidth = ny < 0.1 ? 0.5 : ny < 0.15 ? 0.8 : 0.95;
    if (nx > bodyWidth) return false;
    // Crown/horns at top
    if (ny < 0.08 && nx > 0.15 && nx < 0.45) {
      return [(col[0] * sh * 0.8) | 0, (col[1] * sh * 0.8) | 0, (col[2] * sh * 0.4) | 0];
    }
    // Eyes
    if (ny > 0.12 && ny < 0.2 && nx > 0.15 && nx < 0.45) {
      // Phase 2: eyes turn red
      if (e.hp < e.maxHp * 0.5) return [255, 40, 40];
      return [255, 200, 40]; // gold glow
    }
    // Body with armor segments
    var seg = (ny * 6) | 0;
    var segMul = seg % 2 === 0 ? 0.45 : 0.35;
    // Phase 2: slightly redder
    var phase2 = e.hp < e.maxHp * 0.5;
    var rBoost = phase2 ? 30 : 0;
    return [Math.min(255, (dr + col[0] * sh * segMul) | 0) + rBoost,
            (dg + col[1] * sh * segMul) | 0,
            (db + col[2] * sh * segMul * (phase2 ? 0.5 : 1)) | 0];
  }

  // ===== 17. Render: Bullets & Particles (setPx) =====
  var LASER_TRAIL = 0.06; // seconds of trail behind bullet

  function renderBullets() {
    var bobOffset = player.grounded ? Math.sin(player.bobPhase) * 1.2 : 0;
    var shakeOffset = player.shakeTimer > 0 ? (Math.random() - 0.5) * player.shakeAmp * 2 : 0;
    var eyeZ = player.z + 0.5;
    var horizon = ((H / 2 + player.pitch + bobOffset + shakeOffset) | 0);

    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];

      // Compute screen position of bullet head
      var hdx = b.x - player.x; var hdy = b.y - player.y;
      var headDist = Math.sqrt(hdx * hdx + hdy * hdy);
      if (headDist < 0.15 || headDist > MAX_DEPTH) continue;

      var headAngle = Math.atan2(hdy, hdx);
      var headRel = headAngle - player.angle;
      while (headRel > Math.PI) headRel -= Math.PI * 2;
      while (headRel < -Math.PI) headRel += Math.PI * 2;
      if (Math.abs(headRel) > HALF_FOV + 0.2) continue;

      var headSX = ((0.5 + headRel / FOV) * W) | 0;
      var headSY = (horizon + (eyeZ - b.z) * H / headDist) | 0;

      // Compute screen position of bullet tail (where it was LASER_TRAIL seconds ago)
      var tailX = b.x - b.dx * LASER_TRAIL;
      var tailY = b.y - b.dy * LASER_TRAIL;
      var tailZ = b.z - b.dz * LASER_TRAIL;
      var tdx = tailX - player.x; var tdy = tailY - player.y;
      var tailDist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tailDist < 0.1) tailDist = 0.1;

      var tailAngle = Math.atan2(tdy, tdx);
      var tailRel = tailAngle - player.angle;
      while (tailRel > Math.PI) tailRel -= Math.PI * 2;
      while (tailRel < -Math.PI) tailRel += Math.PI * 2;

      var tailSX = ((0.5 + tailRel / FOV) * W) | 0;
      var tailSY = (horizon + (eyeZ - tailZ) * H / tailDist) | 0;

      // Colors
      var cr, cg, cb, gr, gg, gb, tr, tg, tb;
      if (b.isEnemy) {
        cr = 255; cg = 100; cb = 60;    // core: bright orange
        gr = 255; gg = 50;  gb = 20;    // glow
        tr = 180; tg = 20;  tb = 5;     // tail fade
      } else {
        cr = 220; cg = 255; cb = 255;   // core: white-cyan
        gr = 0;   gg = 255; gb = 230;   // glow
        tr = 0;   tg = 120; tb = 110;   // tail fade
      }

      // Draw laser line from tail to head using Bresenham
      var lx0 = tailSX, ly0 = tailSY, lx1 = headSX, ly1 = headSY;
      var ldx = Math.abs(lx1 - lx0);
      var ldy = Math.abs(ly1 - ly0);
      var sx = lx0 < lx1 ? 1 : -1;
      var sy = ly0 < ly1 ? 1 : -1;
      var err = ldx - ldy;
      var steps = ldx + ldy;
      if (steps < 1) steps = 1;
      var maxSteps = Math.min(steps, 40); // cap to avoid huge lines
      var step = 0;

      var cx = lx0, cy = ly0;
      for (var s = 0; s <= maxSteps; s++) {
        var t = maxSteps > 0 ? s / maxSteps : 1; // 0=tail, 1=head
        // Interpolate distance for depth check
        var pDist = tailDist + (headDist - tailDist) * t;

        if (cx >= 0 && cx < W && cy >= 0 && cy < H && getDepth(cx, cy) > pDist) {
          // Core pixel
          var lr = (tr + (cr - tr) * t) | 0;
          var lg = (tg + (cg - tg) * t) | 0;
          var lb = (tb + (cb - tb) * t) | 0;
          setPx(cx, cy, lr, lg, lb);

          // Glow: 1px on each side perpendicular to beam direction
          var glowR = (tr + (gr - tr) * t) | 0;
          var glowG = (tg + (gg - tg) * t) | 0;
          var glowB = (tb + (gb - tb) * t) | 0;
          // Perpendicular offset: if beam is more horizontal, glow up/down; else left/right
          if (ldx >= ldy) {
            setPx(cx, cy - 1, glowR, glowG, glowB);
            setPx(cx, cy + 1, glowR, glowG, glowB);
          } else {
            setPx(cx - 1, cy, glowR, glowG, glowB);
            setPx(cx + 1, cy, glowR, glowG, glowB);
          }
        }

        if (cx === lx1 && cy === ly1) break;
        var e2 = err * 2;
        if (e2 > -ldy) { err -= ldy; cx += sx; }
        if (e2 < ldx)  { err += ldx; cy += sy; }
      }

      // Bright head flare (2x2)
      if (headSX >= 1 && headSX < W - 1 && headSY >= 1 && headSY < H - 1) {
        if (getDepth(headSX, headSY) > headDist) {
          setPx(headSX, headSY, 255, 255, 255);
          setPx(headSX + 1, headSY, cr, cg, cb);
          setPx(headSX, headSY + 1, cr, cg, cb);
          setPx(headSX - 1, headSY, gr, gg, gb);
          setPx(headSX, headSY - 1, gr, gg, gb);
        }
      }
    }
  }

  function renderParticles() {
    var bobOffset = player.grounded ? Math.sin(player.bobPhase) * 1.2 : 0;
    var shakeOffset = player.shakeTimer > 0 ? (Math.random() - 0.5) * player.shakeAmp * 2 : 0;
    var eyeZ = player.z + 0.5;
    var horizon = ((H / 2 + player.pitch + bobOffset + shakeOffset) | 0);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var dx = p.x - player.x; var dy = p.y - player.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.1 || dist > MAX_DEPTH) continue;

      var angle = Math.atan2(dy, dx);
      var relAngle = angle - player.angle;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;
      if (Math.abs(relAngle) > HALF_FOV) continue;

      var screenX = ((0.5 + relAngle / FOV) * W) | 0;
      var screenY = (horizon + (eyeZ - p.z) * H / dist) | 0;
      var alpha = p.life / p.maxLife;

      if (screenX >= 0 && screenX < W && screenY >= 0 && screenY < H) {
        if (getDepth(screenX, screenY) > dist) {
          var pr = (p.r * alpha) | 0;
          var pg = (p.g * alpha) | 0;
          var pb = (p.b * alpha) | 0;
          setPx(screenX, screenY, pr, pg, pb);
        }
      }
    }
  }

  // ===== 18. Render: First-Person Weapon =====
  function renderWeapon() {
    var bobX = Math.sin(player.bobPhase * 0.5) * 1.5;
    var bobY = Math.abs(Math.cos(player.bobPhase)) * 2;
    var recoilX = player.recoil * 4;
    var recoilY = player.recoil * 4;

    var baseX = W - 38 + bobX + recoilX;
    var baseY = H - 30 + bobY + recoilY;

    // Frog robot arm (green mechanical)
    ctx.fillStyle = '#1a6a3a';
    ctx.fillRect(baseX + 10, baseY + 2, 20, 14);
    ctx.fillStyle = '#0d4a28';
    ctx.fillRect(baseX + 13, baseY + 5, 14, 8);
    // Arm segments
    ctx.fillStyle = '#2a8a4a';
    ctx.fillRect(baseX + 10, baseY + 2, 20, 3);
    ctx.fillRect(baseX + 10, baseY + 13, 20, 3);

    // Blaster barrel
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(baseX + 5, baseY + 5, 10, 8);
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(baseX + 2, baseY + 6, 6, 6);
    // Barrel tip
    ctx.fillStyle = '#606070';
    ctx.fillRect(baseX, baseY + 7, 4, 5);

    // Energy core (cyan glow)
    ctx.fillStyle = '#00ffc8';
    ctx.fillRect(baseX + 7, baseY + 8, 3, 3);

    // Muzzle flash
    if (player.muzzleFlash > 0) {
      var flashAlpha = player.muzzleFlash / 0.06;
      ctx.save();
      ctx.globalAlpha = flashAlpha * 0.8;
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(baseX - 5, baseY + 5, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(baseX - 3, baseY + 7, 4, 5);
      ctx.restore();
    }
  }

  // ===== 19. Render: HUD & Minimap =====
  var MINI_SIZE = 34;
  var MINI_X = W - MINI_SIZE - 3;
  var MINI_Y = 3;

  function renderMinimap(pal) {
    var cs = MINI_SIZE / MAP_SIZE;

    // Dark background with slight transparency
    ctx.fillStyle = 'rgba(5,4,16,0.75)';
    ctx.fillRect(MINI_X - 1, MINI_Y - 1, MINI_SIZE + 2, MINI_SIZE + 2);
    ctx.fillStyle = pal.miniPath;
    ctx.fillRect(MINI_X, MINI_Y, MINI_SIZE, MINI_SIZE);

    for (var my = 0; my < MAP_SIZE; my++) {
      for (var mx = 0; mx < MAP_SIZE; mx++) {
        if (map[my][mx] === 1) {
          // Neon-colored walls on minimap
          var nn = mapNeon[my][mx];
          if (nn > 0 && NEON_COLORS[nn]) {
            var nc = NEON_COLORS[nn];
            ctx.fillStyle = 'rgb(' + (nc[0] >> 1) + ',' + (nc[1] >> 1) + ',' + (nc[2] >> 1) + ')';
          } else {
            ctx.fillStyle = pal.miniWall;
          }
          ctx.fillRect((MINI_X + mx * cs) | 0, (MINI_Y + my * cs) | 0,
            Math.ceil(cs), Math.ceil(cs));
        } else if (mapFloor[my][mx] > 0) {
          var fh = mapFloor[my][mx];
          var bright = 0.15 + fh * 0.25;
          ctx.fillStyle = 'rgba(100,200,255,' + bright.toFixed(2) + ')';
          ctx.fillRect((MINI_X + mx * cs) | 0, (MINI_Y + my * cs) | 0,
            Math.ceil(cs), Math.ceil(cs));
        }
      }
    }

    // Enemies
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;
      var ec = e.cfg.color;
      ctx.fillStyle = 'rgb(' + ec[0] + ',' + ec[1] + ',' + ec[2] + ')';
      var sz = e.type === 'DRAGON' ? 3 : 2;
      ctx.fillRect((MINI_X + e.x * cs) | 0, (MINI_Y + e.y * cs) | 0, sz, sz);
    }

    // Player
    ctx.fillStyle = pal.miniPlayer;
    var px = (MINI_X + player.x * cs) | 0;
    var py = (MINI_Y + player.y * cs) | 0;
    ctx.fillRect(px, py, 2, 2);
    var dirX = Math.cos(player.angle) * 3;
    var dirY = Math.sin(player.angle) * 3;
    ctx.fillRect((px + dirX) | 0, (py + dirY) | 0, 1, 1);

    // Border
    ctx.strokeStyle = '#00ffa0';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(MINI_X - 0.5, MINI_Y - 0.5, MINI_SIZE + 1, MINI_SIZE + 1);
  }

  function renderHUD(pal, dt) {
    // HP bar
    var barW = 40, barH = 4, barX = 3, barY = 3;
    ctx.fillStyle = 'rgba(5,4,16,0.6)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    var hpR = player.hp / PLAYER_MAX_HP;
    ctx.fillStyle = hpR > 0.5 ? '#00ffa0' : (hpR > 0.25 ? '#ffc828' : '#ff3c3c');
    ctx.fillRect(barX, barY, (barW * hpR) | 0, barH);
    ctx.fillStyle = pal.hud;
    ctx.fillRect(barX, barY, barW, 1);
    ctx.fillRect(barX, barY + barH - 1, barW, 1);
    ctx.fillRect(barX, barY, 1, barH);
    ctx.fillRect(barX + barW - 1, barY, 1, barH);

    // Energy bar (dash cooldown)
    var energyY = barY + barH + 2;
    ctx.fillStyle = 'rgba(5,4,16,0.6)';
    ctx.fillRect(barX - 1, energyY - 1, barW + 2, 3);
    var dashR = player.dashCD > 0 ? 1 - (player.dashCD / DASH_CD) : 1;
    ctx.fillStyle = dashR >= 1 ? '#00dcff' : '#1a4a5a';
    ctx.fillRect(barX, energyY, (barW * dashR) | 0, 1);

    // Kill counter
    ctx.fillStyle = pal.hud;
    ctx.font = '5px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText('K:' + player.kills + '/' + totalKillsNeeded, barX, energyY + 7);

    // Height level
    var floorLvl = getFloor(player.x, player.y);
    var lvlName = floorLvl >= 1.0 ? 'TOP' : floorLvl >= 0.6 ? 'H2' : floorLvl >= 0.3 ? 'H1' : 'GND';
    ctx.fillText(lvlName, barX, energyY + 14);

    // Crosshair (cyberpunk style)
    var cx = (W / 2) | 0;
    var cy = (H / 2 + player.pitch) | 0;
    ctx.fillStyle = pal.crosshair;
    ctx.fillRect(cx - 3, cy, 2, 1);
    ctx.fillRect(cx + 2, cy, 2, 1);
    ctx.fillRect(cx, cy - 3, 1, 2);
    ctx.fillRect(cx, cy + 2, 1, 2);
    // Center dot
    ctx.globalAlpha = 0.5;
    ctx.fillRect(cx, cy, 1, 1);
    ctx.globalAlpha = 1;

    // Hit flash (red border)
    if (player.hitFlash > 0) {
      player.hitFlash -= dt;
      ctx.save();
      ctx.globalAlpha = (player.hitFlash / 0.15) * 0.4;
      ctx.fillStyle = pal.hitFlash;
      ctx.fillRect(0, 0, W, 2);
      ctx.fillRect(0, H - 2, W, 2);
      ctx.fillRect(0, 0, 2, H);
      ctx.fillRect(W - 2, 0, 2, H);
      ctx.restore();
    }

    // Muzzle flash timer
    if (player.muzzleFlash > 0) player.muzzleFlash -= dt;

    // "Click to play" prompt
    if (!pointerLocked && gameState === 'playing' && isFpsActive()) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() * 0.004);
      ctx.fillStyle = '#00ffa0';
      ctx.font = '5px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK TO PLAY', W / 2, H / 2 + 12);
      ctx.restore();
    }

    // ESC hint when locked (hide on mobile)
    if (pointerLocked && gameState === 'playing' && !isMobileFps) {
      ctx.fillStyle = pal.hud;
      ctx.font = '4px "Press Start 2P"';
      ctx.textAlign = 'right';
      ctx.globalAlpha = 0.3;
      ctx.fillText('ESC:unlock', W - MINI_SIZE - 6, MINI_Y + MINI_SIZE + 8);
      ctx.globalAlpha = 1;
    }

    // Win / Game Over
    if (gameState === 'win') {
      stateTimer -= dt;
      ctx.save();
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
      ctx.fillStyle = '#00ffa0';
      ctx.font = '7px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('YOU WIN!', W / 2, H / 2 - 2);
      ctx.restore();
      if (stateTimer <= 0) resetGame();
    }
    if (gameState === 'gameover') {
      stateTimer -= dt;
      ctx.save();
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.008) * 0.3;
      ctx.fillStyle = '#ff3c3c';
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 2);
      ctx.restore();
      if (stateTimer <= 0) resetGame();
    }
  }

  // ===== 20. Screen Effects =====
  function renderScreenEffects() {
    // Shake timer decay
    if (player.shakeTimer > 0) {
      player.shakeTimer -= 1 / 30;
      if (player.shakeTimer < 0) player.shakeTimer = 0;
    }

    // Red vignette when low HP
    if (player.hp < PLAYER_MAX_HP * 0.3 && gameState === 'playing') {
      var intensity = 1 - (player.hp / (PLAYER_MAX_HP * 0.3));
      var pulse = 0.3 + 0.15 * Math.sin(Date.now() * 0.005);
      ctx.save();
      ctx.globalAlpha = intensity * pulse;
      // Draw red borders for vignette effect
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, W, 3);
      ctx.fillRect(0, H - 3, W, 3);
      ctx.fillRect(0, 0, 3, H);
      ctx.fillRect(W - 3, 0, 3, H);
      ctx.restore();
    }

    // Speed lines during dash
    if (player.dashVel > DASH_MIN) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.4, (player.dashVel - DASH_MIN) * 0.15);
      ctx.fillStyle = '#00dcff';
      for (var i = 0; i < 6; i++) {
        var ly = ((hash(i * 31 + (Date.now() & 0xff)) * H) | 0);
        ctx.fillRect(0, ly, 4, 1);
        ctx.fillRect(W - 4, ly, 4, 1);
      }
      ctx.restore();
    }
  }

  // ===== 21. Player Input & Mechanics =====
  function handleInput(dt) {
    if (!isFpsActive()) return;
    if (gameState !== 'playing') return;

    // Mouse look
    if (pointerLocked) {
      player.angle += mouseDX * MOUSE_SENS_X;
      player.pitch -= mouseDY * MOUSE_SENS_Y;
    }
    mouseDX = 0; mouseDY = 0;

    // Arrow keys as fallback
    if (keys['ArrowLeft']) player.angle -= ROT_SPEED * dt;
    if (keys['ArrowRight']) player.angle += ROT_SPEED * dt;
    if (keys['ArrowUp']) player.pitch += PITCH_SPEED * dt;
    if (keys['ArrowDown']) player.pitch -= PITCH_SPEED * dt;

    if (player.pitch > MAX_PITCH) player.pitch = MAX_PITCH;
    if (player.pitch < -MAX_PITCH) player.pitch = -MAX_PITCH;

    // Movement WASD
    var fwdX = Math.cos(player.angle);
    var fwdY = Math.sin(player.angle);
    var rightX = -Math.sin(player.angle);
    var rightY = Math.cos(player.angle);

    var dx = 0, dy = 0;
    var isMoving = false;
    if (keys['KeyW']) { dx += fwdX * MOVE_SPEED * dt; dy += fwdY * MOVE_SPEED * dt; isMoving = true; }
    if (keys['KeyS']) { dx -= fwdX * MOVE_SPEED * dt; dy -= fwdY * MOVE_SPEED * dt; isMoving = true; }
    if (keys['KeyD']) { dx += rightX * STRAFE_SPEED * dt; dy += rightY * STRAFE_SPEED * dt; isMoving = true; }
    if (keys['KeyA']) { dx -= rightX * STRAFE_SPEED * dt; dy -= rightY * STRAFE_SPEED * dt; isMoving = true; }

    // Dash
    if (player.dashCD > 0) player.dashCD -= dt;
    if (keys['KeyE'] && player.dashCD <= 0 && player.dashVel < DASH_MIN) {
      player.dashVel = DASH_SPEED;
      player.dashAngle = player.angle;
      player.dashCD = DASH_CD;
      // Dash particles
      spawnDashTrail(player.x, player.y, player.z);
    }

    if (player.dashVel > DASH_MIN) {
      dx += Math.cos(player.dashAngle) * player.dashVel * dt;
      dy += Math.sin(player.dashAngle) * player.dashVel * dt;
      player.dashVel *= DASH_DECAY;
      if (player.dashVel < DASH_MIN) player.dashVel = 0;
    }

    // Camera bob
    if (isMoving && player.grounded) {
      player.bobPhase += dt * 8;
    } else {
      player.bobPhase *= 0.9;
    }

    // Apply horizontal movement with collision
    var m = COLLISION_MARGIN;
    if (dx !== 0) {
      var nx = player.x + dx;
      if (canWalkTo(nx - m, player.y - m, player.z) && canWalkTo(nx + m, player.y - m, player.z) &&
          canWalkTo(nx - m, player.y + m, player.z) && canWalkTo(nx + m, player.y + m, player.z)) {
        player.x = nx;
      }
    }
    if (dy !== 0) {
      var ny = player.y + dy;
      if (canWalkTo(player.x - m, ny - m, player.z) && canWalkTo(player.x + m, ny - m, player.z) &&
          canWalkTo(player.x - m, ny + m, player.z) && canWalkTo(player.x + m, ny + m, player.z)) {
        player.y = ny;
      }
    }

    // Jump & Double Jump
    if (keys['Space']) {
      if (player.grounded) {
        player.vz = JUMP_VEL;
        player.grounded = false;
        player.canDoubleJump = true;
        player.hasDoubleJumped = false;
        keys['Space'] = false; // prevent hold
      } else if (player.canDoubleJump && !player.hasDoubleJumped) {
        player.vz = JUMP_VEL * DOUBLE_JUMP_MUL;
        player.hasDoubleJumped = true;
        player.canDoubleJump = false;
        keys['Space'] = false;
        // Double jump particle ring
        spawnDoubleJumpEffect(player.x, player.y, player.z);
      }
    }

    // Gravity & landing
    var currentFloor = getFloor(player.x, player.y);
    if (!player.grounded || player.vz > 0) {
      player.vz -= GRAVITY * dt;
      player.z += player.vz * dt;
      if (player.z <= currentFloor) {
        // Landing effect if falling fast
        if (player.vz < -3) {
          spawnLandingDust(player.x, player.y, currentFloor);
        }
        player.z = currentFloor;
        player.vz = 0;
        player.grounded = true;
        player.canDoubleJump = true;
        player.hasDoubleJumped = false;
      }
    } else {
      if (currentFloor > player.z) {
        player.z = currentFloor;
      }
      if (player.z > currentFloor + 0.01) {
        player.grounded = false;
      }
    }

    // Shoot (mouse click or Shift)
    if (player.shootCD > 0) player.shootCD -= dt;
    if ((mouseDown || keys['ShiftLeft'] || keys['ShiftRight']) && player.shootCD <= 0) {
      playerShoot();
    }

    // Recoil decay
    if (player.recoil > 0) {
      player.recoil *= 0.85;
      if (player.recoil < 0.01) player.recoil = 0;
    }
  }

  // ===== 22. Shooting & Bullet Update =====
  function playerShoot() {
    if (gameState !== 'playing') return;
    if (player.shootCD > 0) return;
    player.shootCD = SHOOT_CD;
    var ca = Math.cos(player.angle); var sa = Math.sin(player.angle);
    var eyeZ = player.z + 0.5;
    var pitchRad = player.pitch * 0.015;
    bullets.push({
      x: player.x + ca * 0.4, y: player.y + sa * 0.4, z: eyeZ,
      dx: ca * PLAYER_BULLET_SPEED, dy: sa * PLAYER_BULLET_SPEED,
      dz: pitchRad * PLAYER_BULLET_SPEED,
      life: BULLET_LIFETIME, isEnemy: false
    });
    player.muzzleFlash = 0.06;
    player.recoil = 1.0;
  }

  function enemyShoot(e, spread) {
    if (gameState !== 'playing') return;
    var dx = player.x - e.x; var dy = player.y - e.y;
    var dz = (player.z + 0.5) - (e.z + 0.4);
    var hDist = Math.sqrt(dx * dx + dy * dy);
    var spreadVal = spread || 0.2;
    var angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * spreadVal;
    var ca = Math.cos(angle); var sa = Math.sin(angle);
    var zSpeed = (hDist > 0.5) ? (dz / hDist) * ENEMY_BULLET_SPEED : 0;
    bullets.push({
      x: e.x + ca * 0.4, y: e.y + sa * 0.4, z: e.z + 0.4,
      dx: ca * ENEMY_BULLET_SPEED, dy: sa * ENEMY_BULLET_SPEED,
      dz: zSpeed + (Math.random() - 0.5) * 0.5,
      life: BULLET_LIFETIME, isEnemy: true, dmg: e.cfg.dmg
    });
  }

  function updateBullets(dt) {
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.life -= dt;
      if (b.life <= 0) { bullets.splice(i, 1); continue; }

      b.x += b.dx * dt;
      b.y += b.dy * dt;
      b.z += b.dz * dt;
      b.dz -= 2.0 * dt;

      if (isWall(b.x, b.y)) {
        spawnBulletImpact(b.x, b.y, b.z);
        bullets.splice(i, 1); continue;
      }

      var bFloor = getFloor(b.x, b.y);
      if (b.z < bFloor || b.z > 5) { bullets.splice(i, 1); continue; }

      if (b.isEnemy) {
        var pdx = b.x - player.x; var pdy = b.y - player.y;
        var pdz = b.z - (player.z + 0.5);
        if (pdx * pdx + pdy * pdy < 0.3 * 0.3 && Math.abs(pdz) < 0.5) {
          var dmg = b.dmg || 8;
          player.hp -= dmg;
          player.hitFlash = 0.15;
          player.shakeTimer = 0.15;
          player.shakeAmp = 2;
          if (player.hp <= 0) { player.hp = 0; gameState = 'gameover'; stateTimer = 3.0; }
          bullets.splice(i, 1); continue;
        }
      } else {
        for (var j = 0; j < enemies.length; j++) {
          var e = enemies[j];
          if (e.hp <= 0) continue;
          var edx = b.x - e.x; var edy = b.y - e.y;
          var edz = b.z - (e.z + 0.4);
          var hitR = e.type === 'DRAGON' ? 0.45 : 0.35;
          if (edx * edx + edy * edy < hitR * hitR && Math.abs(edz) < 0.6) {
            e.hp -= PLAYER_DAMAGE;
            e.hitTimer = 0.12;
            if (e.hp <= 0) {
              e.hp = 0;
              player.kills++;
              spawnDeathEffect(e.x, e.y, e.z, e.cfg.color);
              if (player.kills >= totalKillsNeeded) {
                gameState = 'win'; stateTimer = 3.0;
              }
            } else {
              spawnHitSparks(e.x, e.y, e.z, e.cfg.color);
            }
            bullets.splice(i, 1); break;
          }
        }
      }
    }
  }

  // ===== 23. Enemy AI =====
  function updateEnemies(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hitTimer > 0) e.hitTimer -= dt;
      if (e.hp <= 0) continue;
      if (e.shootCD > 0) e.shootCD -= dt;

      var dx = player.x - e.x; var dy = player.y - e.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var los = dist < ENEMY_SIGHT && hasLineOfSight(e.x, e.y, player.x, player.y);
      var cfg = e.cfg;

      // State transitions
      var attackRange = cfg.melee ? 1.2 : 6;
      if (los && dist < attackRange) e.state = 'ATTACK';
      else if (los) e.state = 'CHASE';
      else if (e.state !== 'PATROL') { e.state = 'PATROL'; e.patrolTimer = 0; }

      switch (e.type) {
        case 'WOLF':
          // Rush towards player, melee only
          if (e.state === 'CHASE' || e.state === 'ATTACK') {
            var nx = dx / dist; var ny = dy / dist;
            moveEnemy(e, nx * cfg.chaseSpeed * dt, ny * cfg.chaseSpeed * dt);
            e.angle = Math.atan2(dy, dx);
            // Melee damage on close range
            if (dist < 1.0 && e.shootCD <= 0) {
              player.hp -= cfg.dmg;
              player.hitFlash = 0.15;
              player.shakeTimer = 0.2;
              player.shakeAmp = 3;
              e.shootCD = 0.8;
              if (player.hp <= 0) { player.hp = 0; gameState = 'gameover'; stateTimer = 3.0; }
            }
          } else {
            doPatrol(e, cfg.speed, dt);
          }
          break;

        case 'HAWK':
          // Shoot from distance, flee if player gets close
          if (e.state === 'ATTACK') {
            e.angle = Math.atan2(dy, dx);
            if (dist < 3) {
              // Flee
              moveEnemy(e, -(dx / dist) * cfg.speed * dt, -(dy / dist) * cfg.speed * dt);
            } else if (e.shootCD <= 0 && los) {
              enemyShoot(e, 0.15);
              e.shootCD = cfg.shootCD + Math.random() * 0.3;
            }
          } else if (e.state === 'CHASE') {
            var nx = dx / dist; var ny = dy / dist;
            moveEnemy(e, nx * cfg.chaseSpeed * dt, ny * cfg.chaseSpeed * dt);
            e.angle = Math.atan2(dy, dx);
          } else {
            doPatrol(e, cfg.speed, dt);
          }
          break;

        case 'BEAR':
          // Heavy tank, barely moves, high damage shots
          if (e.state === 'ATTACK' || e.state === 'CHASE') {
            e.angle = Math.atan2(dy, dx);
            // Slow advance
            if (dist > 4) {
              var nx = dx / dist; var ny = dy / dist;
              moveEnemy(e, nx * cfg.speed * dt, ny * cfg.speed * dt);
            }
            if (e.shootCD <= 0 && los && dist < 8) {
              enemyShoot(e, 0.1);
              e.shootCD = cfg.shootCD + Math.random() * 0.4;
            }
          } else {
            doPatrol(e, cfg.speed * 0.5, dt);
          }
          break;

        case 'SNAKE':
          // Fast, rapid-fire, ambush
          if (e.state === 'ATTACK') {
            e.angle = Math.atan2(dy, dx);
            // Strafe
            var sx = -dy / dist; var sy = dx / dist;
            moveEnemy(e, sx * cfg.speed * 0.7 * dt, sy * cfg.speed * 0.7 * dt);
            if (e.shootCD <= 0 && los) {
              enemyShoot(e, 0.25);
              e.shootCD = cfg.shootCD + Math.random() * 0.15;
            }
          } else if (e.state === 'CHASE') {
            var nx = dx / dist; var ny = dy / dist;
            moveEnemy(e, nx * cfg.chaseSpeed * dt, ny * cfg.chaseSpeed * dt);
            e.angle = Math.atan2(dy, dx);
          } else {
            doPatrol(e, cfg.speed, dt);
          }
          break;

        case 'DRAGON':
          // Boss: 2 phases
          if (e.state === 'ATTACK' || e.state === 'CHASE') {
            e.angle = Math.atan2(dy, dx);
            // Slow rotate and advance
            if (dist > 3) {
              var nx = dx / dist; var ny = dy / dist;
              moveEnemy(e, nx * cfg.speed * dt, ny * cfg.speed * dt);
            }
            if (e.shootCD <= 0 && los) {
              if (e.hp < e.maxHp * 0.5) {
                // Phase 2: spread shot (3 bullets)
                for (var bi = -1; bi <= 1; bi++) {
                  var spreadAngle = Math.atan2(dy, dx) + bi * 0.3;
                  var ca = Math.cos(spreadAngle); var sa = Math.sin(spreadAngle);
                  var dz = (player.z + 0.5) - (e.z + 0.4);
                  var zSpeed = (dist > 0.5) ? (dz / dist) * ENEMY_BULLET_SPEED : 0;
                  bullets.push({
                    x: e.x + ca * 0.5, y: e.y + sa * 0.5, z: e.z + 0.5,
                    dx: ca * ENEMY_BULLET_SPEED, dy: sa * ENEMY_BULLET_SPEED,
                    dz: zSpeed, life: BULLET_LIFETIME, isEnemy: true, dmg: cfg.dmg
                  });
                }
                e.shootCD = cfg.shootCD + Math.random() * 0.3;
              } else {
                enemyShoot(e, 0.12);
                e.shootCD = cfg.shootCD + Math.random() * 0.4;
              }
            }
          } else {
            doPatrol(e, cfg.speed * 0.3, dt);
          }
          break;
      }
    }
  }

  function doPatrol(e, spd, dt) {
    e.patrolTimer -= dt;
    if (e.patrolTimer <= 0) {
      e.patrolTimer = 1.5 + Math.random() * 2;
      e.patrolDirX = (Math.random() - 0.5) * 2;
      e.patrolDirY = (Math.random() - 0.5) * 2;
      var len = Math.sqrt(e.patrolDirX * e.patrolDirX + e.patrolDirY * e.patrolDirY);
      if (len > 0) { e.patrolDirX /= len; e.patrolDirY /= len; }
    }
    moveEnemy(e, e.patrolDirX * spd * dt, e.patrolDirY * spd * dt);
    e.angle = Math.atan2(e.patrolDirY, e.patrolDirX);
  }

  function moveEnemy(e, dx, dy) {
    var m = COLLISION_MARGIN;
    if (dx !== 0) {
      var nx = e.x + dx;
      if (!isWall(nx - m, e.y - m) && !isWall(nx + m, e.y - m) &&
          !isWall(nx - m, e.y + m) && !isWall(nx + m, e.y + m)) {
        var fl = getFloor(nx, e.y);
        if (Math.abs(fl - e.homeFloor) <= 0.1) e.x = nx;
      }
    }
    if (dy !== 0) {
      var ny = e.y + dy;
      if (!isWall(e.x - m, ny - m) && !isWall(e.x + m, ny - m) &&
          !isWall(e.x - m, ny + m) && !isWall(e.x + m, ny + m)) {
        var fl = getFloor(e.x, ny);
        if (Math.abs(fl - e.homeFloor) <= 0.1) e.y = ny;
      }
    }
  }

  // ===== 24. Particle Generation =====
  function spawnDoubleJumpEffect(x, y, z) {
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2;
      particles.push({
        x: x, y: y, z: z + 0.2,
        vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, vz: 0.5,
        life: 0.3, maxLife: 0.3,
        r: 0, g: 220, b: 255, size: 0.1
      });
    }
  }

  function spawnDashTrail(x, y, z) {
    for (var i = 0; i < 6; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: z + 0.2 + Math.random() * 0.3,
        vx: -Math.cos(player.angle) * (1 + Math.random()),
        vy: -Math.sin(player.angle) * (1 + Math.random()),
        vz: Math.random() * 0.5,
        life: 0.25, maxLife: 0.25,
        r: 0, g: 200, b: 255, size: 0.08
      });
    }
  }

  function spawnDeathEffect(x, y, z, color) {
    for (var i = 0; i < 8; i++) {
      var a = Math.random() * Math.PI * 2;
      particles.push({
        x: x, y: y, z: z + 0.2 + Math.random() * 0.3,
        vx: Math.cos(a) * (1.5 + Math.random() * 2),
        vy: Math.sin(a) * (1.5 + Math.random() * 2),
        vz: 1.5 + Math.random() * 2.5,
        life: 0.2, maxLife: 0.2,
        r: 255, g: 255, b: 255, size: 0.18
      });
    }
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2;
      var spd = 1 + Math.random() * 3;
      particles.push({
        x: x, y: y, z: z + Math.random() * 0.3,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        vz: 0.5 + Math.random() * 3,
        life: 0.5 + Math.random() * 0.5, maxLife: 1.0,
        r: color[0], g: color[1], b: color[2], size: 0.1
      });
    }
  }

  function spawnHitSparks(x, y, z, color) {
    for (var i = 0; i < 5; i++) {
      var a = Math.random() * Math.PI * 2;
      particles.push({
        x: x, y: y, z: z + 0.2,
        vx: Math.cos(a) * (1 + Math.random() * 1.5),
        vy: Math.sin(a) * (1 + Math.random() * 1.5),
        vz: 0.5 + Math.random(),
        life: 0.18 + Math.random() * 0.12, maxLife: 0.3,
        r: 255, g: 255, b: 120, size: 0.08
      });
    }
  }

  function spawnLandingDust(x, y, z) {
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * Math.PI * 2;
      particles.push({
        x: x, y: y, z: z + 0.05,
        vx: Math.cos(a) * (1 + Math.random()), vy: Math.sin(a) * (1 + Math.random()),
        vz: 0.3 + Math.random() * 0.5,
        life: 0.2, maxLife: 0.2,
        r: 80, g: 80, b: 100, size: 0.06
      });
    }
  }

  function spawnBulletImpact(x, y, z) {
    for (var i = 0; i < 3; i++) {
      var a = Math.random() * Math.PI * 2;
      particles.push({
        x: x, y: y, z: z,
        vx: Math.cos(a) * (0.5 + Math.random()), vy: Math.sin(a) * (0.5 + Math.random()),
        vz: 0.5 + Math.random(),
        life: 0.15, maxLife: 0.15,
        r: 200, g: 180, b: 100, size: 0.05
      });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= 8.0 * dt;
      p.vx *= 0.96; p.vy *= 0.96;
    }
  }

  // ===== 25. Game Flow =====
  function resetGame() {
    gameState = 'playing'; stateTimer = 0;
    player.x = 1.5; player.y = 18.5; player.z = 0; player.vz = 0;
    player.angle = -Math.PI / 4; player.pitch = 0;
    player.hp = PLAYER_MAX_HP; player.grounded = true;
    player.shootCD = 0; player.hitFlash = 0;
    player.muzzleFlash = 0; player.kills = 0;
    player.canDoubleJump = true; player.hasDoubleJumped = false;
    player.dashVel = 0; player.dashCD = 0;
    player.bobPhase = 0; player.recoil = 0;
    player.shakeTimer = 0; player.shakeAmp = 0;
    bullets = []; particles = [];
    generateArena();
    spawnEnemies();
  }

  // ===== 26. Game Loop (30fps) =====
  var FPS_RATE = 30;
  var frameDuration = 1000 / FPS_RATE;
  var lastFrame = 0;
  var lastTime = 0;

  function loop(t) {
    requestAnimationFrame(loop);
    if (t - lastFrame < frameDuration) return;
    lastFrame = t;

    var dt = (t - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = t;

    handleInput(dt);
    if (gameState === 'playing') {
      updateEnemies(dt);
      updateBullets(dt);
    }
    updateParticles(dt);

    var pal = getHudPalette();
    ctx.clearRect(0, 0, W, H);

    // Phase 1: ImageData buffer (setPx)
    renderScene();
    renderEnemies();
    renderBullets();
    renderParticles();
    ctx.putImageData(imgData, 0, 0);

    // Phase 2: Canvas API overlays
    renderWeapon();
    renderScreenEffects();
    renderMinimap(pal);
    renderHUD(pal, dt);
  }

  // ===== 27. Mobile Touch Controls (Twin-Stick) =====
  if (isMobileFps) {
    // Bypass pointer lock — touch input drives everything directly
    pointerLocked = true;

    var fpsBody = document.getElementById('fps-body');

    // --- Shared stick config ---
    var STICK_SIZE = 64;
    var KNOB_SIZE = 22;
    var STICK_MAX = STICK_SIZE / 2 - 2;
    var STICK_DEAD = 8;

    function makeStick(borderColor, knobBg, knobBorder) {
      var zone = document.createElement('div');
      zone.style.cssText = 'width:' + STICK_SIZE + 'px;height:' + STICK_SIZE + 'px;' +
        'border:1px solid ' + borderColor + ';border-radius:50%;position:relative;flex-shrink:0;' +
        'background:rgba(0,0,0,0.3);touch-action:none;';
      var knob = document.createElement('div');
      knob.style.cssText = 'width:' + KNOB_SIZE + 'px;height:' + KNOB_SIZE + 'px;' +
        'background:' + knobBg + ';border:1px solid ' + knobBorder + ';border-radius:50%;' +
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;';
      zone.appendChild(knob);
      return { zone: zone, knob: knob };
    }

    // Left stick (move) — green
    var L = makeStick('rgba(0,255,160,0.25)', 'rgba(0,255,160,0.25)', 'rgba(0,255,160,0.4)');
    // Right stick (look) — cyan
    var R = makeStick('rgba(0,220,255,0.25)', 'rgba(0,220,255,0.25)', 'rgba(0,220,255,0.4)');

    // Action buttons
    function makeBtn(text, bg, color, border) {
      var b = document.createElement('div');
      b.textContent = text;
      b.style.cssText = 'font-family:"Press Start 2P",monospace;font-size:5px;' +
        'padding:14px 12px;touch-action:none;-webkit-user-select:none;user-select:none;' +
        'border:1px solid ' + border + ';border-radius:2px;background:' + bg + ';color:' + color + ';';
      return b;
    }

    var jumpBtn = makeBtn('JUMP', 'rgba(0,255,160,0.15)', '#00ffa0', 'rgba(0,255,160,0.3)');
    var dashBtn = makeBtn('DASH', 'rgba(0,220,255,0.15)', '#00dcff', 'rgba(0,220,255,0.3)');

    // Layout: [L-Stick] [Buttons] [R-Stick]
    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
      'background:#080810;border-top:1px solid rgba(0,255,160,0.15);padding:6px 8px;';

    var btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:center;';
    btnGroup.appendChild(jumpBtn);
    btnGroup.appendChild(dashBtn);

    ctrl.appendChild(L.zone);
    ctrl.appendChild(btnGroup);
    ctrl.appendChild(R.zone);
    fpsBody.appendChild(ctrl);

    // Prevent canvas touch from reaching main.js
    canvas.style.touchAction = 'none';
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    canvas.addEventListener('touchend', function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });

    // --- Generic stick touch logic (with optional tap callback) ---
    function stickHandler(stick, onUpdate, onEnd, onTap) {
      var touchId = null;
      var cx = 0, cy = 0;
      var startTime = 0;
      var moved = false;
      var TAP_MOVE = 8; // px threshold to distinguish tap from drag

      function update(tx, ty) {
        var dx = tx - cx;
        var dy = ty - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > TAP_MOVE) moved = true;
        if (dist > STICK_MAX) { dx = dx / dist * STICK_MAX; dy = dy / dist * STICK_MAX; }
        stick.knob.style.transform = 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px))';
        onUpdate(dx / STICK_MAX, dy / STICK_MAX);
      }

      function end() {
        var wasTap = onTap && !moved && (Date.now() - startTime < 250);
        touchId = null;
        stick.knob.style.transform = 'translate(-50%,-50%)';
        onEnd();
        if (wasTap) onTap();
      }

      stick.zone.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (touchId !== null) return;
        var t = e.changedTouches[0];
        var rect = stick.zone.getBoundingClientRect();
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
        touchId = t.identifier;
        startTime = Date.now();
        moved = false;
        update(t.clientX, t.clientY);
      }, { passive: false });

      stick.zone.addEventListener('touchmove', function (e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            update(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          }
        }
      }, { passive: false });

      stick.zone.addEventListener('touchend', function (e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) end();
        }
      }, { passive: false });

      stick.zone.addEventListener('touchcancel', function (e) { e.stopPropagation(); end(); });
    }

    // Left stick → WASD movement
    stickHandler(L, function (nx, ny) {
      keys['KeyW'] = ny < -(STICK_DEAD / STICK_MAX);
      keys['KeyS'] = ny > (STICK_DEAD / STICK_MAX);
      keys['KeyA'] = nx < -(STICK_DEAD / STICK_MAX);
      keys['KeyD'] = nx > (STICK_DEAD / STICK_MAX);
    }, function () {
      keys['KeyW'] = keys['KeyS'] = keys['KeyA'] = keys['KeyD'] = false;
    });

    // Right stick → camera look + tap to fire
    var rStickNX = 0, rStickNY = 0;

    stickHandler(R, function (nx, ny) {
      rStickNX = nx;
      rStickNY = ny;
    }, function () {
      rStickNX = 0;
      rStickNY = 0;
    }, function () {
      // Tap → single shot
      mouseDown = true;
      setTimeout(function () { mouseDown = false; }, 80);
    });

    // Feed right stick into mouseDX/DY every frame (30fps to match game loop)
    var LOOK_SPEED = 36;
    setInterval(function () {
      if (rStickNX !== 0 || rStickNY !== 0) {
        mouseDX += rStickNX * LOOK_SPEED;
        mouseDY += rStickNY * LOOK_SPEED;
      }
    }, 1000 / FPS_RATE);

    // --- Button touch ---
    function btnTouch(btn, action) {
      btn.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation(); action(true);
      }, { passive: false });
      btn.addEventListener('touchend', function (e) {
        e.preventDefault(); e.stopPropagation(); action(false);
      }, { passive: false });
      btn.addEventListener('touchcancel', function (e) {
        e.stopPropagation(); action(false);
      });
    }

    btnTouch(jumpBtn, function (down) {
      if (down) { keys['Space'] = true; setTimeout(function () { keys['Space'] = false; }, 100); }
    });
    btnTouch(dashBtn, function (down) {
      if (down) { keys['KeyE'] = true; setTimeout(function () { keys['KeyE'] = false; }, 100); }
    });
  }

  // ===== 28. Init =====
  generateArena();
  spawnEnemies();
  requestAnimationFrame(loop);
})();
