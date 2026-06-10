// ===== Aquarium Widget (Canvas - Pixel Art, theme-aware) =====
// v2: fish species with behaviors, feeding events, schooling minnows,
// a bottom-dwelling catfish, caustics, a pearl clam, an air stone,
// and a snail that occasionally climbs the front glass.

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

  // ----- Plants -----
  const seaweeds = [];
  for (let i = 0; i < 4; i++) {
    seaweeds.push({
      x: 6 + Math.random() * (W - 12),
      height: 10 + Math.random() * 18,
      width: 1 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      hueOff: Math.random(),
      litOff: Math.random()
    });
  }
  // Broad-leaf plant (fixed spot, leaves fan out)
  const leafPlant = { x: 14 + Math.random() * 20, leaves: 4, height: 13 };

  // ----- Decor positions -----
  const rockX = 60 + Math.random() * 20;
  const clamX = 22 + Math.random() * 14;
  const airStoneX = W - 14;

  // ----- Fish (species: 0=round, 1=slim, 2=angel) -----
  const fishes = [];
  for (let i = 0; i < 4; i++) {
    const size = 3 + Math.random() * 3;
    fishes.push({
      x: Math.random() * W,
      y: 8 + Math.random() * (H - 24),
      size: size,
      species: i % 3,
      baseSpeed: 0.5 + Math.random() * 0.5,
      speed: 0.5,
      dir: Math.random() < 0.5 ? 1 : -1,
      colorIdx: i % 7,
      tailPhase: Math.random() * Math.PI * 2,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: 0.08 + Math.random() * 0.15,
      dart: 0,            // burst-speed timer
      turnCd: 60 + Math.random() * 200
    });
  }
  // Minnow school (moves as one unit)
  const school = {
    x: Math.random() * W, y: 14 + Math.random() * 10,
    dir: 1, speed: 0.9, count: 5
  };
  // Bottom-dwelling catfish
  const catfish = {
    x: Math.random() * W, dir: 1, speed: 0.18,
    pause: 0
  };

  // ----- Bubbles -----
  const bubbles = [];
  const pops = []; // surface pop flashes
  function spawnBubble(x, y) {
    bubbles.push({
      x: x !== undefined ? x : 5 + Math.random() * (W - 10),
      y: y !== undefined ? y : H - 8 - Math.random() * 5,
      age: 0,
      speed: 0.1 + Math.random() * 0.18,
      wobble: Math.random() * Math.PI * 2
    });
  }
  for (let i = 0; i < 3; i++) spawnBubble(undefined, Math.random() * H);

  // ----- Feeding event -----
  let feedTimer = 200 + Math.random() * 160; // frames at 8fps (~45s)
  const pellets = [];

  // ----- Snail on the front glass (rare visitor) -----
  const snail = { active: false, x: 0, y: 0, timer: 300 + Math.random() * 200 };

  // ----- Clam -----
  let clamTimer = 0;

  // ----- Draw helpers -----
  function drawBackground(p, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, p.water[0]);
    grad.addColorStop(0.5, p.water[1]);
    grad.addColorStop(1, p.water[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Box depth shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, 3, H);
    ctx.fillRect(W - 3, 0, 3, H);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(3, 0, 2, H);
    ctx.fillRect(W - 5, 0, 2, H);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, W, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(0, 3, W, 2);

    // Surface shimmer (moving sparkle row)
    for (let sx = 0; sx < W; sx += 5) {
      const ph = Math.sin(t * 0.004 + sx * 0.6);
      if (ph > 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.06 + ph * 0.07) + ')';
        ctx.fillRect(sx + ((t * 0.01) % 5 | 0), 1, 3, 1);
      }
    }

    // Sand bed
    var sandGrad = ctx.createLinearGradient(0, H - 9, 0, H);
    sandGrad.addColorStop(0, p.sand);
    sandGrad.addColorStop(0.2, p.sandTop);
    sandGrad.addColorStop(1, p.sand);
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, H - 9, W, 9);
    ctx.fillStyle = p.sandTop;
    ctx.fillRect(0, H - 9, W, 1);

    // Caustic light bands rippling across the sand
    for (let cb = 0; cb < 3; cb++) {
      const cx = ((t * 0.012 + cb * 37) % (W + 24)) - 12;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(cx | 0, H - 9, 8, 2);
      ctx.fillRect((cx + 2) | 0, H - 7, 5, 1);
    }

    // Pebble texture
    ctx.fillStyle = p.pebble;
    for (let i = 0; i < W; i += 6) {
      ctx.fillRect(i + ((Math.sin(i) * 2) | 0), H - 5 + ((Math.sin(i * 0.7) * 2) | 0), 2, 1);
    }
    for (let i = 0; i < W; i += 11) {
      ctx.fillRect(i + ((Math.cos(i * 1.3) * 3) | 0), H - 3 + ((Math.sin(i * 0.5)) | 0), 1, 1);
    }

    // Glass reflections
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, 2, 20, 1);
    ctx.fillRect(3, 3, 15, 1);
    ctx.fillRect(3, 4, 8, 1);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#fff';
    ctx.fillRect(W - 6, 5, 1, 20);
    ctx.fillRect(W - 5, 8, 1, 15);
    ctx.restore();
  }

  function drawDecor(p, t) {
    // Rock cluster
    const rx = rockX | 0;
    ctx.fillStyle = p.pebble;
    ctx.fillRect(rx, H - 12, 8, 4);
    ctx.fillRect(rx + 2, H - 14, 5, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(rx + 1, H - 9, 7, 1);
    // Coral branch on the rock (theme accent)
    ctx.fillStyle = p.fish[0];
    ctx.fillRect(rx + 6, H - 17, 1, 3);
    ctx.fillRect(rx + 4, H - 16, 1, 2);
    ctx.fillRect(rx + 7, H - 19, 1, 2);
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillRect(rx + 3, H - 18, 1, 2);
    ctx.restore();

    // Clam (opens periodically, pearl glints)
    const cx = clamX | 0;
    const open = clamTimer < 24; // open phase
    ctx.fillStyle = p.pebble;
    ctx.fillRect(cx, H - 10, 6, 2);
    if (open) {
      ctx.fillRect(cx, H - 13, 6, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(cx + 1, H - 11, 4, 1);
      // pearl
      const glint = (clamTimer % 8) < 4;
      ctx.fillStyle = glint ? '#fff' : '#d8d8e8';
      ctx.fillRect(cx + 2, H - 11, 2, 1);
    } else {
      ctx.fillRect(cx, H - 11, 6, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(cx + 1, H - 11, 4, 1);
    }

    // Air stone + rising cluster handled in bubbles; draw the stone
    ctx.fillStyle = p.pebble;
    ctx.fillRect(airStoneX, H - 10, 4, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(airStoneX + 1, H - 10, 2, 1);
  }

  function drawLeafPlant(t, p) {
    const bx = leafPlant.x | 0;
    const baseY = H - 8;
    for (let l = 0; l < leafPlant.leaves; l++) {
      const lean = (l - (leafPlant.leaves - 1) / 2) * 2.2;
      const sway = Math.sin(t * 0.0018 + l * 1.3) * 1.5;
      const hue = p.swHue[0] + 10 + l * 6;
      ctx.fillStyle = 'hsl(' + hue + ',' + p.swSat + '%,' + (p.swLit[1] - 4) + '%)';
      for (let seg = 0; seg < leafPlant.height; seg += 2) {
        const frac = seg / leafPlant.height;
        const lx = bx + lean * frac + sway * frac;
        const lw = seg > leafPlant.height - 5 ? 1 : 2;
        ctx.fillRect(lx | 0, baseY - seg, lw, 2);
      }
    }
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
        ctx.fillStyle = color;
        ctx.fillRect((sw.x + sway) | 0, (baseY - sw.height * frac) | 0, sw.width | 0, (sw.height / segments + 1) | 0);
      }
    });
  }

  function drawFish(fish, t, p) {
    const x = fish.x | 0;
    const y = fish.y | 0;
    const s = Math.max(3, fish.size | 0);
    const halfS = Math.max(1, (s / 2) | 0);
    const flap = ((t * 0.012 + fish.tailPhase) % 1) < 0.5;
    const col = p.fish[fish.colorIdx];
    const dir = fish.dir;

    if (fish.species === 2) {
      // Angelfish: tall triangular body
      ctx.fillStyle = col;
      for (let r = 0; r < s; r++) {
        const rw = s - Math.abs(r - halfS);
        ctx.fillRect(x - (rw >> 1), y - halfS + r, rw, 1);
      }
      // trailing fin
      ctx.fillStyle = col;
      ctx.save();
      ctx.globalAlpha = 0.7;
      const fx = dir > 0 ? x - halfS - 2 : x + halfS + 1;
      ctx.fillRect(fx, y - halfS + (flap ? 0 : 1), 2, s - 1);
      ctx.restore();
    } else if (fish.species === 1) {
      // Slim fish: long body + stripe
      ctx.fillStyle = col;
      ctx.fillRect(x - halfS - 1, y, s + 2, Math.max(1, halfS));
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - halfS - 1, y + (halfS >> 1), s + 2, 1);
      ctx.restore();
      // tail
      ctx.fillStyle = col;
      const tx1 = dir > 0 ? x - halfS - 3 : x + halfS + 1;
      ctx.fillRect(tx1, y - (flap ? 1 : 0), 2, halfS + 1);
    } else {
      // Round fish: body + belly + top fin
      ctx.fillStyle = col;
      ctx.fillRect(x - halfS, y - (halfS >> 1), s, halfS);
      ctx.fillRect(x - halfS + 1, y - (halfS >> 1) - 1, s - 2, 1);
      // belly highlight
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - halfS + 1, y + (halfS >> 1) - 1, s - 2, 1);
      ctx.restore();
      // tail (flaps)
      ctx.fillStyle = col;
      const tx2 = dir > 0 ? x - halfS - 2 : x + halfS;
      if (flap) {
        ctx.fillRect(tx2, y - (halfS >> 1) - 1, 2, 2);
        ctx.fillRect(tx2, y + 1, 2, 2);
      } else {
        ctx.fillRect(tx2, y - (halfS >> 1), 2, halfS);
      }
    }
    // eye
    const ex = dir > 0 ? x + halfS - 1 : x - halfS;
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex, y - (halfS >> 1), 1, 1);
    // dart wake
    if (fish.dart > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      const wx = dir > 0 ? x - s - 2 : x + s;
      ctx.fillRect(wx, y, 2, 1);
    }
  }

  function drawSchool(t, p) {
    ctx.fillStyle = p.fish[1];
    for (let i = 0; i < school.count; i++) {
      const sx = school.x - i * 4 * school.dir - (i % 2) * 2 * school.dir;
      const sy = school.y + (i % 3) * 2 + Math.sin(t * 0.006 + i * 0.9) * 1.5;
      if (sx < -3 || sx > W + 3) continue;
      ctx.fillRect(sx | 0, sy | 0, 2, 1);
      // tiny tail tick
      ctx.fillRect((sx - school.dir * 2) | 0, sy | 0, 1, 1);
    }
  }

  function drawCatfish(t, p) {
    const x = catfish.x | 0;
    const y = H - 11;
    const d = catfish.dir;
    ctx.fillStyle = p.fish[6];
    ctx.fillRect(x - 3, y, 7, 2);
    ctx.fillRect(x - 2, y - 1, 5, 1);
    // tail
    ctx.fillRect(x - d * 4, y - 1, 1, 3);
    // whiskers
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x + d * 4, y + 1, 1, 1);
    ctx.fillRect(x + d * 3, y + 2, 1, 1);
    // eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + d * 2, y, 1, 1);
  }

  function drawBubbles(t, p) {
    ctx.fillStyle = p.bubble;
    bubbles.forEach(function (b) {
      const bx = (b.x + Math.sin(t * 0.003 + b.wobble) * 1) | 0;
      const size = b.age > 30 ? 2 : 1; // grow as they rise
      ctx.fillRect(bx, b.y | 0, size, size);
    });
    // surface pops
    for (let i = pops.length - 1; i >= 0; i--) {
      const pop = pops[i];
      ctx.fillStyle = 'rgba(255,255,255,' + (pop.life / 4 * 0.5) + ')';
      ctx.fillRect((pop.x - 1) | 0, 2, 3, 1);
      ctx.fillRect(pop.x | 0, 1, 1, 1);
      pop.life--;
      if (pop.life <= 0) pops.splice(i, 1);
    }
  }

  function drawPellets(p) {
    for (let i = 0; i < pellets.length; i++) {
      ctx.fillStyle = '#c8965a';
      ctx.fillRect(pellets[i].x | 0, pellets[i].y | 0, 1, 1);
    }
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

  function drawSnail(p) {
    if (!snail.active) return;
    const x = snail.x | 0, y = snail.y | 0;
    // on the front glass: slightly translucent, above everything
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = p.fish[5];
    ctx.fillRect(x, y, 4, 2);          // foot on glass
    ctx.fillStyle = p.fish[3];
    ctx.fillRect(x, y - 3, 3, 3);      // shell
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x + 1, y - 2, 1, 1);  // shell spiral
    ctx.fillStyle = p.fish[5];
    ctx.fillRect(x + 3, y - 3, 1, 1);  // antenna
    ctx.restore();
  }

  // ----- Update -----
  function update() {
    // Feeding event
    feedTimer--;
    if (feedTimer <= 0) {
      feedTimer = 280 + Math.random() * 200;
      const fx = 15 + Math.random() * (W - 30);
      for (let i = 0; i < 4; i++) {
        pellets.push({ x: fx + Math.random() * 10 - 5, y: -1 - i * 2, vy: 0.12 + Math.random() * 0.08 });
      }
    }
    for (let i = pellets.length - 1; i >= 0; i--) {
      const pe = pellets[i];
      pe.y += pe.vy;
      pe.x += Math.sin(pe.y * 0.5) * 0.15;
      if (pe.y > H - 10) { pellets.splice(i, 1); continue; }
      // fish eat pellets
      for (let f = 0; f < fishes.length; f++) {
        const df = Math.abs(fishes[f].x - pe.x) + Math.abs(fishes[f].y - pe.y);
        if (df < 4) { pellets.splice(i, 1); break; }
      }
    }

    fishes.forEach(function (f) {
      // target nearest pellet when feeding
      let target = null, bestD = 40;
      for (let i = 0; i < pellets.length; i++) {
        const d = Math.abs(pellets[i].x - f.x) + Math.abs(pellets[i].y - f.y);
        if (d < bestD) { bestD = d; target = pellets[i]; }
      }
      if (target) {
        f.dir = target.x > f.x ? 1 : -1;
        f.speed = f.baseSpeed * 2.2;
        f.y += (target.y - f.y) * 0.12;
        f.dart = 3;
      } else {
        // occasional spontaneous dart or direction change
        if (f.dart > 0) { f.dart--; f.speed = f.baseSpeed * 2.0; }
        else f.speed = f.baseSpeed;
        f.turnCd--;
        if (f.turnCd <= 0) {
          f.turnCd = 80 + Math.random() * 240;
          if (Math.random() < 0.45) f.dir *= -1;
          else f.dart = 5 + Math.random() * 6;
        }
        f.y += Math.sin(Date.now() * 0.001 + f.wobblePhase) * f.wobbleAmp;
      }
      f.x += f.speed * f.dir;
      if (f.dir > 0 && f.x > W + f.size + 2) {
        f.x = -f.size;
        f.y = 8 + Math.random() * (H - 24);
      } else if (f.dir < 0 && f.x < -f.size - 2) {
        f.x = W + f.size;
        f.y = 8 + Math.random() * (H - 24);
      }
      f.y = Math.max(5, Math.min(f.y, H - 13));
    });

    // School: drift, follow food loosely, wrap
    if (pellets.length > 0) {
      school.dir = pellets[0].x > school.x ? 1 : -1;
      school.speed = 1.4;
    } else {
      school.speed = 0.9;
    }
    school.x += school.speed * school.dir;
    school.y += Math.sin(Date.now() * 0.0012) * 0.2;
    school.y = Math.max(8, Math.min(school.y, H - 20));
    if (school.dir > 0 && school.x > W + 22) school.x = -22;
    if (school.dir < 0 && school.x < -22) school.x = W + 22;

    // Catfish: shuffle along the bottom with pauses
    if (catfish.pause > 0) catfish.pause--;
    else {
      catfish.x += catfish.speed * catfish.dir;
      if (Math.random() < 0.01) catfish.pause = 16 + Math.random() * 30;
      if (catfish.x > W - 6) catfish.dir = -1;
      if (catfish.x < 6) catfish.dir = 1;
    }

    // Bubbles: ambient + air stone clusters
    for (let i = bubbles.length - 1; i >= 0; i--) {
      bubbles[i].y -= bubbles[i].speed;
      bubbles[i].age++;
      if (bubbles[i].y < 3) {
        pops.push({ x: bubbles[i].x, life: 4 });
        bubbles.splice(i, 1);
      }
    }
    if (Math.random() < 0.02) spawnBubble();
    if (Math.random() < 0.05) spawnBubble(airStoneX + 1 + Math.random() * 2, H - 10);

    // Clam cycle (~20s)
    clamTimer = (clamTimer + 1) % 160;
    if (clamTimer === 2) spawnBubble(clamX + 2, H - 12);

    // Snail visits (~once a minute, climbs the front glass)
    if (snail.active) {
      snail.y -= 0.08;
      snail.x += Math.sin(snail.y * 0.3) * 0.1;
      if (snail.y < 6) {
        snail.active = false;
        snail.timer = 360 + Math.random() * 300;
      }
    } else {
      snail.timer--;
      if (snail.timer <= 0) {
        snail.active = true;
        snail.x = 10 + Math.random() * (W - 24);
        snail.y = H - 6;
      }
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
    drawBackground(p, t);
    drawLightRays(t, p);
    drawDecor(p, t);
    drawLeafPlant(t, p);
    drawSeaweed(t, p);
    drawCatfish(t, p);
    drawSchool(t, p);
    fishes.forEach(function (f) { drawFish(f, t, p); });
    drawPellets(p);
    drawBubbles(t, p);
    drawSnail(p);
  }

  requestAnimationFrame(loop);
})();
