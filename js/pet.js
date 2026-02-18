// ===== Tiny Desktop - Desktop Pet (Pixel Cat) =====

(function () {
  var canvas = document.getElementById('pet-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // Native resolution
  var PW = 16;
  var PH = 14;
  canvas.width = PW;
  canvas.height = PH;

  var desktop = document.getElementById('desktop');

  // State
  var x = 200;
  var y = 0; // updated dynamically each frame
  var dir = 1; // 1 = right, -1 = left
  var state = 'walk'; // walk, sit, sleep, lick
  var stateTimer = 0;
  var frame = 0;
  var frameTimer = 0;
  var WALK_SPEED = 0.3;

  function getPalette() {
    var cl = document.getElementById('screen').classList;
    if (cl.contains('theme-japanese')) return { body: '#2a1a10', dark: '#1a0a08', eye: '#c8a84e', nose: '#c8372d', whisker: '#5a4030' };
    if (cl.contains('theme-wood')) return { body: '#c8a050', dark: '#806828', eye: '#1a1408', nose: '#a06030', whisker: '#604020' };
    if (cl.contains('theme-mac')) return { body: '#555555', dark: '#333333', eye: '#ffffff', nose: '#ff8888', whisker: '#999999' };
    if (cl.contains('theme-osx')) return { body: '#5a98d0', dark: '#3470a0', eye: '#fff', nose: '#f5736e', whisker: '#3a6890' };
    return { body: '#b967ff', dark: '#7030a0', eye: '#00fff0', nose: '#ff71ce', whisker: '#4a2070' };
  }

  // Pixel art frames - each is an array of {x, y, color_key} relative to canvas
  // Cat is ~10x8 pixels

  function drawCat(pal, facing, anim) {
    ctx.clearRect(0, 0, PW, PH);

    var fx = facing === 1 ? 0 : 1; // flip x

    function px(cx, cy, color) {
      var dx = facing === 1 ? cx : (PW - 1 - cx);
      ctx.fillStyle = color;
      ctx.fillRect(dx, cy, 1, 1);
    }

    if (state === 'sleep') {
      drawSleeping(pal, px, anim);
    } else if (state === 'sit' || state === 'lick') {
      drawSitting(pal, px, anim);
    } else {
      drawWalking(pal, px, anim);
    }
  }

  function drawWalking(pal, px, anim) {
    // Ears
    px(4, 2, pal.dark);
    px(5, 1, pal.dark);
    px(9, 2, pal.dark);
    px(8, 1, pal.dark);

    // Head
    px(4, 3, pal.body); px(5, 3, pal.body); px(6, 3, pal.body);
    px(7, 3, pal.body); px(8, 3, pal.body); px(9, 3, pal.body);
    px(4, 4, pal.body); px(5, 4, pal.eye); px(6, 4, pal.body);
    px(7, 4, pal.body); px(8, 4, pal.eye); px(9, 4, pal.body);
    px(4, 5, pal.body); px(5, 5, pal.body); px(6, 5, pal.nose);
    px(7, 5, pal.nose); px(8, 5, pal.body); px(9, 5, pal.body);

    // Whiskers
    px(3, 4, pal.whisker); px(10, 4, pal.whisker);
    px(3, 5, pal.whisker); px(10, 5, pal.whisker);

    // Body
    px(3, 6, pal.body); px(4, 6, pal.body); px(5, 6, pal.body);
    px(6, 6, pal.body); px(7, 6, pal.body); px(8, 6, pal.body);
    px(9, 6, pal.body);
    px(3, 7, pal.body); px(4, 7, pal.body); px(5, 7, pal.body);
    px(6, 7, pal.body); px(7, 7, pal.body); px(8, 7, pal.body);
    px(9, 7, pal.body);
    px(3, 8, pal.body); px(4, 8, pal.body); px(5, 8, pal.body);
    px(6, 8, pal.body); px(7, 8, pal.body); px(8, 8, pal.body);
    px(9, 8, pal.body); px(10, 8, pal.body);

    // Tail
    px(2, 7, pal.dark); px(1, 6, pal.dark); px(1, 5, pal.dark);

    // Legs (animated)
    if (anim % 2 === 0) {
      px(4, 9, pal.dark); px(5, 9, pal.dark);
      px(8, 9, pal.dark); px(9, 9, pal.dark);
      px(4, 10, pal.dark);
      px(9, 10, pal.dark);
    } else {
      px(5, 9, pal.dark); px(6, 9, pal.dark);
      px(7, 9, pal.dark); px(8, 9, pal.dark);
      px(5, 10, pal.dark);
      px(8, 10, pal.dark);
    }
  }

  function drawSitting(pal, px, anim) {
    // Ears
    px(4, 1, pal.dark); px(5, 0, pal.dark);
    px(9, 1, pal.dark); px(8, 0, pal.dark);

    // Head
    px(4, 2, pal.body); px(5, 2, pal.body); px(6, 2, pal.body);
    px(7, 2, pal.body); px(8, 2, pal.body); px(9, 2, pal.body);
    px(4, 3, pal.body); px(5, 3, pal.eye); px(6, 3, pal.body);
    px(7, 3, pal.body); px(8, 3, pal.eye); px(9, 3, pal.body);
    px(4, 4, pal.body); px(5, 4, pal.body); px(6, 4, pal.nose);
    px(7, 4, pal.nose); px(8, 4, pal.body); px(9, 4, pal.body);

    // Whiskers
    px(3, 3, pal.whisker); px(10, 3, pal.whisker);
    px(3, 4, pal.whisker); px(10, 4, pal.whisker);

    // Lick animation
    if (state === 'lick' && anim % 4 < 2) {
      px(11, 4, pal.body); // paw near face
    }

    // Body (compact sitting)
    px(4, 5, pal.body); px(5, 5, pal.body); px(6, 5, pal.body);
    px(7, 5, pal.body); px(8, 5, pal.body); px(9, 5, pal.body);
    px(4, 6, pal.body); px(5, 6, pal.body); px(6, 6, pal.body);
    px(7, 6, pal.body); px(8, 6, pal.body); px(9, 6, pal.body);
    px(3, 7, pal.body); px(4, 7, pal.body); px(5, 7, pal.body);
    px(6, 7, pal.body); px(7, 7, pal.body); px(8, 7, pal.body);
    px(9, 7, pal.body);

    // Paws tucked
    px(4, 8, pal.dark); px(5, 8, pal.dark);
    px(8, 8, pal.dark); px(9, 8, pal.dark);

    // Tail wrapped
    px(10, 7, pal.dark); px(11, 7, pal.dark); px(11, 6, pal.dark);
  }

  function drawSleeping(pal, px, anim) {
    // Compact sleeping pose - curled up
    // Body ball
    px(4, 4, pal.body); px(5, 4, pal.body); px(6, 4, pal.body);
    px(7, 4, pal.body); px(8, 4, pal.body); px(9, 4, pal.body);
    px(3, 5, pal.body); px(4, 5, pal.body); px(5, 5, pal.body);
    px(6, 5, pal.body); px(7, 5, pal.body); px(8, 5, pal.body);
    px(9, 5, pal.body); px(10, 5, pal.body);
    px(3, 6, pal.body); px(4, 6, pal.body); px(5, 6, pal.body);
    px(6, 6, pal.body); px(7, 6, pal.body); px(8, 6, pal.body);
    px(9, 6, pal.body); px(10, 6, pal.body);
    px(4, 7, pal.body); px(5, 7, pal.body); px(6, 7, pal.body);
    px(7, 7, pal.body); px(8, 7, pal.body); px(9, 7, pal.body);

    // Ears
    px(3, 3, pal.dark); px(4, 3, pal.dark);

    // Closed eyes (lines)
    px(5, 5, pal.dark); px(6, 5, pal.dark);

    // Nose
    px(3, 6, pal.nose);

    // Tail wrapped around
    px(10, 7, pal.dark); px(11, 7, pal.dark); px(11, 6, pal.dark);

    // Zzz
    if (anim % 4 < 2) {
      px(12, 2, pal.whisker);
      px(13, 1, pal.whisker);
    } else {
      px(12, 3, pal.whisker);
      px(13, 2, pal.whisker);
    }
  }

  function changeState() {
    var rand = Math.random();
    if (state === 'walk') {
      if (rand < 0.4) { state = 'sit'; stateTimer = 3000 + Math.random() * 4000; }
      else if (rand < 0.6) { state = 'lick'; stateTimer = 2000 + Math.random() * 2000; }
      else if (rand < 0.75) { state = 'sleep'; stateTimer = 5000 + Math.random() * 5000; }
      else { dir = -dir; stateTimer = 2000 + Math.random() * 4000; }
    } else if (state === 'sit') {
      if (rand < 0.5) { state = 'walk'; dir = Math.random() < 0.5 ? 1 : -1; stateTimer = 3000 + Math.random() * 4000; }
      else if (rand < 0.7) { state = 'lick'; stateTimer = 2000 + Math.random() * 2000; }
      else { state = 'sleep'; stateTimer = 5000 + Math.random() * 5000; }
    } else if (state === 'lick') {
      if (rand < 0.5) { state = 'sit'; stateTimer = 2000 + Math.random() * 3000; }
      else { state = 'walk'; dir = Math.random() < 0.5 ? 1 : -1; stateTimer = 3000 + Math.random() * 4000; }
    } else { // sleep
      if (rand < 0.6) { state = 'sit'; stateTimer = 2000 + Math.random() * 3000; }
      else { state = 'walk'; dir = Math.random() < 0.5 ? 1 : -1; stateTimer = 3000 + Math.random() * 4000; }
    }
    frame = 0;
  }

  var lastTs = 0;

  function update(ts) {
    var dt = Math.min(ts - lastTs, 100);
    lastTs = ts;

    // State timer
    stateTimer -= dt;
    if (stateTimer <= 0) {
      changeState();
    }

    // Frame animation
    frameTimer += dt;
    if (frameTimer > 300) {
      frame++;
      frameTimer = 0;
    }

    // Use live desktop dimensions
    var dw = desktop.offsetWidth;
    var dh = desktop.offsetHeight;

    // Movement
    if (state === 'walk') {
      x += dir * WALK_SPEED * (dt / 16.67);

      // Bounce at edges
      var margin = 40;
      if (x > dw - margin) { x = dw - margin; dir = -1; }
      if (x < margin) { x = margin; dir = 1; }
    }

    // Stay just above taskbar
    y = dh - 34;

    // Position canvas
    canvas.style.left = Math.round(x - PW * 1.5) + 'px';
    canvas.style.top = Math.round(y) + 'px';

    // Draw
    var pal = getPalette();
    drawCat(pal, dir, frame);

    requestAnimationFrame(update);
  }

  // Initial state
  stateTimer = 3000 + Math.random() * 3000;

  requestAnimationFrame(function (ts) {
    lastTs = ts;
    update(ts);
  });
})();
