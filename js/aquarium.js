// ===== Aquarium Widget (Canvas - Pixel Art) =====

(function () {
  const canvas = document.getElementById('aquarium-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;   // 100
  const H = canvas.height;  // 60

  // Disable smoothing for pixel look
  ctx.imageSmoothingEnabled = false;

  // ----- Seaweed -----
  const seaweeds = [];
  for (let i = 0; i < 3; i++) {
    seaweeds.push({
      x: 8 + Math.random() * (W - 16),
      height: 10 + Math.random() * 18,
      width: 1 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      color: 'hsl(' + (140 + Math.random() * 60) + ', 70%, ' + (30 + Math.random() * 15) + '%)'
    });
  }

  // ----- Fish -----
  const fishes = [];
  const fishColors = [
    '#ff71ce', '#00fff0', '#b967ff', '#fffb96',
    '#ff6b9d', '#01cdfe', '#ff9900'
  ];

  for (let i = 0; i < 4; i++) {
    const size = 3 + Math.random() * 3;
    const dir = Math.random() < 0.5 ? 1 : -1;
    fishes.push({
      x: Math.random() * W,
      y: 8 + Math.random() * (H - 22),
      size: size,
      speed: 0.7 + Math.random() * 0.6,
      dir: dir,
      color: fishColors[i % fishColors.length],
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

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a0a3e');
    grad.addColorStop(0.5, '#0d2050');
    grad.addColorStop(1, '#0a3050');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sandy bottom
    ctx.fillStyle = '#3a2060';
    ctx.fillRect(0, H - 7, W, 7);
    ctx.fillStyle = '#4a3070';
    ctx.fillRect(0, H - 7, W, 1);

    // Pixel pebbles
    ctx.fillStyle = '#5a4080';
    for (let i = 0; i < W; i += 8) {
      const px = i + ((Math.sin(i) * 2) | 0);
      const py = H - 4 + ((Math.sin(i * 0.7) * 2) | 0);
      ctx.fillRect(px, py, 2, 1);
    }
  }

  function drawSeaweed(t) {
    seaweeds.forEach(function (sw) {
      const baseY = H - 7;
      const segments = 4;
      for (let i = 0; i < segments; i++) {
        const frac = (i + 1) / segments;
        const sway = (Math.sin(t * 0.002 + sw.phase + frac * 3) * (2 * frac)) | 0;
        const sx = (sw.x + sway) | 0;
        const sy = (baseY - sw.height * frac) | 0;
        ctx.fillStyle = sw.color;
        ctx.fillRect(sx, sy, sw.width | 0, (sw.height / segments + 1) | 0);
      }
    });
  }

  function drawFish(fish, t) {
    const x = fish.x | 0;
    const y = fish.y | 0;
    const s = fish.size | 0;
    const halfS = Math.max(1, (s / 2) | 0);
    const tailBob = ((Math.sin(t * 0.01 + fish.tailPhase) * 1) | 0);

    ctx.fillStyle = fish.color;

    // Body
    ctx.fillRect(x - halfS, y - (halfS >> 1), s, halfS);

    // Tail
    const tx = fish.dir > 0 ? x - halfS - 2 : x + halfS;
    ctx.fillRect(tx, y - (halfS >> 1) + tailBob, 2, halfS);

    // Eye
    const ex = fish.dir > 0 ? x + halfS - 1 : x - halfS;
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex, y - (halfS >> 1), 1, 1);
  }

  function drawBubbles(t) {
    ctx.fillStyle = 'rgba(150, 220, 255, 0.4)';
    bubbles.forEach(function (b) {
      const bx = (b.x + Math.sin(t * 0.003 + b.wobble) * 1) | 0;
      const by = b.y | 0;
      ctx.fillRect(bx, by, 1, 1);
    });
  }

  function drawLightRays(t) {
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#b967ff';
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

    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawLightRays(t);
    drawSeaweed(t);
    fishes.forEach(function (f) { drawFish(f, t); });
    drawBubbles(t);
  }

  requestAnimationFrame(loop);
})();
