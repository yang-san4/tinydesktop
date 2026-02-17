// ===== Hourglass Widget (1-min sand timer, classic pixel art) =====

(function () {
  var canvas = document.getElementById('hourglass-widget');
  var ctx = canvas.getContext('2d');
  var W = 32, H = 32; // square canvas to avoid clipping on rotation

  ctx.imageSmoothingEnabled = false;

  // --- Classic wood/brass palette ---
  var WOOD     = '#b08030';
  var WOOD_DK  = '#805820';
  var WOOD_LT  = '#d0a050';
  var BRASS    = '#c89838';
  var GLASS    = 'rgba(180, 210, 255, 0.12)';
  var GLASS_ED = 'rgba(160, 200, 240, 0.35)';
  var SAND     = '#e8d080';
  var SAND_LT  = '#f0e0a0';
  var SAND_DK  = '#c0a858';

  // --- Timer ---
  var DURATION = 60; // seconds
  var startTime = Date.now();

  // --- Flip animation (frame-by-frame) ---
  var flipping = false;
  var flipStart = 0;
  var FLIP_ANGLES = [0, 30, 60, 90, 120, 150, 180]; // degrees
  var FLIP_FRAME_MS = 90; // ms per step

  // --- Falling sand grains ---
  var grains = [];
  var grainTimer = 0;

  // --- Helpers ---
  function px(x, y, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }
  function hline(x, y, len, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, len, 1);
  }

  // --- Glass inner bounds [left, right] inclusive ---
  function glassInner(row) {
    // Top bulb: rows 6..13
    if (row >= 6 && row <= 13) {
      var t = (row - 6) / 7;
      var hw = Math.round(6 - t * 5); // 6 -> 1
      return [16 - hw, 15 + hw];
    }
    // Neck: rows 14..17
    if (row >= 14 && row <= 17) {
      return [15, 16];
    }
    // Bottom bulb: rows 18..25
    if (row >= 18 && row <= 25) {
      var t = (row - 18) / 7;
      var hw = Math.round(1 + t * 5); // 1 -> 6
      return [16 - hw, 15 + hw];
    }
    return null;
  }

  // --- Draw wooden frame ---
  function drawFrame() {
    // Top ornament
    hline(10, 3, 12, WOOD_DK);
    // Top cap
    hline(8, 4, 16, WOOD_LT);
    hline(8, 5, 16, WOOD);
    // Brass trim
    hline(9, 5, 14, BRASS);

    // Bottom cap
    hline(8, 26, 16, WOOD);
    hline(9, 26, 14, BRASS);
    hline(8, 27, 16, WOOD_DK);
    // Bottom ornament
    hline(10, 28, 12, WOOD_DK);

    // Pillars
    for (var y = 5; y <= 26; y++) {
      px(8, y, WOOD_DK);
      px(9, y, WOOD);
      px(22, y, WOOD);
      px(23, y, WOOD_DK);
    }

    // Knob details on pillars
    px(8, 10, BRASS); px(23, 10, BRASS);
    px(8, 21, BRASS); px(23, 21, BRASS);
  }

  // --- Draw glass ---
  function drawGlass() {
    for (var y = 6; y <= 25; y++) {
      var inner = glassInner(y);
      if (!inner) continue;
      // Edges
      px(inner[0], y, GLASS_ED);
      px(inner[1], y, GLASS_ED);
      // Fill
      for (var x = inner[0] + 1; x < inner[1]; x++) {
        px(x, y, GLASS);
      }
    }
  }

  // --- Draw sand based on progress (0=full top, 1=full bottom) ---
  function drawSand(progress) {
    var topRows = 8;  // rows 6..13
    var botRows = 8;  // rows 18..25

    // Top: sand fills from bottom up, empties from top down
    var topEmpty = Math.round(progress * topRows);

    for (var y = 6 + topEmpty; y <= 13; y++) {
      var inner = glassInner(y);
      if (!inner) continue;
      for (var x = inner[0] + 1; x < inner[1]; x++) {
        px(x, y, (y === 6 + topEmpty) ? SAND_DK : SAND);
      }
    }

    // Top sand surface detail (slight mound)
    if (topEmpty > 0 && topEmpty < topRows) {
      px(15, 5 + topEmpty, SAND_DK);
      px(16, 5 + topEmpty, SAND_DK);
    }

    // Bottom: sand fills from bottom, rises upward
    var botFilled = Math.round(progress * botRows);
    var botTop = 25 - botFilled;

    for (var y = botTop + 1; y <= 25; y++) {
      var inner = glassInner(y);
      if (!inner) continue;
      for (var x = inner[0] + 1; x < inner[1]; x++) {
        px(x, y, (y === botTop + 1) ? SAND_DK : SAND);
      }
    }

    // Bottom sand mound at surface
    if (botFilled > 0 && botFilled < botRows) {
      px(15, botTop, SAND_DK);
      px(16, botTop, SAND_DK);
    }

    // Falling grains through neck
    if (progress > 0 && progress < 1) {
      for (var i = 0; i < grains.length; i++) {
        var g = grains[i];
        px(g.x | 0, g.y | 0, SAND_LT);
      }
    }
  }

  // --- Update grains ---
  function updateGrains(progress) {
    if (flipping || progress >= 1) {
      grains.length = 0;
      return;
    }

    // Spawn a grain occasionally
    grainTimer++;
    if (grainTimer >= 10) {
      grainTimer = 0;
      grains.push({
        x: 15 + Math.round(Math.random()),
        y: 13,
        vy: 0.4 + Math.random() * 0.2,
        wx: (Math.random() - 0.5) * 0.2
      });
    }

    // Update positions
    var botFilled = Math.round(progress * 8);
    var botTop = 25 - botFilled;

    for (var i = grains.length - 1; i >= 0; i--) {
      var g = grains[i];
      g.y += g.vy;
      g.x += g.wx;
      // Clamp x to neck
      if (g.y >= 14 && g.y <= 17) {
        g.x = 15 + Math.round(Math.random());
      }
      // Remove when reaching bottom sand
      if (g.y >= botTop) {
        grains.splice(i, 1);
      }
      // Remove if too many
      if (grains.length > 4) {
        grains.shift();
      }
    }
  }

  // --- Draw everything (called with optional rotation) ---
  function drawAll(progress) {
    drawGlass();
    drawSand(progress);
    drawFrame();
  }

  // --- Main loop ---
  function loop() {
    ctx.clearRect(0, 0, W, H);

    // --- Flip animation ---
    if (flipping) {
      var elapsed = Date.now() - flipStart;
      var stepIdx = Math.floor(elapsed / FLIP_FRAME_MS);

      if (stepIdx >= FLIP_ANGLES.length) {
        // Flip done, restart timer
        flipping = false;
        startTime = Date.now();
        grains.length = 0;
      } else {
        var angle = FLIP_ANGLES[stepIdx] * Math.PI / 180;

        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(angle);
        ctx.translate(-W / 2, -H / 2);
        drawAll(1);
        ctx.restore();

        requestAnimationFrame(loop);
        return;
      }
    }

    // --- Normal ---
    var elapsed = (Date.now() - startTime) / 1000;
    var progress = Math.min(elapsed / DURATION, 1);

    if (progress >= 1 && !flipping) {
      flipping = true;
      flipStart = Date.now();
      requestAnimationFrame(loop);
      return;
    }

    updateGrains(progress);
    drawAll(progress);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
