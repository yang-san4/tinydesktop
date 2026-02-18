// ===== Aquarium Widget (Canvas - Pixel Art, theme-aware) =====

(function () {
  const canvas = document.getElementById('aquarium-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;   // 100
  const H = canvas.height;  // 60

  ctx.imageSmoothingEnabled = false;

  // ----- Theme palette -----
  function getPalette() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return {
      water: ['#0a0a20', '#0a1838', '#081830'],
      sand: '#1a1830', sandTop: '#2a2840', pebble: '#3a3850',
      swHue: [140, 180], swSat: 40, swLit: [25, 35],
      fish: ['#c8372d', '#c8a84e', '#f0e8e0', '#e06030', '#a83030', '#d8a040', '#f0d0a0'],
      bubble: 'rgba(200, 180, 140, 0.3)',
      ray: '#c8372d'
    };
    if (scr.classList.contains('theme-wood')) return {
      water: ['#0a1208', '#0a1808', '#081a10'],
      sand: '#2a2010', sandTop: '#3a3018', pebble: '#4a3828',
      swHue: [100, 150], swSat: 40, swLit: [25, 35],
      fish: ['#c8a050', '#e0d0a0', '#906828', '#b08030', '#d0b060', '#a08040', '#e0c080'],
      bubble: 'rgba(180, 160, 100, 0.3)',
      ray: '#906828'
    };
    if (scr.classList.contains('theme-mac')) return {
      water: ['#0a2840', '#0c3858', '#0a3050'],
      sand: '#8a7858', sandTop: '#9a8868', pebble: '#a89878',
      swHue: [120, 160], swSat: 50, swLit: [28, 40],
      fish: ['#e87830', '#40a8d0', '#e8c840', '#e05050', '#58b868', '#d080c0', '#f0a030'],
      bubble: 'rgba(180, 220, 255, 0.35)',
      ray: '#4898c0'
    };
    if (scr.classList.contains('theme-osx')) return {
      water: ['#0c2848', '#103860', '#0e3058'],
      sand: '#7a9ab0', sandTop: '#8aaac0', pebble: '#9abace',
      swHue: [160, 200], swSat: 55, swLit: [30, 42],
      fish: ['#ff6b35', '#3498db', '#f1c40f', '#e74c3c', '#2ecc71', '#9b59b6', '#e67e22'],
      bubble: 'rgba(200, 230, 255, 0.4)',
      ray: '#5ab4f0'
    };
    // Vapor (default)
    return {
      water: ['#1a0a3e', '#0d2050', '#0a3050'],
      sand: '#3a2060', sandTop: '#4a3070', pebble: '#5a4080',
      swHue: [140, 200], swSat: 70, swLit: [30, 45],
      fish: ['#ff71ce', '#00fff0', '#b967ff', '#fffb96', '#ff6b9d', '#01cdfe', '#ff9900'],
      bubble: 'rgba(150, 220, 255, 0.4)',
      ray: '#b967ff'
    };
  }

  // ----- Seaweed (store random offsets, compute color per frame) -----
  const seaweeds = [];
  for (let i = 0; i < 3; i++) {
    seaweeds.push({
      x: 8 + Math.random() * (W - 16),
      height: 10 + Math.random() * 18,
      width: 1 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      hueOff: Math.random(),
      litOff: Math.random()
    });
  }

  // ----- Fish (store color index) -----
  const fishes = [];
  for (let i = 0; i < 4; i++) {
    const size = 3 + Math.random() * 3;
    const dir = Math.random() < 0.5 ? 1 : -1;
    fishes.push({
      x: Math.random() * W,
      y: 8 + Math.random() * (H - 22),
      size: size,
      speed: 0.7 + Math.random() * 0.6,
      dir: dir,
      colorIdx: i % 7,
      tailPhase: Math.random() * Math.PI * 2,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: 0.08 + Math.random() * 0.15
    });
  }

  // ----- Bubbles -----
  const bubbles = [];

  function spawnBubble() {
    bubbles.push({
      x: 5 + Math.random() * (W - 10),
      y: H - 8 - Math.random() * 5,
      r: 1,
      speed: 0.08 + Math.random() * 0.15,
      wobble: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < 3; i++) {
    bubbles.push({
      x: 5 + Math.random() * (W - 10),
      y: Math.random() * H,
      r: 1,
      speed: 0.08 + Math.random() * 0.15,
      wobble: Math.random() * Math.PI * 2
    });
  }

  // ----- Draw -----

  function drawBackground(p) {
    // Water gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, p.water[0]);
    grad.addColorStop(0.5, p.water[1]);
    grad.addColorStop(1, p.water[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Back wall shadow (darker at edges for box depth)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, 3, H);
    ctx.fillRect(W - 3, 0, 3, H);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(3, 0, 2, H);
    ctx.fillRect(W - 5, 0, 2, H);

    // Depth: darker at top (water surface shadow)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, W, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(0, 3, W, 2);

    // Sand bed with depth (back darker, front lighter)
    var sandGrad = ctx.createLinearGradient(0, H - 9, 0, H);
    sandGrad.addColorStop(0, p.sand);
    sandGrad.addColorStop(0.2, p.sandTop);
    sandGrad.addColorStop(1, p.sand);
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, H - 9, W, 9);

    // Sand edge highlight (front lip of sand)
    ctx.fillStyle = p.sandTop;
    ctx.fillRect(0, H - 9, W, 1);

    // Sand texture / pebbles
    ctx.fillStyle = p.pebble;
    for (let i = 0; i < W; i += 6) {
      const px = i + ((Math.sin(i) * 2) | 0);
      const py = H - 5 + ((Math.sin(i * 0.7) * 2) | 0);
      ctx.fillRect(px, py, 2, 1);
    }
    // Scattered small pebbles
    for (let i = 0; i < W; i += 11) {
      const px = i + ((Math.cos(i * 1.3) * 3) | 0);
      const py = H - 3 + ((Math.sin(i * 0.5)) | 0);
      ctx.fillRect(px, py, 1, 1);
    }

    // Glass reflection (top-left highlight)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, 2, 20, 1);
    ctx.fillRect(3, 3, 15, 1);
    ctx.fillRect(3, 4, 8, 1);
    ctx.restore();

    // Glass reflection (right edge subtle)
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#fff';
    ctx.fillRect(W - 6, 5, 1, 20);
    ctx.fillRect(W - 5, 8, 1, 15);
    ctx.restore();
  }

  function drawSeaweed(t, p) {
    seaweeds.forEach(function (sw) {
      var hue = p.swHue[0] + sw.hueOff * (p.swHue[1] - p.swHue[0]);
      var lit = p.swLit[0] + sw.litOff * (p.swLit[1] - p.swLit[0]);
      var color = 'hsl(' + hue + ',' + p.swSat + '%,' + lit + '%)';

      const baseY = H - 7;
      const segments = 4;
      for (let i = 0; i < segments; i++) {
        const frac = (i + 1) / segments;
        const sway = (Math.sin(t * 0.002 + sw.phase + frac * 3) * (2 * frac)) | 0;
        const sx = (sw.x + sway) | 0;
        const sy = (baseY - sw.height * frac) | 0;
        ctx.fillStyle = color;
        ctx.fillRect(sx, sy, sw.width | 0, (sw.height / segments + 1) | 0);
      }
    });
  }

  function drawFish(fish, t, p) {
    const x = fish.x | 0;
    const y = fish.y | 0;
    const s = fish.size | 0;
    const halfS = Math.max(1, (s / 2) | 0);
    const tailBob = ((Math.sin(t * 0.01 + fish.tailPhase) * 1) | 0);

    ctx.fillStyle = p.fish[fish.colorIdx];

    ctx.fillRect(x - halfS, y - (halfS >> 1), s, halfS);

    const tx = fish.dir > 0 ? x - halfS - 2 : x + halfS;
    ctx.fillRect(tx, y - (halfS >> 1) + tailBob, 2, halfS);

    const ex = fish.dir > 0 ? x + halfS - 1 : x - halfS;
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex, y - (halfS >> 1), 1, 1);
  }

  function drawBubbles(t, p) {
    ctx.fillStyle = p.bubble;
    bubbles.forEach(function (b) {
      const bx = (b.x + Math.sin(t * 0.003 + b.wobble) * 1) | 0;
      const by = b.y | 0;
      ctx.fillRect(bx, by, 1, 1);
    });
  }

  function drawLightRays(t, p) {
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = p.ray;
    for (let i = 0; i < 3; i++) {
      const x = ((W * 0.1) + i * (W * 0.3) + Math.sin(t * 0.0005 + i) * 5) | 0;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 10, 0);
      ctx.lineTo(x + 15, H);
      ctx.lineTo(x - 5, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ----- Update -----
  function update() {
    fishes.forEach(function (f) {
      f.x += f.speed * f.dir;
      f.y += Math.sin(Date.now() * 0.001 + f.wobblePhase) * f.wobbleAmp;

      if (f.dir > 0 && f.x > W + f.size) {
        f.x = -f.size;
        f.y = 8 + Math.random() * (H - 22);
      } else if (f.dir < 0 && f.x < -f.size) {
        f.x = W + f.size;
        f.y = 8 + Math.random() * (H - 22);
      }

      f.y = Math.max(5, Math.min(f.y, H - 12));
    });

    for (let i = bubbles.length - 1; i >= 0; i--) {
      bubbles[i].y -= bubbles[i].speed;
      if (bubbles[i].y < -1) {
        bubbles.splice(i, 1);
      }
    }

    if (Math.random() < 0.02) {
      spawnBubble();
    }
  }

  // ----- Main loop (choppy ~8fps for retro feel) -----
  var FPS = 8;
  var frameDuration = 1000 / FPS;
  var lastFrame = 0;

  function loop(t) {
    requestAnimationFrame(loop);

    if (t - lastFrame < frameDuration) return;
    lastFrame = t;

    update();

    var p = getPalette();
    ctx.clearRect(0, 0, W, H);
    drawBackground(p);
    drawLightRays(t, p);
    drawSeaweed(t, p);
    fishes.forEach(function (f) { drawFish(f, t, p); });
    drawBubbles(t, p);
  }

  requestAnimationFrame(loop);
})();
