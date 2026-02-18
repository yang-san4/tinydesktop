// ===== Desktop Wallpaper (pixel art, theme-aware) =====
// Renders at 110x77 (1/4 scale) for chunky pixel look

(function () {
  var canvas = document.getElementById('desktop-wallpaper');
  var ctx = canvas.getContext('2d');
  var W = 110, H = 77;
  ctx.imageSmoothingEnabled = false;

  function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
  function hline(x, y, l, c) { ctx.fillStyle = c; ctx.fillRect(x, y, l, 1); }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // Seeded random for consistent wallpaper
  var seed = 42;
  function srand(s) { seed = s; }
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // ----- Filled circle (midpoint) -----
  function fillCircle(cx, cy, r, c) {
    ctx.fillStyle = c;
    for (var y = -r; y <= r; y++) {
      var hw = Math.round(Math.sqrt(r * r - y * y));
      ctx.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
    }
  }

  // ==================================================
  //  JAPANESE (和風) - Moon, mountains, sakura
  // ==================================================
  function drawJapanese() {
    srand(77);

    // Sky gradient (brighter twilight)
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#141830');
    grad.addColorStop(0.4, '#1a2848');
    grad.addColorStop(0.7, '#1e3050');
    grad.addColorStop(1, '#182840');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (var i = 0; i < 15; i++) {
      px(Math.floor(rand() * W), Math.floor(rand() * 35), '#e0c868');
    }
    // Dimmer stars
    for (var i = 0; i < 10; i++) {
      px(Math.floor(rand() * W), Math.floor(rand() * 40), '#686080');
    }

    // Moon (large, bright)
    fillCircle(88, 16, 10, '#f0e8d0');
    fillCircle(88, 16, 9, '#f8f0e0');
    // Moon glow
    fillCircle(88, 16, 13, 'rgba(248, 240, 210, 0.08)');
    // Moon craters (subtle)
    px(85, 14, '#e8e0c8'); px(90, 18, '#e8e0c8'); px(87, 19, '#e8e0c8');

    // Far mountains
    ctx.fillStyle = '#252048';
    ctx.beginPath();
    ctx.moveTo(0, 55);
    ctx.lineTo(8, 42); ctx.lineTo(18, 48); ctx.lineTo(30, 38);
    ctx.lineTo(42, 44); ctx.lineTo(55, 36); ctx.lineTo(65, 42);
    ctx.lineTo(78, 34); ctx.lineTo(88, 40); ctx.lineTo(100, 38);
    ctx.lineTo(110, 44); ctx.lineTo(110, 55);
    ctx.closePath();
    ctx.fill();

    // Mid mountains
    ctx.fillStyle = '#302850';
    ctx.beginPath();
    ctx.moveTo(0, 58);
    ctx.lineTo(10, 48); ctx.lineTo(22, 52); ctx.lineTo(35, 44);
    ctx.lineTo(50, 50); ctx.lineTo(60, 42); ctx.lineTo(72, 48);
    ctx.lineTo(85, 40); ctx.lineTo(95, 46); ctx.lineTo(110, 50);
    ctx.lineTo(110, 58);
    ctx.closePath();
    ctx.fill();

    // Near mountains
    ctx.fillStyle = '#3a3058';
    ctx.beginPath();
    ctx.moveTo(0, 62);
    ctx.lineTo(15, 52); ctx.lineTo(28, 56); ctx.lineTo(40, 48);
    ctx.lineTo(55, 54); ctx.lineTo(68, 50); ctx.lineTo(80, 55);
    ctx.lineTo(95, 48); ctx.lineTo(110, 54);
    ctx.lineTo(110, 62);
    ctx.closePath();
    ctx.fill();

    // Ground / mist
    var grd = ctx.createLinearGradient(0, 58, 0, H);
    grd.addColorStop(0, '#302850');
    grd.addColorStop(1, '#1a1830');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 58, W, H - 58);

    // Torii gate (visible red)
    var TG = '#8a2828';
    var TH = '#a83838';
    // Pillars
    rect(18, 50, 1, 12, TG);
    rect(26, 50, 1, 12, TG);
    // Top beam (kasagi)
    hline(16, 49, 13, TH);
    hline(16, 50, 13, TG);
    // Lower beam (nuki)
    hline(18, 53, 9, TG);
    // Highlight on top beam
    hline(17, 49, 11, TH);

    // Sakura petals scattered in sky
    var petalColors = ['#d84848', '#e86068', '#f0b0b0', '#e06878', '#e88898'];
    for (var i = 0; i < 25; i++) {
      var sx = Math.floor(rand() * W);
      var sy = Math.floor(rand() * 58);
      px(sx, sy, petalColors[Math.floor(rand() * petalColors.length)]);
    }
    // Cluster near moon
    for (var i = 0; i < 8; i++) {
      var sx = 75 + Math.floor(rand() * 25);
      var sy = 5 + Math.floor(rand() * 20);
      px(sx, sy, petalColors[Math.floor(rand() * petalColors.length)]);
    }

    // Water reflection at bottom
    ctx.fillStyle = '#1a2840';
    ctx.fillRect(0, 65, W, H - 65);
    // Moon reflection (brighter)
    for (var i = 0; i < 6; i++) {
      var rx = 85 + Math.floor(rand() * 8) - 4;
      var ry = 66 + i * 2;
      ctx.fillStyle = 'rgba(248, 240, 220, 0.12)';
      ctx.fillRect(rx, ry, 3 + Math.floor(rand() * 4), 1);
    }

    // Ripples
    for (var i = 0; i < 5; i++) {
      var rx = Math.floor(rand() * W);
      var ry = 66 + Math.floor(rand() * 10);
      hline(rx, ry, 2 + Math.floor(rand() * 4), '#283850');
    }
  }

  // ==================================================
  //  WOOD (Mokume) - Sunny forest, warm daylight
  // ==================================================
  function drawWood() {
    srand(99);

    // Sky gradient (clear warm day)
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#4a80b0');
    grad.addColorStop(0.3, '#6098c0');
    grad.addColorStop(0.6, '#88b0c8');
    grad.addColorStop(1, '#a0c0b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sun
    fillCircle(90, 14, 7, '#f0e0a0');
    fillCircle(90, 14, 6, '#f8ebb0');
    // Sun rays (subtle)
    for (var i = 0; i < 8; i++) {
      var rx = 84 + Math.floor(rand() * 14);
      var ry = 6 + Math.floor(rand() * 16);
      px(rx, ry, '#f8f0c0');
    }

    // Clouds
    var cloudY = 8;
    hline(14, cloudY, 8, '#e8e8e8');
    hline(12, cloudY + 1, 12, '#f0f0f0');
    hline(13, cloudY + 2, 10, '#e8e8e8');

    hline(50, cloudY + 4, 6, '#e8e8e8');
    hline(48, cloudY + 5, 10, '#f0f0f0');
    hline(49, cloudY + 6, 8, '#e8e8e8');

    // Distant treeline (blue-green haze)
    for (var x = 0; x < W; x += 3) {
      var th = 8 + Math.floor(rand() * 8);
      var ty = 44 - th;
      for (var r = 0; r < th; r++) {
        var tw = Math.floor(r * 0.5) + 1;
        hline(x + 1 - tw, ty + r, tw * 2 + 1, '#4a7848');
      }
    }

    // Rolling hills / ground
    var grd = ctx.createLinearGradient(0, 42, 0, H);
    grd.addColorStop(0, '#5a8838');
    grd.addColorStop(0.3, '#4a7830');
    grd.addColorStop(0.7, '#3a6828');
    grd.addColorStop(1, '#2a5020');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 45, W, H - 45);

    // Hill contour
    ctx.fillStyle = '#5a8838';
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(20, 44); ctx.lineTo(40, 46); ctx.lineTo(60, 42);
    ctx.lineTo(80, 45); ctx.lineTo(100, 43); ctx.lineTo(110, 46);
    ctx.lineTo(110, 50); ctx.lineTo(0, 50);
    ctx.closePath();
    ctx.fill();

    // Mid trees (sunlit)
    var treePositions = [12, 35, 58, 82, 100];
    for (var t = 0; t < treePositions.length; t++) {
      var tx = treePositions[t];
      var treeH = 16 + Math.floor(rand() * 8);
      var baseY = 48 + Math.floor(rand() * 4);
      var trunkH = 5 + Math.floor(rand() * 3);

      // Trunk (warm brown)
      rect(tx, baseY - trunkH, 2, trunkH + 2, '#6a4820');
      px(tx + 2, baseY - trunkH + 2, '#5a3818');

      // Canopy (layered, sunlit greens)
      var canopyBase = baseY - trunkH;
      var greens = ['#5a9838', '#4a8830', '#3a7828'];
      for (var layer = 0; layer < 3; layer++) {
        var layerH = treeH / 3;
        var startY = canopyBase - treeH + layer * layerH;
        for (var r = 0; r < layerH; r++) {
          var w = Math.floor(r * 0.8) + 1;
          hline(tx + 1 - w, Math.floor(startY + r), w * 2 + 1, greens[layer]);
        }
      }

      // Sunlit highlights (left-top side)
      var hlY = canopyBase - treeH + 3;
      px(tx - 1, hlY + 1, '#80c050');
      px(tx, hlY, '#80c050');
      px(tx + 1, hlY + 2, '#70b040');
    }

    // Foreground grass tufts
    for (var i = 0; i < 18; i++) {
      var gx = Math.floor(rand() * W);
      var gy = 54 + Math.floor(rand() * 16);
      hline(gx, gy, 2 + Math.floor(rand() * 3), '#3a6828');
      px(gx + 1, gy - 1, '#4a8838');
    }

    // Wildflowers
    var flowerColors = ['#e8d060', '#e0a040', '#f0e080', '#d0b050'];
    for (var i = 0; i < 8; i++) {
      var fx = Math.floor(rand() * W);
      var fy = 56 + Math.floor(rand() * 14);
      px(fx, fy, flowerColors[Math.floor(rand() * flowerColors.length)]);
    }

    // Mushrooms (warm tones)
    var mushColors = ['#c8a050', '#a06830', '#d0b060'];
    for (var i = 0; i < 3; i++) {
      var mx = 8 + Math.floor(rand() * (W - 16));
      var my = 58 + Math.floor(rand() * 10);
      var mc = mushColors[Math.floor(rand() * mushColors.length)];
      hline(mx, my, 3, mc);
      hline(mx - 1, my + 1, 5, mc);
      px(mx, my + 1, '#e0d0a0');
      px(mx + 1, my + 2, '#d8c8a0');
    }

    // Butterflies (small bright dots)
    for (var i = 0; i < 4; i++) {
      var bx = Math.floor(rand() * W);
      var by = 25 + Math.floor(rand() * 30);
      px(bx, by, '#f0e080');
      px(bx + 1, by, '#e0c860');
    }

    // Path (warm dirt, winding)
    for (var y = 52; y < H; y++) {
      var pathX = 55 + Math.floor(Math.sin(y * 0.2) * 5);
      var pathW = 4 + Math.floor(Math.sin(y * 0.3) * 2);
      hline(pathX, y, pathW, '#8a7040');
    }

    // Dappled sunlight on ground
    for (var i = 0; i < 10; i++) {
      var sx = Math.floor(rand() * W);
      var sy = 48 + Math.floor(rand() * 20);
      px(sx, sy, '#80b848');
    }
  }

  // ==================================================
  //  OS X Aqua (Aurora / Space)
  // ==================================================
  function drawOSX() {
    srand(303);

    // Dark space background gradient
    for (var y = 0; y < H; y++) {
      var t = y / H;
      var r = Math.floor(10 + t * 20);
      var g = Math.floor(20 + t * 40);
      var b = Math.floor(50 + t * 50);
      hline(0, y, W, 'rgb(' + r + ',' + g + ',' + b + ')');
    }

    // Stars scattered across upper area
    for (var i = 0; i < 40; i++) {
      var sx = Math.floor(rand() * W);
      var sy = Math.floor(rand() * H * 0.7);
      var bright = 160 + Math.floor(rand() * 95);
      px(sx, sy, 'rgb(' + bright + ',' + bright + ',' + (bright + 20) + ')');
    }

    // Aurora wave 1 (blue-purple)
    for (var x = 0; x < W; x++) {
      var wave = Math.sin(x * 0.06) * 8 + Math.sin(x * 0.12 + 1) * 4;
      var cy = 30 + wave;
      for (var dy = -4; dy <= 4; dy++) {
        var iy = Math.round(cy + dy);
        if (iy < 0 || iy >= H) continue;
        var dist = Math.abs(dy) / 4;
        var alpha = (1 - dist) * 0.5;
        var cr = Math.floor(80 + (1 - dist) * 60);
        var cg = Math.floor(120 + (1 - dist) * 60);
        var cb = Math.floor(200 + (1 - dist) * 55);
        ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + alpha + ')';
        ctx.fillRect(x, iy, 1, 1);
      }
    }

    // Aurora wave 2 (cyan-teal, offset)
    for (var x = 0; x < W; x++) {
      var wave2 = Math.sin(x * 0.05 + 2) * 6 + Math.cos(x * 0.1) * 3;
      var cy2 = 42 + wave2;
      for (var dy = -3; dy <= 3; dy++) {
        var iy = Math.round(cy2 + dy);
        if (iy < 0 || iy >= H) continue;
        var dist = Math.abs(dy) / 3;
        var alpha = (1 - dist) * 0.35;
        var cr = Math.floor(40 + (1 - dist) * 40);
        var cg = Math.floor(160 + (1 - dist) * 60);
        var cb = Math.floor(210 + (1 - dist) * 45);
        ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + alpha + ')';
        ctx.fillRect(x, iy, 1, 1);
      }
    }

    // Bright center glow
    for (var x = 35; x < 75; x++) {
      for (var dy = -2; dy <= 2; dy++) {
        var gy = 35 + dy + Math.round(Math.sin(x * 0.08) * 3);
        if (gy < 0 || gy >= H) continue;
        var xd = Math.abs(x - 55) / 20;
        var yd = Math.abs(dy) / 2;
        var ga = Math.max(0, (1 - xd) * (1 - yd) * 0.3);
        ctx.fillStyle = 'rgba(200, 230, 255,' + ga + ')';
        ctx.fillRect(x, gy, 1, 1);
      }
    }
  }

  // ==================================================
  //  VAPOR - Synthwave sunset, palm trees, retro grid
  // ==================================================
  function drawVapor() {
    srand(808);

    // Sky gradient (warm sunset → purple)
    for (var y = 0; y < H; y++) {
      var t = y / H;
      var r, g, b;
      if (t < 0.3) {
        // Top: deep purple
        r = Math.floor(30 + t * 80);
        g = Math.floor(10 + t * 30);
        b = Math.floor(60 + t * 100);
      } else if (t < 0.5) {
        // Mid: warm pink-orange
        var mt = (t - 0.3) / 0.2;
        r = Math.floor(54 + mt * 180);
        g = Math.floor(19 + mt * 60);
        b = Math.floor(90 - mt * 30);
      } else {
        // Below horizon: dark
        var bt = (t - 0.5) / 0.5;
        r = Math.floor(234 - bt * 210);
        g = Math.floor(79 - bt * 65);
        b = Math.floor(60 - bt * 40);
      }
      hline(0, y, W, 'rgb(' + r + ',' + g + ',' + b + ')');
    }

    // Sun (large, striped)
    var sunCY = Math.floor(H * 0.42);
    var sunR = 14;
    for (var sy = -sunR; sy <= 0; sy++) {
      var hw = Math.round(Math.sqrt(sunR * sunR - sy * sy));
      // Horizontal stripe gaps for retro sun effect
      var stripe = (sy % 3 === 0 && sy < -2);
      if (!stripe) {
        var st = (sy + sunR) / sunR;
        var sr = Math.floor(255 - st * 30);
        var sg = Math.floor(180 - st * 120);
        var sb = Math.floor(60 + st * 60);
        ctx.fillStyle = 'rgb(' + sr + ',' + sg + ',' + sb + ')';
        ctx.fillRect(55 - hw, sunCY + sy, hw * 2 + 1, 1);
      }
    }
    // Sun glow
    ctx.fillStyle = 'rgba(255, 160, 80, 0.1)';
    fillCircle(55, sunCY - 2, sunR + 4, 'rgba(255, 160, 80, 0.08)');

    // Horizon line
    hline(0, Math.floor(H * 0.5), W, '#ff6090');

    // Retro grid (perspective, below horizon)
    var horizonY = Math.floor(H * 0.5);
    // Horizontal grid lines (converge toward horizon)
    for (var gi = 1; gi <= 10; gi++) {
      var gy = horizonY + Math.floor(gi * gi * 0.28);
      if (gy >= H) break;
      var alpha = 0.15 + gi * 0.04;
      ctx.fillStyle = 'rgba(180, 80, 255,' + Math.min(alpha, 0.6) + ')';
      ctx.fillRect(0, gy, W, 1);
    }
    // Vertical grid lines (converge to center)
    var cx = Math.floor(W / 2);
    for (var vi = -6; vi <= 6; vi++) {
      for (var gy = horizonY + 1; gy < H; gy++) {
        var depth = (gy - horizonY) / (H - horizonY);
        var spread = vi * 12 * depth;
        var gx = cx + Math.floor(spread);
        if (gx >= 0 && gx < W) {
          ctx.fillStyle = 'rgba(180, 80, 255,' + (0.1 + depth * 0.3) + ')';
          ctx.fillRect(gx, gy, 1, 1);
        }
      }
    }

    // Palm tree 1 (left)
    drawPalm(15, horizonY + 2, 28, '#1a0830');
    // Palm tree 2 (right, taller)
    drawPalm(88, horizonY + 4, 32, '#120625');
    // Palm tree 3 (far left, small)
    drawPalm(2, horizonY + 1, 18, '#200a38');

    // Stars (upper sky only)
    for (var i = 0; i < 20; i++) {
      var sx = Math.floor(rand() * W);
      var sy = Math.floor(rand() * (H * 0.3));
      px(sx, sy, '#c0a0e0');
    }
  }

  function drawPalm(baseX, baseY, height, color) {
    // Trunk (curved)
    for (var ty = 0; ty < height; ty++) {
      var curve = Math.floor(Math.sin(ty * 0.08) * 3);
      var tx = baseX + curve;
      var tTop = baseY - height + ty;
      if (tTop < 0) continue;
      ctx.fillStyle = color;
      ctx.fillRect(tx, tTop, 2, 1);
    }
    // Fronds
    var topX = baseX + Math.floor(Math.sin(height * 0.08) * 3);
    var topY = baseY - height;
    var frondColor = color;
    // Right fronds
    for (var f = 0; f < 10; f++) {
      var fx = topX + 2 + f;
      var fy = topY + Math.floor(f * f * 0.08) - 1;
      if (fx >= 0 && fx < 110 && fy >= 0) { ctx.fillStyle = frondColor; ctx.fillRect(fx, fy, 1, 1); }
      if (fx >= 0 && fx < 110 && fy + 1 >= 0) { ctx.fillRect(fx, fy + 1, 1, 1); }
    }
    // Left fronds
    for (var f = 0; f < 10; f++) {
      var fx = topX - f;
      var fy = topY + Math.floor(f * f * 0.08) - 1;
      if (fx >= 0 && fx < 110 && fy >= 0) { ctx.fillStyle = frondColor; ctx.fillRect(fx, fy, 1, 1); }
      if (fx >= 0 && fx < 110 && fy + 1 >= 0) { ctx.fillRect(fx, fy + 1, 1, 1); }
    }
    // Drooping fronds (longer)
    for (var f = 0; f < 14; f++) {
      var fx = topX + 2 + f;
      var fy = topY + 1 + Math.floor(f * 0.6);
      if (fx >= 0 && fx < 110 && fy >= 0) { ctx.fillStyle = frondColor; ctx.fillRect(fx, fy, 1, 1); }
    }
    for (var f = 0; f < 14; f++) {
      var fx = topX - f;
      var fy = topY + 1 + Math.floor(f * 0.6);
      if (fx >= 0 && fx < 110 && fy >= 0) { ctx.fillStyle = frondColor; ctx.fillRect(fx, fy, 1, 1); }
    }
  }

  // ==================================================
  //  Draw
  // ==================================================
  function getTheme() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return 'japanese';
    if (scr.classList.contains('theme-wood')) return 'wood';
    if (scr.classList.contains('theme-osx')) return 'osx';
    if (scr.classList.contains('theme-mac')) return 'mac';
    return 'vapor';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var theme = getTheme();
    if (theme === 'japanese') {
      drawJapanese();
    } else if (theme === 'wood') {
      drawWood();
    } else if (theme === 'osx') {
      drawOSX();
    } else if (theme === 'vapor') {
      drawVapor();
    }
    // Mac: no wallpaper (solid color via CSS)
  }

  draw();

  // Redraw on theme change
  new MutationObserver(function () { draw(); })
    .observe(document.getElementById('screen'), { attributes: true, attributeFilter: ['class'] });
})();
