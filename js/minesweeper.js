// ===== Minesweeper (canvas, theme-aware) =====

(function () {
  var canvas = document.getElementById('minesweeper-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Constants
  var COLS = 9, ROWS = 9, CELL = 9, MINES = 10;
  var HDR = 14; // header height
  var W = COLS * CELL; // 81
  var H = HDR + ROWS * CELL; // 95

  // Number colors (1-8)
  var NUM_COLORS = [
    null,
    '#0000ff', // 1 blue
    '#008000', // 2 green
    '#ff0000', // 3 red
    '#000080', // 4 navy
    '#800000', // 5 maroon
    '#008080', // 6 teal
    '#000000', // 7 black
    '#808080'  // 8 gray
  ];

  // State
  var grid;      // -1 = mine, 0-8 = adjacent count
  var revealed;  // boolean[][]
  var flagged;   // boolean[][]
  var gameState; // 'idle' | 'playing' | 'won' | 'lost'
  var minesPlaced;
  var flagCount;
  var timer;
  var timerInterval;
  var hitX, hitY; // cell that was clicked on mine

  initGame();

  function initGame() {
    grid = [];
    revealed = [];
    flagged = [];
    for (var y = 0; y < ROWS; y++) {
      grid[y] = [];
      revealed[y] = [];
      flagged[y] = [];
      for (var x = 0; x < COLS; x++) {
        grid[y][x] = 0;
        revealed[y][x] = false;
        flagged[y][x] = false;
      }
    }
    gameState = 'idle';
    minesPlaced = false;
    flagCount = 0;
    timer = 0;
    hitX = -1;
    hitY = -1;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    draw();
  }

  function placeMines(safeX, safeY) {
    var placed = 0;
    while (placed < MINES) {
      var x = Math.floor(Math.random() * COLS);
      var y = Math.floor(Math.random() * ROWS);
      // Skip safe zone (3x3 around first click)
      if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
      if (grid[y][x] === -1) continue;
      grid[y][x] = -1;
      placed++;
    }
    // Calculate adjacency numbers
    for (var yy = 0; yy < ROWS; yy++) {
      for (var xx = 0; xx < COLS; xx++) {
        if (grid[yy][xx] === -1) continue;
        grid[yy][xx] = countAdjacentMines(xx, yy);
      }
    }
    minesPlaced = true;
  }

  function countAdjacentMines(x, y) {
    var count = 0;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        if (grid[ny][nx] === -1) count++;
      }
    }
    return count;
  }

  function reveal(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    if (revealed[y][x] || flagged[y][x]) return;
    revealed[y][x] = true;

    if (grid[y][x] === -1) {
      // Hit a mine
      hitX = x;
      hitY = y;
      gameState = 'lost';
      // Reveal all mines
      for (var yy = 0; yy < ROWS; yy++) {
        for (var xx = 0; xx < COLS; xx++) {
          if (grid[yy][xx] === -1) revealed[yy][xx] = true;
        }
      }
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      return;
    }

    // Flood fill for 0 cells
    if (grid[y][x] === 0) {
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          reveal(x + dx, y + dy);
        }
      }
    }
  }

  function checkWin() {
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (grid[y][x] !== -1 && !revealed[y][x]) return false;
      }
    }
    return true;
  }

  // --- Drawing ---

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawHeader();
    drawGrid();
  }

  function drawHeader() {
    // Background
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, W, HDR);

    // Sunken border for header
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, 1);
    ctx.fillRect(0, 0, 1, HDR);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, HDR - 1, W, 1);
    ctx.fillRect(W - 1, 0, 1, HDR);

    // Mine counter (left)
    var mineDisplay = Math.max(0, MINES - flagCount);
    drawLEDNumber(2, 2, mineDisplay);

    // Timer (right)
    drawLEDNumber(W - 22, 2, Math.min(timer, 999));

    // Face button (center)
    var faceX = Math.floor(W / 2) - 5;
    var faceY = 2;
    var faceW = 10, faceH = 10;

    // 3D button
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(faceX, faceY, faceW, 1);
    ctx.fillRect(faceX, faceY, 1, faceH);
    ctx.fillStyle = '#808080';
    ctx.fillRect(faceX, faceY + faceH - 1, faceW, 1);
    ctx.fillRect(faceX + faceW - 1, faceY, 1, faceH);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(faceX + 1, faceY + 1, faceW - 2, faceH - 2);

    // Draw face
    drawFace(faceX + 2, faceY + 2);
  }

  function drawLEDNumber(x, y, num) {
    // Dark background for LED display
    ctx.fillStyle = '#300000';
    ctx.fillRect(x, y, 20, 10);

    // Sunken border
    ctx.fillStyle = '#808080';
    ctx.fillRect(x, y, 20, 1);
    ctx.fillRect(x, y, 1, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y + 9, 20, 1);
    ctx.fillRect(x + 19, y, 1, 10);

    var str = String(Math.floor(num)).padStart(3, '0');
    ctx.fillStyle = '#ff0000';
    for (var i = 0; i < 3; i++) {
      drawSmallDigit(x + 2 + i * 6, y + 2, parseInt(str[i]));
    }
  }

  function drawSmallDigit(x, y, d) {
    // 4x6 pixel digits
    var digits = [
      [0xe,0xa,0xa,0xa,0xa,0xe], // 0
      [0x4,0xc,0x4,0x4,0x4,0xe], // 1
      [0xe,0x2,0xe,0x8,0x8,0xe], // 2
      [0xe,0x2,0x6,0x2,0x2,0xe], // 3
      [0xa,0xa,0xe,0x2,0x2,0x2], // 4
      [0xe,0x8,0xe,0x2,0x2,0xe], // 5
      [0xe,0x8,0xe,0xa,0xa,0xe], // 6
      [0xe,0x2,0x2,0x2,0x2,0x2], // 7
      [0xe,0xa,0xe,0xa,0xa,0xe], // 8
      [0xe,0xa,0xe,0x2,0x2,0xe]  // 9
    ];
    var rows = digits[d];
    for (var r = 0; r < 6; r++) {
      for (var c = 0; c < 4; c++) {
        if (rows[r] & (1 << (3 - c))) {
          ctx.fillRect(x + c, y + r, 1, 1);
        }
      }
    }
  }

  function drawFace(x, y) {
    // 6x6 pixel face
    if (gameState === 'lost') {
      // Dead face: X eyes, frown
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x, y, 6, 6);
      ctx.fillStyle = '#000000';
      // X eyes
      ctx.fillRect(x + 1, y + 1, 1, 1);
      ctx.fillRect(x + 4, y + 1, 1, 1);
      ctx.fillRect(x + 1, y + 2, 1, 1);
      ctx.fillRect(x + 4, y + 2, 1, 1);
      // Frown
      ctx.fillRect(x + 1, y + 5, 1, 1);
      ctx.fillRect(x + 2, y + 4, 2, 1);
      ctx.fillRect(x + 4, y + 5, 1, 1);
    } else if (gameState === 'won') {
      // Cool face: sunglasses, smile
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x, y, 6, 6);
      ctx.fillStyle = '#000000';
      // Sunglasses
      ctx.fillRect(x, y + 1, 6, 1);
      ctx.fillRect(x, y + 2, 2, 1);
      ctx.fillRect(x + 4, y + 2, 2, 1);
      // Smile
      ctx.fillRect(x + 1, y + 4, 1, 1);
      ctx.fillRect(x + 2, y + 5, 2, 1);
      ctx.fillRect(x + 4, y + 4, 1, 1);
    } else {
      // Normal face: dot eyes, smile
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x, y, 6, 6);
      ctx.fillStyle = '#000000';
      // Eyes
      ctx.fillRect(x + 1, y + 1, 1, 1);
      ctx.fillRect(x + 4, y + 1, 1, 1);
      // Smile
      ctx.fillRect(x + 1, y + 4, 1, 1);
      ctx.fillRect(x + 2, y + 5, 2, 1);
      ctx.fillRect(x + 4, y + 4, 1, 1);
    }
  }

  function drawGrid() {
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var px = x * CELL;
        var py = HDR + y * CELL;

        if (!revealed[y][x]) {
          // Unrevealed cell - 3D raised button
          ctx.fillStyle = '#c0c0c0';
          ctx.fillRect(px, py, CELL, CELL);
          // Light edges (top, left)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px, py, CELL, 1);
          ctx.fillRect(px, py, 1, CELL);
          // Dark edges (bottom, right)
          ctx.fillStyle = '#808080';
          ctx.fillRect(px, py + CELL - 1, CELL, 1);
          ctx.fillRect(px + CELL - 1, py, 1, CELL);

          if (flagged[y][x]) {
            drawFlag(px, py);
          }
        } else if (grid[y][x] === -1) {
          // Mine
          if (x === hitX && y === hitY) {
            ctx.fillStyle = '#ff0000'; // hit mine = red bg
          } else {
            ctx.fillStyle = '#c0c0c0';
          }
          ctx.fillRect(px, py, CELL, CELL);
          // Flat border
          ctx.fillStyle = '#808080';
          ctx.fillRect(px, py, CELL, 1);
          ctx.fillRect(px, py, 1, CELL);
          drawMine(px, py);
        } else {
          // Revealed number or empty
          ctx.fillStyle = '#c0c0c0';
          ctx.fillRect(px, py, CELL, CELL);
          // Sunken border
          ctx.fillStyle = '#808080';
          ctx.fillRect(px, py, CELL, 1);
          ctx.fillRect(px, py, 1, CELL);

          if (grid[y][x] > 0) {
            drawNumber(px, py, grid[y][x]);
          }
        }
      }
    }
  }

  function drawFlag(px, py) {
    // Flag pole
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 4, py + 2, 1, 5);
    // Flag (red triangle)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(px + 2, py + 2, 2, 1);
    ctx.fillRect(px + 3, py + 3, 1, 1);
    // Base
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 3, py + 7, 3, 1);
  }

  function drawMine(px, py) {
    // Center dot
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 3, py + 3, 3, 3);
    // Spikes
    ctx.fillRect(px + 4, py + 2, 1, 1);
    ctx.fillRect(px + 4, py + 6, 1, 1);
    ctx.fillRect(px + 2, py + 4, 1, 1);
    ctx.fillRect(px + 6, py + 4, 1, 1);
    // Shine
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 3, py + 3, 1, 1);
  }

  function drawNumber(px, py, n) {
    ctx.fillStyle = NUM_COLORS[n] || '#000000';
    // 3x5 pixel mini digits centered in 9x9 cell
    var ox = px + 3, oy = py + 2;
    var patterns = {
      1: [[1,0],[1,1],[1,2],[1,3],[1,4],[0,1]],
      2: [[0,0],[1,0],[2,0],[2,1],[0,2],[1,2],[2,2],[0,3],[0,4],[1,4],[2,4]],
      3: [[0,0],[1,0],[2,0],[2,1],[0,2],[1,2],[2,2],[2,3],[0,4],[1,4],[2,4]],
      4: [[0,0],[0,1],[0,2],[1,2],[2,2],[2,0],[2,1],[2,3],[2,4]],
      5: [[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[2,2],[2,3],[0,4],[1,4],[2,4]],
      6: [[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[2,2],[0,3],[2,3],[0,4],[1,4],[2,4]],
      7: [[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4]],
      8: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[0,3],[2,3],[0,4],[1,4],[2,4]]
    };
    var pts = patterns[n];
    if (pts) {
      for (var i = 0; i < pts.length; i++) {
        ctx.fillRect(ox + pts[i][0], oy + pts[i][1], 1, 1);
      }
    }
  }

  // --- Input ---

  function getCellFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top) * scaleY;
    return { mx: mx, my: my };
  }

  canvas.addEventListener('click', function (e) {
    var pos = getCellFromEvent(e);

    // Check face button click
    var faceX = Math.floor(W / 2) - 5;
    if (pos.mx >= faceX && pos.mx < faceX + 10 && pos.my >= 2 && pos.my < 12) {
      initGame();
      return;
    }

    if (gameState === 'lost' || gameState === 'won') return;

    // Grid click
    if (pos.my < HDR) return;
    var cx = Math.floor(pos.mx / CELL);
    var cy = Math.floor((pos.my - HDR) / CELL);
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return;
    if (flagged[cy][cx]) return;

    // First click - place mines
    if (gameState === 'idle') {
      placeMines(cx, cy);
      gameState = 'playing';
      timerInterval = setInterval(function () {
        if (gameState === 'playing') {
          timer = Math.min(timer + 1, 999);
          draw();
        }
      }, 1000);
    }

    reveal(cx, cy);

    if (gameState !== 'lost' && checkWin()) {
      gameState = 'won';
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
    }

    draw();
  });

  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (gameState === 'lost' || gameState === 'won') return;

    var pos = getCellFromEvent(e);
    if (pos.my < HDR) return;
    var cx = Math.floor(pos.mx / CELL);
    var cy = Math.floor((pos.my - HDR) / CELL);
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return;
    if (revealed[cy][cx]) return;

    flagged[cy][cx] = !flagged[cy][cx];
    flagCount += flagged[cy][cx] ? 1 : -1;
    draw();
  });

  // --- Theme observer ---
  new MutationObserver(function () { draw(); })
    .observe(document.getElementById('screen'), { attributes: true, attributeFilter: ['class'] });
})();
