// ===== 3D Maze FPS (Raycasting, theme-aware) =====

(function () {
  var canvas = document.getElementById('maze-canvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;   // 120
  var H = canvas.height;  // 90

  ctx.imageSmoothingEnabled = false;

  // ----- Constants -----
  var FOV = Math.PI / 3;          // 60 degrees
  var HALF_FOV = FOV / 2;
  var MAX_DEPTH = 20;
  var MOVE_SPEED = 2.5;
  var TURN_SPEED = 2.0;
  var COLLISION_MARGIN = 0.25;
  var WALL_HEIGHT_SCALE = 40;
  var MAZE_SIZE = 13;
  var GOAL_X = MAZE_SIZE - 2;     // 11
  var GOAL_Y = MAZE_SIZE - 2;     // 11
  var BRICK_ROWS = 4;
  var BRICK_COLS = 3;
  var depthBuffer = new Array(W);

  // ----- Theme palette -----
  function getPalette() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return {
      ceiling: '#060510', floor: '#0f0818',
      wallNS: '#8a2020', wallEW: '#5a1010',
      goal: '#c8a84e',
      miniWall: '#3a2830', miniPath: '#100818',
      miniPlayer: '#c8372d', miniGoal: '#c8a84e'
    };
    if (scr.classList.contains('theme-wood')) return {
      ceiling: '#0a0804', floor: '#1a1408',
      wallNS: '#c8a050', wallEW: '#806828',
      goal: '#e0d0a0',
      miniWall: '#4a3828', miniPath: '#201810',
      miniPlayer: '#e0d0a0', miniGoal: '#e0d0a0'
    };
    if (scr.classList.contains('theme-mac')) return {
      ceiling: '#444444', floor: '#666666',
      wallNS: '#cccccc', wallEW: '#999999',
      goal: '#ffffff',
      miniWall: '#888888', miniPath: '#444444',
      miniPlayer: '#ffffff', miniGoal: '#ffffff'
    };
    if (scr.classList.contains('theme-osx')) return {
      ceiling: '#1a3050', floor: '#2a4060',
      wallNS: '#5a98d0', wallEW: '#3a70a8',
      goal: '#5ab4f0',
      miniWall: '#5a88b0', miniPath: '#1a3050',
      miniPlayer: '#f5736e', miniGoal: '#5ab4f0'
    };
    // Vapor (default)
    return {
      ceiling: '#0a0520', floor: '#150a30',
      wallNS: '#b967ff', wallEW: '#7030a0',
      goal: '#00fff0',
      miniWall: '#3a3a5a', miniPath: '#1a0a3e',
      miniPlayer: '#ff71ce', miniGoal: '#00fff0'
    };
  }

  // ----- Maze Generation (DFS Recursive Backtracker) -----
  var maze = [];

  function generateMaze() {
    // Init all walls
    maze = [];
    for (var i = 0; i < MAZE_SIZE; i++) {
      maze[i] = [];
      for (var j = 0; j < MAZE_SIZE; j++) {
        maze[i][j] = 1; // wall
      }
    }

    // Carve passages using DFS (iterative to avoid stack overflow)
    var stack = [];
    var startX = 1, startY = 1;
    maze[startY][startX] = 0;
    stack.push([startX, startY]);

    while (stack.length > 0) {
      var current = stack[stack.length - 1];
      var cx = current[0], cy = current[1];

      // Find unvisited neighbors (2 cells away)
      var neighbors = [];
      var dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
      for (var d = 0; d < dirs.length; d++) {
        var nx = cx + dirs[d][0];
        var ny = cy + dirs[d][1];
        if (nx > 0 && nx < MAZE_SIZE - 1 && ny > 0 && ny < MAZE_SIZE - 1 && maze[ny][nx] === 1) {
          neighbors.push([nx, ny, dirs[d][0], dirs[d][1]]);
        }
      }

      if (neighbors.length > 0) {
        var chosen = neighbors[(Math.random() * neighbors.length) | 0];
        // Carve the wall between
        maze[cy + chosen[3] / 2][cx + chosen[2] / 2] = 0;
        maze[chosen[1]][chosen[0]] = 0;
        stack.push([chosen[0], chosen[1]]);
      } else {
        stack.pop();
      }
    }

    // Ensure goal is open
    maze[GOAL_Y][GOAL_X] = 0;
  }

  // ----- Player -----
  var player = { x: 1.5, y: 1.5, angle: 0 };

  function resetPlayer() {
    player.x = 1.5;
    player.y = 1.5;
    player.angle = 0;
  }

  // ----- Input -----
  var keys = {};

  document.addEventListener('keydown', function (e) {
    if (!isMazeActive()) return;
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  function isMazeActive() {
    var win = document.getElementById('window-maze');
    if (!win || win.classList.contains('closed') || win.classList.contains('minimized')) return false;

    // Check if maze window has highest z-index among all windows/widgets
    var allItems = document.querySelectorAll('.window:not(.closed):not(.minimized), .widget:not(.closed):not(.minimized)');
    var maxZ = 0;
    var mazeZ = parseInt(win.style.zIndex) || 0;
    allItems.forEach(function (el) {
      var z = parseInt(el.style.zIndex) || 0;
      if (z > maxZ) maxZ = z;
    });
    return mazeZ >= maxZ;
  }

  // ----- Collision -----
  function isWall(x, y) {
    var mx = x | 0;
    var my = y | 0;
    if (mx < 0 || mx >= MAZE_SIZE || my < 0 || my >= MAZE_SIZE) return true;
    return maze[my][mx] === 1;
  }

  function handleInput(dt) {
    if (!isMazeActive()) return;

    var moved = false;
    var dx = 0, dy = 0;

    // Rotation
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.angle -= TURN_SPEED * dt;
      moved = true;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.angle += TURN_SPEED * dt;
      moved = true;
    }

    // Forward/backward
    var moveX = Math.cos(player.angle);
    var moveY = Math.sin(player.angle);

    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      dx += moveX * MOVE_SPEED * dt;
      dy += moveY * MOVE_SPEED * dt;
      moved = true;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      dx -= moveX * MOVE_SPEED * dt;
      dy -= moveY * MOVE_SPEED * dt;
      moved = true;
    }

    // Axis-separated collision with slide
    if (dx !== 0) {
      var newX = player.x + dx;
      var m = COLLISION_MARGIN;
      if (!isWall(newX - m, player.y - m) && !isWall(newX + m, player.y - m) &&
          !isWall(newX - m, player.y + m) && !isWall(newX + m, player.y + m)) {
        player.x = newX;
      }
    }
    if (dy !== 0) {
      var newY = player.y + dy;
      var m = COLLISION_MARGIN;
      if (!isWall(player.x - m, newY - m) && !isWall(player.x + m, newY - m) &&
          !isWall(player.x - m, newY + m) && !isWall(player.x + m, newY + m)) {
        player.y = newY;
      }
    }
  }

  // ----- Raycasting (DDA) -----
  function castRay(angle) {
    var sinA = Math.sin(angle);
    var cosA = Math.cos(angle);

    var mapX = player.x | 0;
    var mapY = player.y | 0;

    var deltaDistX = Math.abs(cosA) < 1e-10 ? 1e10 : Math.abs(1 / cosA);
    var deltaDistY = Math.abs(sinA) < 1e-10 ? 1e10 : Math.abs(1 / sinA);

    var stepX, stepY;
    var sideDistX, sideDistY;

    if (cosA < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.x) * deltaDistX;
    }

    if (sinA < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.y) * deltaDistY;
    }

    // DDA step
    var side = 0; // 0 = EW wall, 1 = NS wall
    for (var i = 0; i < 64; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      if (mapX < 0 || mapX >= MAZE_SIZE || mapY < 0 || mapY >= MAZE_SIZE) break;
      if (maze[mapY][mapX] === 1) {
        var perpDist;
        if (side === 0) {
          perpDist = sideDistX - deltaDistX;
        } else {
          perpDist = sideDistY - deltaDistY;
        }
        var wallX;
        if (side === 0) {
          wallX = player.y + perpDist * sinA;
        } else {
          wallX = player.x + perpDist * cosA;
        }
        wallX = wallX - Math.floor(wallX);
        return { dist: perpDist, side: side, mapX: mapX, mapY: mapY, wallX: wallX };
      }
    }

    return { dist: MAX_DEPTH, side: 0, mapX: mapX, mapY: mapY, wallX: 0 };
  }

  // ----- Color shading (distance fog) -----
  function shadeColor(hex, shade) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = (r * shade) | 0;
    g = (g * shade) | 0;
    b = (b * shade) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ----- Render scene -----
  function renderScene(p) {
    // Ceiling
    ctx.fillStyle = p.ceiling;
    ctx.fillRect(0, 0, W, H / 2);

    // Floor
    ctx.fillStyle = p.floor;
    ctx.fillRect(0, H / 2, W, H / 2);

    // Cast rays for each column
    for (var col = 0; col < W; col++) {
      var rayAngle = player.angle - HALF_FOV + (col / W) * FOV;
      var hit = castRay(rayAngle);

      var dist = hit.dist;
      if (dist < 0.1) dist = 0.1;
      depthBuffer[col] = dist;

      var wallHeight = WALL_HEIGHT_SCALE / dist;
      var drawStart = ((H - wallHeight) / 2) | 0;
      var drawEnd = ((H + wallHeight) / 2) | 0;
      if (drawStart < 0) drawStart = 0;
      if (drawEnd > H) drawEnd = H;

      // Shade by distance
      var shade = 1 - dist / MAX_DEPTH;
      if (shade < 0) shade = 0;

      // Wall color
      var isGoal = (hit.mapX === GOAL_X && hit.mapY === GOAL_Y);
      var wallColor;
      if (isGoal) {
        wallColor = p.goal;
      } else {
        wallColor = hit.side === 1 ? p.wallNS : p.wallEW;
      }

      var wallPxH = drawEnd - drawStart;

      // Draw base wall strip
      ctx.fillStyle = shadeColor(wallColor, shade);
      ctx.fillRect(col, drawStart, 1, wallPxH);

      // Brick texture (skip for goal walls and tiny walls)
      if (wallPxH > 4 && !isGoal) {
        var mortarStyle = shadeColor(wallColor, shade * 0.3);

        // Horizontal mortar lines
        ctx.fillStyle = mortarStyle;
        for (var br = 1; br < BRICK_ROWS; br++) {
          var my = (drawStart + (br / BRICK_ROWS) * wallHeight) | 0;
          if (my >= drawStart && my < drawEnd) {
            ctx.fillRect(col, my, 1, 1);
          }
        }

        // Vertical mortar lines (per brick row, with half-brick offset)
        if (wallPxH > 6) {
          for (var br = 0; br < BRICK_ROWS; br++) {
            var fracX = (hit.wallX * BRICK_COLS + (br % 2) * 0.5) % 1;
            if (fracX < 0.1 || fracX > 0.9) {
              var rowTop = (drawStart + (br / BRICK_ROWS) * wallHeight) | 0;
              var rowBot = (drawStart + ((br + 1) / BRICK_ROWS) * wallHeight) | 0;
              var segTop = Math.max(drawStart, rowTop);
              var segBot = Math.min(drawEnd, rowBot);
              if (segBot > segTop) {
                ctx.fillStyle = mortarStyle;
                ctx.fillRect(col, segTop, 1, segBot - segTop);
              }
            }
          }
        }
      }
    }
  }

  // ----- Goal check -----
  var showWin = false;
  var winTimer = 0;

  function checkGoal() {
    if (showWin) return;
    var dx = player.x - (GOAL_X + 0.5);
    var dy = player.y - (GOAL_Y + 0.5);
    if (dx * dx + dy * dy < 0.6 * 0.6) {
      showWin = true;
      winTimer = 2.0; // show for 2 seconds
    }
  }

  // ----- Minimap -----
  var MINI_SIZE = 26;
  var MINI_X = W - MINI_SIZE - 2;
  var MINI_Y = 2;

  function renderMinimap(p) {
    var cellSize = MINI_SIZE / MAZE_SIZE;

    // Background
    ctx.fillStyle = p.miniPath;
    ctx.fillRect(MINI_X, MINI_Y, MINI_SIZE, MINI_SIZE);

    // Walls
    ctx.fillStyle = p.miniWall;
    for (var my = 0; my < MAZE_SIZE; my++) {
      for (var mx = 0; mx < MAZE_SIZE; mx++) {
        if (maze[my][mx] === 1) {
          ctx.fillRect(
            (MINI_X + mx * cellSize) | 0,
            (MINI_Y + my * cellSize) | 0,
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }

    // Goal
    ctx.fillStyle = p.miniGoal;
    ctx.fillRect(
      (MINI_X + GOAL_X * cellSize) | 0,
      (MINI_Y + GOAL_Y * cellSize) | 0,
      Math.ceil(cellSize),
      Math.ceil(cellSize)
    );

    // Player dot
    ctx.fillStyle = p.miniPlayer;
    var px = (MINI_X + player.x * cellSize) | 0;
    var py = (MINI_Y + player.y * cellSize) | 0;
    ctx.fillRect(px, py, 2, 2);

    // Player direction line
    var dirX = Math.cos(player.angle) * 3;
    var dirY = Math.sin(player.angle) * 3;
    ctx.fillRect((px + dirX) | 0, (py + dirY) | 0, 1, 1);
  }

  // ----- Goal Flag (3D sprite) -----
  function renderFlag(p) {
    var flagWorldX = GOAL_X + 0.5;
    var flagWorldY = GOAL_Y + 0.5;

    var dx = flagWorldX - player.x;
    var dy = flagWorldY - player.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.3 || dist > MAX_DEPTH) return;

    // Angle to flag relative to player view
    var angleToFlag = Math.atan2(dy, dx);
    var relAngle = angleToFlag - player.angle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    if (Math.abs(relAngle) > HALF_FOV) return;

    // Project to screen
    var screenX = ((0.5 + relAngle / FOV) * W) | 0;

    // Size based on distance
    var spriteScale = WALL_HEIGHT_SCALE / dist;
    var poleHeight = (spriteScale * 0.85) | 0;
    var flagW = Math.max(2, (spriteScale * 0.35) | 0);
    var flagH = Math.max(2, (spriteScale * 0.25) | 0);

    var baseY = ((H + spriteScale) / 2) | 0;
    var poleTop = baseY - poleHeight;

    var shade = Math.max(0, 1 - dist / MAX_DEPTH);

    // Draw pole
    if (screenX >= 0 && screenX < W && depthBuffer[screenX] > dist) {
      ctx.fillStyle = shadeColor('#aaaaaa', shade);
      var ptop = Math.max(0, poleTop);
      var pbot = Math.min(H, baseY);
      if (pbot > ptop) ctx.fillRect(screenX, ptop, 1, pbot - ptop);

      // Ball at top
      ctx.fillStyle = shadeColor(p.goal, shade);
      if (poleTop - 1 >= 0) ctx.fillRect(screenX, poleTop - 1, 1, 1);
    }

    // Draw flag cloth
    var flagTop = poleTop;
    var flagBot = poleTop + flagH;
    for (var fx = screenX + 1; fx < screenX + 1 + flagW && fx < W; fx++) {
      if (fx < 0) continue;
      if (depthBuffer[fx] > dist) {
        // Triangular taper: narrower toward the right
        var frac = (fx - screenX) / flagW;
        var taperH = Math.max(1, (flagH * (1 - frac * 0.4)) | 0);
        var ft = Math.max(0, flagTop);
        var fb = Math.min(H, flagTop + taperH);
        if (fb > ft) {
          ctx.fillStyle = shadeColor(p.goal, shade * (0.85 + frac * 0.15));
          ctx.fillRect(fx, ft, 1, fb - ft);
        }
      }
    }
  }

  // ----- HUD -----
  function renderHUD(p, dt) {
    if (showWin) {
      winTimer -= dt;
      // Flash effect
      var alpha = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.goal;
      ctx.font = '7px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('YOU WIN!', W / 2, H / 2 - 2);
      ctx.restore();

      if (winTimer <= 0) {
        showWin = false;
        generateMaze();
        resetPlayer();
      }
    }
  }

  // ----- Game Loop (30fps) -----
  var FPS = 30;
  var frameDuration = 1000 / FPS;
  var lastFrame = 0;
  var lastTime = 0;

  function loop(t) {
    requestAnimationFrame(loop);

    if (t - lastFrame < frameDuration) return;
    lastFrame = t;

    var dt = (t - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // cap delta time
    lastTime = t;

    handleInput(dt);
    checkGoal();

    var p = getPalette();
    ctx.clearRect(0, 0, W, H);
    renderScene(p);
    renderFlag(p);
    renderMinimap(p);
    renderHUD(p, dt);
  }

  // ----- Init -----
  generateMaze();
  resetPlayer();
  requestAnimationFrame(loop);
})();
