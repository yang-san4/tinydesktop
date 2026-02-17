// ===== Clock Widget (Analog + Digital, theme-aware) =====

(function () {
  // --- Digital clock ---
  var digital = document.getElementById('digital-clock');
  var timeEl = document.createElement('div');
  timeEl.className = 'clock-time';
  var dateEl = document.createElement('div');
  dateEl.className = 'clock-date';
  digital.appendChild(timeEl);
  digital.appendChild(dateEl);

  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  function updateDigital() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    timeEl.textContent = h + ':' + m + ':' + s;
    dateEl.textContent = DAYS[now.getDay()] + ' ' + MONTHS[now.getMonth()] + ' ' + now.getDate();
  }

  // --- Analog clock ---
  var canvas = document.getElementById('analog-clock');
  var ctx = canvas.getContext('2d');
  var W = 36, H = 36;
  var CX = 18, CY = 18, R = 15;
  ctx.imageSmoothingEnabled = false;

  // Read theme colors from CSS variables
  function getColors() {
    var s = getComputedStyle(document.getElementById('screen'));
    return {
      face:   s.getPropertyValue('--body-deep').trim()  || '#0a0520',
      ring:   s.getPropertyValue('--accent').trim()      || '#b967ff',
      ringLt: s.getPropertyValue('--accent2').trim()     || '#ff71ce',
      tick:   s.getPropertyValue('--accent3').trim()     || '#00fff0',
      handH:  s.getPropertyValue('--accent2').trim()     || '#ff71ce',
      handM:  s.getPropertyValue('--accent3').trim()     || '#00fff0',
      handS:  s.getPropertyValue('--accent').trim()      || '#b967ff',
      center: s.getPropertyValue('--accent2').trim()     || '#ff71ce'
    };
  }

  function drawLine(x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    ctx.fillStyle = color;
    while (true) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  function drawCircle(cx, cy, r, color) {
    var x = r, y = 0, err = 1 - r;
    ctx.fillStyle = color;
    while (x >= y) {
      ctx.fillRect(cx+x,cy+y,1,1); ctx.fillRect(cx+y,cy+x,1,1);
      ctx.fillRect(cx-y,cy+x,1,1); ctx.fillRect(cx-x,cy+y,1,1);
      ctx.fillRect(cx-x,cy-y,1,1); ctx.fillRect(cx-y,cy-x,1,1);
      ctx.fillRect(cx+y,cy-x,1,1); ctx.fillRect(cx+x,cy-y,1,1);
      y++;
      if (err < 0) { err += 2*y+1; } else { x--; err += 2*(y-x)+1; }
    }
  }

  function drawAnalog() {
    var now = new Date();
    var hours = now.getHours() % 12, mins = now.getMinutes(), secs = now.getSeconds();
    var c = getColors();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = c.face;
    ctx.fillRect(0, 0, W, H);

    drawCircle(CX, CY, R, c.ring);
    drawCircle(CX, CY, R - 1, c.ringLt);

    for (var i = 0; i < 12; i++) {
      var a = (i * 30 - 90) * Math.PI / 180;
      var tr = (i % 3 === 0) ? R - 3 : R - 2;
      ctx.fillStyle = c.tick;
      ctx.fillRect(Math.round(CX + Math.cos(a)*tr), Math.round(CY + Math.sin(a)*tr), 1, 1);
    }

    var hA = ((hours + mins/60)*30 - 90) * Math.PI/180;
    drawLine(CX, CY, Math.round(CX+Math.cos(hA)*7), Math.round(CY+Math.sin(hA)*7), c.handH);

    var mA = ((mins + secs/60)*6 - 90) * Math.PI/180;
    drawLine(CX, CY, Math.round(CX+Math.cos(mA)*10), Math.round(CY+Math.sin(mA)*10), c.handM);

    var sA = (secs*6 - 90) * Math.PI/180;
    drawLine(CX, CY, Math.round(CX+Math.cos(sA)*12), Math.round(CY+Math.sin(sA)*12), c.handS);

    ctx.fillStyle = c.center;
    ctx.fillRect(CX, CY, 1, 1);
  }

  function update() { updateDigital(); drawAnalog(); }
  setInterval(update, 1000);
  update();
})();
