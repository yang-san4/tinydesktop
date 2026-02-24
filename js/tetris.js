// ===== Tetris (canvas, 120x160) =====

(function () {
  var canvas = document.getElementById('tetris-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Constants
  var COLS = 10, ROWS = 20, CELL = 8;
  var FIELD_W = COLS * CELL; // 80
  var SIDE_X = FIELD_W + 2;  // info panel x
  var W = 120, H = 160;

  // Tetrimino definitions: shape rotations as [row][col] for each rotation state
  var PIECES = {
    I: { color: '#00e5ff', dark: '#00a0b0', light: '#80f0ff',
         shapes: [
           [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
           [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
           [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
           [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
         ] },
    O: { color: '#ffe000', dark: '#b09800', light: '#fff080',
         shapes: [
           [[1,1],[1,1]],
           [[1,1],[1,1]],
           [[1,1],[1,1]],
           [[1,1],[1,1]]
         ] },
    T: { color: '#b040ff', dark: '#7020b0', light: '#d090ff',
         shapes: [
           [[0,1,0],[1,1,1],[0,0,0]],
           [[0,1,0],[0,1,1],[0,1,0]],
           [[0,0,0],[1,1,1],[0,1,0]],
           [[0,1,0],[1,1,0],[0,1,0]]
         ] },
    S: { color: '#40e040', dark: '#209020', light: '#90ff90',
         shapes: [
           [[0,1,1],[1,1,0],[0,0,0]],
           [[0,1,0],[0,1,1],[0,0,1]],
           [[0,0,0],[0,1,1],[1,1,0]],
           [[1,0,0],[1,1,0],[0,1,0]]
         ] },
    Z: { color: '#ff3030', dark: '#b01010', light: '#ff8080',
         shapes: [
           [[1,1,0],[0,1,1],[0,0,0]],
           [[0,0,1],[0,1,1],[0,1,0]],
           [[0,0,0],[1,1,0],[0,1,1]],
           [[0,1,0],[1,1,0],[1,0,0]]
         ] },
    L: { color: '#ff9020', dark: '#b06010', light: '#ffc080',
         shapes: [
           [[0,0,1],[1,1,1],[0,0,0]],
           [[0,1,0],[0,1,0],[0,1,1]],
           [[0,0,0],[1,1,1],[1,0,0]],
           [[1,1,0],[0,1,0],[0,1,0]]
         ] },
    J: { color: '#4040ff', dark: '#2020b0', light: '#8080ff',
         shapes: [
           [[1,0,0],[1,1,1],[0,0,0]],
           [[0,1,1],[0,1,0],[0,1,0]],
           [[0,0,0],[1,1,1],[0,0,1]],
           [[0,1,0],[0,1,0],[1,1,0]]
         ] }
  };

  var PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

  // SRS wall kick data (simplified)
  var KICKS_NORMAL = [
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], // 0->1
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],      // 1->2
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],      // 2->3
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]    // 3->0
  ];
  var KICKS_I = [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
  ];

  // Game state
  var board = [];
  var current = null;   // { type, rot, x, y }
  var next = null;
  var bag = [];
  var score = 0;
  var level = 1;
  var lines = 0;
  var gameOver = false;
  var dropTimer = 0;
  var lastTime = 0;
  var animFrame = 0;
  var flashRows = [];
  var flashTimer = 0;
  var running = false;

  // Sound
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    return audioCtx;
  }

  function isSoundEnabled() {
    var btn = document.getElementById('taskbar-sound');
    return btn && !btn.classList.contains('muted');
  }

  function playMove() {
    if (!isSoundEnabled()) return;
    var ac = getAudioCtx(); if (!ac) return;
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = 600;
    g.gain.setValueAtTime(0.06, ac.currentTime);
    g.gain.exponentialDecayToValueAtTime
      ? g.gain.exponentialDecayToValueAtTime(0.001, ac.currentTime + 0.05)
      : g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    osc.connect(g); g.connect(ac.destination);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.05);
  }

  function playRotate() {
    if (!isSoundEnabled()) return;
    var ac = getAudioCtx(); if (!ac) return;
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ac.currentTime + 0.06);
    g.gain.setValueAtTime(0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.connect(g); g.connect(ac.destination);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.08);
  }

  function playDrop() {
    if (!isSoundEnabled()) return;
    var ac = getAudioCtx(); if (!ac) return;
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ac.currentTime + 0.12);
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    osc.connect(g); g.connect(ac.destination);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.15);
  }

  function playClear(count) {
    if (!isSoundEnabled()) return;
    var ac = getAudioCtx(); if (!ac) return;
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < Math.min(count, 4); i++) {
      (function (idx) {
        var osc = ac.createOscillator();
        var g = ac.createGain();
        osc.type = 'square';
        var t = ac.currentTime + idx * 0.06;
        osc.frequency.setValueAtTime(notes[idx], t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(g); g.connect(ac.destination);
        osc.start(t); osc.stop(t + 0.12);
      })(i);
    }
  }

  function playGameOver() {
    if (!isSoundEnabled()) return;
    var ac = getAudioCtx(); if (!ac) return;
    var freqs = [400, 350, 300, 200];
    for (var i = 0; i < freqs.length; i++) {
      (function (idx) {
        var osc = ac.createOscillator();
        var g = ac.createGain();
        osc.type = 'sawtooth';
        var t = ac.currentTime + idx * 0.15;
        osc.frequency.setValueAtTime(freqs[idx], t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g); g.connect(ac.destination);
        osc.start(t); osc.stop(t + 0.2);
      })(i);
    }
  }

  // --- Board ---

  function clearBoard() {
    board = [];
    for (var y = 0; y < ROWS; y++) {
      board[y] = [];
      for (var x = 0; x < COLS; x++) {
        board[y][x] = null;
      }
    }
  }

  // --- Piece management ---

  function fillBag() {
    bag = PIECE_NAMES.slice();
    // Fisher-Yates shuffle
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
  }

  function nextFromBag() {
    if (bag.length === 0) fillBag();
    return bag.pop();
  }

  function getShape(type, rot) {
    return PIECES[type].shapes[rot];
  }

  function spawnPiece(type) {
    var shape = getShape(type, 0);
    return {
      type: type,
      rot: 0,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0
    };
  }

  // --- Collision ---

  function collides(type, rot, px, py) {
    var shape = getShape(type, rot);
    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        var bx = px + c, by = py + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by < 0) continue;
        if (board[by][bx]) return true;
      }
    }
    return false;
  }

  // --- Rotation with wall kicks ---

  function tryRotate() {
    var newRot = (current.rot + 1) % 4;
    var kicks = current.type === 'I' ? KICKS_I : KICKS_NORMAL;
    var kickSet = kicks[current.rot];
    for (var i = 0; i < kickSet.length; i++) {
      var dx = kickSet[i][0], dy = kickSet[i][1];
      if (!collides(current.type, newRot, current.x + dx, current.y - dy)) {
        current.rot = newRot;
        current.x += dx;
        current.y -= dy;
        return true;
      }
    }
    return false;
  }

  // --- Lock piece ---

  function lockPiece() {
    var shape = getShape(current.type, current.rot);
    var info = PIECES[current.type];
    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        var bx = current.x + c, by = current.y + r;
        if (by < 0) {
          gameOver = true;
          playGameOver();
          return;
        }
        board[by][bx] = { color: info.color, dark: info.dark, light: info.light };
      }
    }

    // Check line clears
    var cleared = [];
    for (var y = ROWS - 1; y >= 0; y--) {
      var full = true;
      for (var x = 0; x < COLS; x++) {
        if (!board[y][x]) { full = false; break; }
      }
      if (full) cleared.push(y);
    }

    if (cleared.length > 0) {
      flashRows = cleared;
      flashTimer = 0.3; // 300ms flash
      playClear(cleared.length);
    } else {
      spawnNext();
    }
  }

  function removeRows() {
    // Sort descending
    flashRows.sort(function (a, b) { return b - a; });
    for (var i = 0; i < flashRows.length; i++) {
      board.splice(flashRows[i], 1);
      var emptyRow = [];
      for (var x = 0; x < COLS; x++) emptyRow.push(null);
      board.unshift(emptyRow);
    }

    // Scoring
    var pts = [0, 100, 300, 500, 800];
    score += (pts[flashRows.length] || 0) * level;
    lines += flashRows.length;
    level = Math.floor(lines / 10) + 1;

    flashRows = [];
    spawnNext();
  }

  function spawnNext() {
    if (!next) next = nextFromBag();
    current = spawnPiece(next);
    next = nextFromBag();
    dropTimer = 0;

    // Check immediate collision = game over
    if (collides(current.type, current.rot, current.x, current.y)) {
      gameOver = true;
      playGameOver();
    }
  }

  // --- Ghost piece ---

  function getGhostY() {
    var gy = current.y;
    while (!collides(current.type, current.rot, current.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  // --- Drop speed ---

  function getDropInterval() {
    // Level 1: 1.0s, Level 10: 0.1s, linear interpolation
    var lv = Math.min(level, 10);
    return 1.0 - (lv - 1) * 0.1;
  }

  // --- Window visibility ---

  function isWindowVisible() {
    var win = document.getElementById('window-tetris');
    if (!win) return false;
    if (win.classList.contains('closed') || win.classList.contains('minimized')) return false;
    return true;
  }

  function isWindowFocused() {
    var win = document.getElementById('window-tetris');
    if (!win || !isWindowVisible()) return false;
    // Check z-index: highest among visible windows
    var allWins = document.querySelectorAll('.window:not(.closed):not(.minimized)');
    var maxZ = 0;
    for (var i = 0; i < allWins.length; i++) {
      var z = parseInt(allWins[i].style.zIndex) || 0;
      if (z > maxZ) maxZ = z;
    }
    var myZ = parseInt(win.style.zIndex) || 0;
    return myZ >= maxZ;
  }

  // --- Input ---

  document.addEventListener('keydown', function (e) {
    if (!isWindowFocused() || gameOver || !current || flashRows.length > 0) return;

    switch (e.key) {
      case 'ArrowLeft':
        if (!collides(current.type, current.rot, current.x - 1, current.y)) {
          current.x--;
          playMove();
        }
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (!collides(current.type, current.rot, current.x + 1, current.y)) {
          current.x++;
          playMove();
        }
        e.preventDefault();
        break;
      case 'ArrowUp':
        if (tryRotate()) playRotate();
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (!collides(current.type, current.rot, current.x, current.y + 1)) {
          current.y++;
          dropTimer = 0;
          score += 1;
        }
        e.preventDefault();
        break;
      case ' ':
        // Hard drop
        var dropped = 0;
        while (!collides(current.type, current.rot, current.x, current.y + 1)) {
          current.y++;
          dropped++;
        }
        score += dropped * 2;
        playDrop();
        lockPiece();
        e.preventDefault();
        break;
    }
  });

  // Click to restart on game over
  canvas.addEventListener('click', function () {
    if (gameOver) {
      startGame();
    }
  });

  // --- Game init ---

  function startGame() {
    clearBoard();
    bag = [];
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    flashRows = [];
    flashTimer = 0;
    current = null;
    next = nextFromBag();
    spawnNext();
    dropTimer = 0;
    lastTime = 0;
  }

  // --- Drawing ---

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    drawField();
    drawSidePanel();

    if (gameOver) {
      drawGameOver();
    }
  }

  function drawField() {
    // Grid lines
    ctx.fillStyle = '#111';
    for (var x = 0; x <= COLS; x++) {
      ctx.fillRect(x * CELL, 0, 1, ROWS * CELL);
    }
    for (var y = 0; y <= ROWS; y++) {
      ctx.fillRect(0, y * CELL, FIELD_W, 1);
    }

    // Board cells
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = board[r][c];
        if (cell) {
          // Check if this row is flashing
          if (flashRows.indexOf(r) !== -1) {
            var flashPhase = Math.floor(flashTimer * 10) % 2;
            if (flashPhase === 0) {
              drawCell(c * CELL, r * CELL, '#fff', '#ddd', '#fff');
            } else {
              drawCell(c * CELL, r * CELL, cell.color, cell.dark, cell.light);
            }
          } else {
            drawCell(c * CELL, r * CELL, cell.color, cell.dark, cell.light);
          }
        }
      }
    }

    // Ghost piece
    if (current && !gameOver && flashRows.length === 0) {
      var ghostY = getGhostY();
      if (ghostY !== current.y) {
        var shape = getShape(current.type, current.rot);
        var info = PIECES[current.type];
        ctx.globalAlpha = 0.25;
        for (var r = 0; r < shape.length; r++) {
          for (var c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            var px = (current.x + c) * CELL;
            var py = (ghostY + r) * CELL;
            drawCell(px, py, info.color, info.dark, info.light);
          }
        }
        ctx.globalAlpha = 1.0;
      }
    }

    // Current piece
    if (current && !gameOver && flashRows.length === 0) {
      var shape = getShape(current.type, current.rot);
      var info = PIECES[current.type];
      for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          var px = (current.x + c) * CELL;
          var py = (current.y + r) * CELL;
          if (py >= 0) {
            drawCell(px, py, info.color, info.dark, info.light);
          }
        }
      }
    }

    // Field border
    ctx.fillStyle = '#333';
    ctx.fillRect(FIELD_W, 0, 1, H);
  }

  function drawCell(x, y, color, dark, light) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    // Light edge (top, left)
    ctx.fillStyle = light;
    ctx.fillRect(x, y, CELL, 1);
    ctx.fillRect(x, y, 1, CELL);
    // Dark edge (bottom, right)
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + CELL - 1, CELL, 1);
    ctx.fillRect(x + CELL - 1, y, 1, CELL);
  }

  function drawSidePanel() {
    var px = SIDE_X;

    // "NEXT" label
    ctx.fillStyle = '#888';
    drawTinyText(px, 2, 'NEXT');

    // Next piece preview
    if (next) {
      var shape = getShape(next, 0);
      var info = PIECES[next];
      var previewCell = 5;
      var ox = px + Math.floor((38 - shape[0].length * previewCell) / 2);
      var oy = 10;
      for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          var cx = ox + c * previewCell;
          var cy = oy + r * previewCell;
          ctx.fillStyle = info.color;
          ctx.fillRect(cx + 1, cy + 1, previewCell - 2, previewCell - 2);
          ctx.fillStyle = info.light;
          ctx.fillRect(cx, cy, previewCell, 1);
          ctx.fillRect(cx, cy, 1, previewCell);
          ctx.fillStyle = info.dark;
          ctx.fillRect(cx, cy + previewCell - 1, previewCell, 1);
          ctx.fillRect(cx + previewCell - 1, cy, 1, previewCell);
        }
      }
    }

    // Score
    ctx.fillStyle = '#888';
    drawTinyText(px, 38, 'SCORE');
    ctx.fillStyle = '#fff';
    drawTinyText(px, 46, String(score));

    // Level
    ctx.fillStyle = '#888';
    drawTinyText(px, 60, 'LEVEL');
    ctx.fillStyle = '#0f0';
    drawTinyText(px, 68, String(level));

    // Lines
    ctx.fillStyle = '#888';
    drawTinyText(px, 82, 'LINES');
    ctx.fillStyle = '#ff0';
    drawTinyText(px, 90, String(lines));
  }

  // Tiny 3x5 font for side panel
  var FONT = {
    '0': [0xe,0xa,0xa,0xa,0xe], '1': [0x4,0xc,0x4,0x4,0xe],
    '2': [0xe,0x2,0xe,0x8,0xe], '3': [0xe,0x2,0x6,0x2,0xe],
    '4': [0xa,0xa,0xe,0x2,0x2], '5': [0xe,0x8,0xe,0x2,0xe],
    '6': [0xe,0x8,0xe,0xa,0xe], '7': [0xe,0x2,0x2,0x2,0x2],
    '8': [0xe,0xa,0xe,0xa,0xe], '9': [0xe,0xa,0xe,0x2,0xe],
    'A': [0x4,0xa,0xe,0xa,0xa], 'B': [0xc,0xa,0xc,0xa,0xc],
    'C': [0x6,0x8,0x8,0x8,0x6], 'D': [0xc,0xa,0xa,0xa,0xc],
    'E': [0xe,0x8,0xe,0x8,0xe], 'F': [0xe,0x8,0xe,0x8,0x8],
    'G': [0x6,0x8,0xa,0xa,0x6], 'H': [0xa,0xa,0xe,0xa,0xa],
    'I': [0xe,0x4,0x4,0x4,0xe], 'J': [0x2,0x2,0x2,0xa,0x4],
    'K': [0xa,0xa,0xc,0xa,0xa], 'L': [0x8,0x8,0x8,0x8,0xe],
    'M': [0xa,0xe,0xe,0xa,0xa], 'N': [0xa,0xe,0xe,0xa,0xa],
    'O': [0x4,0xa,0xa,0xa,0x4], 'P': [0xe,0xa,0xe,0x8,0x8],
    'Q': [0x4,0xa,0xa,0xe,0x6], 'R': [0xe,0xa,0xc,0xa,0xa],
    'S': [0x6,0x8,0x4,0x2,0xc], 'T': [0xe,0x4,0x4,0x4,0x4],
    'U': [0xa,0xa,0xa,0xa,0xe], 'V': [0xa,0xa,0xa,0xa,0x4],
    'W': [0xa,0xa,0xe,0xe,0xa], 'X': [0xa,0xa,0x4,0xa,0xa],
    'Y': [0xa,0xa,0x4,0x4,0x4], 'Z': [0xe,0x2,0x4,0x8,0xe],
    ' ': [0x0,0x0,0x0,0x0,0x0], ':': [0x0,0x4,0x0,0x4,0x0],
    '!': [0x4,0x4,0x4,0x0,0x4]
  };

  function drawTinyText(x, y, str) {
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i).toUpperCase();
      var glyph = FONT[ch];
      if (!glyph) continue;
      for (var row = 0; row < 5; row++) {
        for (var bit = 0; bit < 4; bit++) {
          if (glyph[row] & (1 << (3 - bit))) {
            ctx.fillRect(x + i * 5 + bit, y + row, 1, 1);
          }
        }
      }
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 50, FIELD_W, 60);

    ctx.fillStyle = '#ff3030';
    drawTinyText(10, 60, 'GAME');
    drawTinyText(10, 68, 'OVER');

    ctx.fillStyle = '#fff';
    drawTinyText(4, 84, 'CLICK TO');
    drawTinyText(4, 92, 'RESTART');
  }

  // --- Game loop ---

  function loop(timestamp) {
    animFrame = requestAnimationFrame(loop);

    if (!isWindowVisible()) return;

    if (lastTime === 0) lastTime = timestamp;
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Clamp dt to prevent huge jumps
    if (dt > 0.5) dt = 0.5;

    if (!gameOver && current && flashRows.length === 0) {
      dropTimer += dt;
      var interval = getDropInterval();
      if (dropTimer >= interval) {
        dropTimer -= interval;
        if (!collides(current.type, current.rot, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
    }

    // Flash animation
    if (flashRows.length > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        removeRows();
      }
    }

    draw();
  }

  // --- Start ---

  // Observe window open/close
  var win = document.getElementById('window-tetris');
  if (win) {
    new MutationObserver(function () {
      if (isWindowVisible() && !running) {
        running = true;
        startGame();
        lastTime = 0;
        animFrame = requestAnimationFrame(loop);
      }
      if (!isWindowVisible() && running) {
        running = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        animFrame = 0;
      }
    }).observe(win, { attributes: true, attributeFilter: ['class'] });
  }

  // Initial draw
  draw();
})();
