// ===== Character Widget (David / Maiko / Bear) =====
// Theme-aware pixel-art character: eyes follow cursor, click to wink + hearts

(function () {
  var canvas = document.getElementById('david-widget');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;   // 40
  var H = canvas.height;  // 52

  ctx.imageSmoothingEnabled = false;

  var mouseX = -10;
  var mouseY = -10;
  var isWinking = false;
  var winkTimer = null;
  var GAZE_BIAS_X = -6;
  var GAZE_BIAS_Y = -5;

  var desktop = document.getElementById('desktop');
  desktop.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
  });

  // ----- Theme detection -----
  function getTheme() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return 'japanese';
    if (scr.classList.contains('theme-wood')) return 'wood';
    if (scr.classList.contains('theme-mac')) return 'mac';
    if (scr.classList.contains('theme-osx')) return 'osx';
    return 'vapor';
  }

  // ----- Heart particles -----
  var hearts = [];
  function getHeartColor() {
    var t = getTheme();
    if (t === 'japanese') return '#c8372d';
    if (t === 'wood') return '#c8a050';
    return '#ff71ce';
  }
  function spawnHearts() {
    var c = getHeartColor();
    for (var i = 0; i < 3; i++) {
      hearts.push({
        x: 18 + Math.random() * 6 - 3,
        y: 8 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.3,
        life: 1.0,
        size: Math.random() < 0.5 ? 0 : 1,
        color: c
      });
    }
  }

  var widgetEl = document.getElementById('widget-david');
  widgetEl.addEventListener('click', function () {
    if (window._tinyDesktopDragged) return;
    if (isWinking) return;
    isWinking = true;
    spawnHearts();
    clearTimeout(winkTimer);
    winkTimer = setTimeout(function () { isWinking = false; }, 400);
  });

  // ----- Pixel helpers -----
  function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
  function hline(x, y, l, c) { ctx.fillStyle = c; ctx.fillRect(x, y, l, 1); }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // ==================================================
  //  DAVID (Vapor / Mac)
  // ==================================================
  var D_MARBLE = '#e8ddd0', D_MID = '#d8ccbc', D_SHD = '#c4b4a0';
  var D_DRK = '#a89888', D_HAIR = '#b0a090', D_HAIR_D = '#908070';
  var D_HAIR_L = '#c8baa8', D_LIP = '#d4b0a0', D_EYE = '#f0ece8';
  var D_IRIS = '#6a7060', D_BROW = '#a09080';
  var D_PED = '#a09888', D_PED_L = '#c0b8a8', D_PED_D = '#807068';

  function drawDavidHair() {
    hline(14,0,12,D_HAIR); hline(12,1,16,D_HAIR);
    hline(11,2,18,D_HAIR_D); hline(10,3,20,D_HAIR);
    hline(9,4,22,D_HAIR); hline(9,5,23,D_HAIR_D);
    hline(8,6,24,D_HAIR); hline(8,7,25,D_HAIR);
    hline(8,8,25,D_HAIR_D); hline(9,9,23,D_HAIR);
    hline(9,10,23,D_HAIR);
    px(15,1,D_HAIR_L); px(18,0,D_HAIR_L); px(22,2,D_HAIR_L);
    px(12,4,D_HAIR_L); px(26,5,D_HAIR_L); px(14,3,D_HAIR_L);
    px(20,4,D_HAIR_L); px(28,7,D_HAIR_L);
    px(16,2,D_HAIR_D); px(21,3,D_HAIR_D); px(13,5,D_HAIR_D);
    px(25,4,D_HAIR_D); px(11,7,D_HAIR_D); px(19,6,D_HAIR_D);
    px(29,8,D_HAIR_D); px(15,8,D_HAIR_D);
    hline(8,9,4,D_HAIR_D); hline(7,10,4,D_HAIR);
    hline(7,11,3,D_HAIR); hline(7,12,3,D_HAIR_D);
    hline(8,13,2,D_HAIR); hline(8,14,2,D_HAIR_D);
    hline(29,9,3,D_HAIR_D); hline(30,10,3,D_HAIR);
    hline(30,11,3,D_HAIR); hline(30,12,3,D_HAIR_D);
    hline(30,13,2,D_HAIR); hline(30,14,2,D_HAIR_D);
  }

  function drawDavidFace() {
    hline(10,9,20,D_MARBLE); hline(10,10,20,D_MARBLE);
    hline(9,11,21,D_MARBLE); hline(9,12,21,D_MARBLE);
    hline(10,13,20,D_MID);
    hline(10,14,20,D_MARBLE); hline(10,15,20,D_MARBLE);
    hline(10,16,20,D_MARBLE); hline(10,17,20,D_MARBLE);
    hline(12,13,5,D_BROW); hline(23,13,5,D_BROW);
    hline(10,18,20,D_MARBLE); hline(11,19,18,D_MARBLE);
    hline(11,20,18,D_MARBLE); hline(11,21,18,D_MARBLE);
    hline(12,22,16,D_MARBLE);
    rect(19,15,2,6,D_MID);
    hline(18,21,4,D_SHD); px(18,20,D_SHD); px(21,20,D_SHD);
    px(20,16,D_MARBLE); px(20,17,D_MARBLE); px(20,18,D_MARBLE);
    hline(10,18,3,D_MID); hline(27,18,3,D_MID);
    hline(12,23,16,D_MARBLE); hline(13,24,14,D_MARBLE); hline(13,25,14,D_MARBLE);
    hline(16,23,8,D_LIP); hline(17,24,6,D_LIP);
    px(16,24,D_SHD); px(23,24,D_SHD); hline(17,23,6,D_DRK);
    hline(13,26,14,D_MARBLE); hline(14,27,12,D_MARBLE);
    hline(14,28,12,D_MID); hline(15,29,10,D_MID); hline(16,30,8,D_SHD);
    px(10,19,D_SHD); px(10,20,D_SHD); px(11,21,D_SHD); px(11,22,D_SHD);
    px(12,23,D_SHD); px(12,24,D_SHD); px(13,25,D_SHD); px(13,26,D_SHD);
    px(29,19,D_SHD); px(29,20,D_SHD); px(28,21,D_SHD); px(28,22,D_SHD);
    px(27,23,D_SHD); px(27,24,D_SHD); px(26,25,D_SHD); px(26,26,D_SHD);
    px(9,15,D_SHD); px(9,16,D_MID); px(9,17,D_SHD);
    px(30,15,D_SHD); px(30,16,D_MID); px(30,17,D_SHD);
  }

  function drawDavidEyes(mx, my) {
    mx += GAZE_BIAS_X; my += GAZE_BIAS_Y;
    var lx = 13, rx = 24, ey = 15;
    hline(lx,ey,4,D_EYE); hline(lx,ey+1,4,D_EYE);
    hline(rx,ey,4,D_EYE); hline(rx,ey+1,4,D_EYE);
    hline(lx,ey-1,4,D_SHD); hline(rx,ey-1,4,D_SHD);
    var lcx=lx+2, lcy=ey+0.5, rcx=rx+2, rcy=ey+0.5;
    var la=Math.atan2(my-lcy,mx-lcx), ra=Math.atan2(my-rcy,mx-rcx);
    var ld=Math.min(1,Math.hypot(mx-lcx,my-lcy)/20);
    var rd=Math.min(1,Math.hypot(mx-rcx,my-rcy)/20);
    var lpx=Math.round(lcx+Math.cos(la)*ld), lpy=Math.round(lcy+Math.sin(la)*ld*0.5);
    var rpx=Math.round(rcx+Math.cos(ra)*rd), rpy=Math.round(rcy+Math.sin(ra)*rd*0.5);
    px(lpx,lpy,D_IRIS); px(lpx,lpy+1,D_IRIS);
    if (isWinking) {
      hline(rx,ey,4,D_SHD); hline(rx,ey+1,4,D_MID);
    } else {
      px(rpx,rpy,D_IRIS); px(rpx,rpy+1,D_IRIS);
    }
  }

  function drawDavidNeck() {
    hline(16,31,8,D_MARBLE); hline(15,32,10,D_MARBLE);
    hline(15,33,10,D_MARBLE); hline(14,34,12,D_MID);
    hline(14,35,12,D_MID); hline(13,36,14,D_MID);
    hline(13,37,14,D_SHD);
    px(15,32,D_SHD); px(15,33,D_SHD); px(24,32,D_SHD); px(24,33,D_SHD);
    hline(11,38,18,D_SHD); hline(10,39,20,D_SHD);
  }

  function drawDavidPedestal() {
    hline(8,40,24,D_DRK); hline(7,41,26,D_SHD); hline(6,42,28,D_SHD);
    hline(5,43,30,D_PED_L); hline(4,44,32,D_PED); hline(4,45,32,D_PED);
    hline(4,46,32,D_PED_D);
    hline(6,47,28,D_PED); hline(6,48,28,D_PED);
    hline(6,49,28,D_PED_D); hline(5,50,30,D_PED_D); hline(4,51,32,D_PED_D);
  }

  function drawDavid(mx, my) {
    drawDavidHair(); drawDavidFace(); drawDavidEyes(mx, my);
    drawDavidNeck(); drawDavidPedestal();
  }

  // ==================================================
  //  MAIKO (Japanese theme)
  // ==================================================
  var M_HAIR = '#1a1020', M_HL = '#2a2038';
  var M_SKIN = '#f0e8e0', M_SKS = '#e0d0c8', M_SKD = '#d0beb0';
  var M_LIP = '#c8372d', M_BLUSH = '#e8b8b0';
  var M_KR = '#c8372d', M_KG = '#c8a84e';
  var M_KIM = '#8a2020', M_KIM_L = '#a83030', M_KIM_A = '#c8a84e';
  var M_EYE = '#f0ece8', M_IRIS = '#1a1020', M_BROW = '#3a2030';

  function drawMaikoHair() {
    // Top bun (mage)
    hline(16,0,8,M_HAIR); hline(14,1,12,M_HAIR);
    hline(13,2,14,M_HAIR); hline(12,3,16,M_HAIR);
    hline(12,4,16,M_HAIR); hline(13,5,14,M_HAIR);
    hline(14,6,12,M_HAIR);
    px(18,1,M_HL); px(22,2,M_HL); px(16,3,M_HL);
    // Kanzashi ornaments
    px(10,3,M_KR); px(9,4,M_KR); px(10,4,M_KG);
    px(30,3,M_KR); px(31,4,M_KR); px(30,4,M_KG);
    px(11,2,M_KG); px(29,2,M_KG);
    // Main hair
    hline(10,7,20,M_HAIR); hline(9,8,22,M_HAIR);
    hline(9,9,22,M_HAIR); hline(9,10,22,M_HAIR);
    hline(9,11,3,M_HAIR); hline(28,11,3,M_HAIR);
    hline(9,12,3,M_HAIR); hline(28,12,3,M_HAIR);
    hline(9,13,2,M_HAIR); hline(29,13,2,M_HAIR);
    hline(9,14,2,M_HAIR); hline(29,14,2,M_HAIR);
    hline(10,15,2,M_HAIR); hline(28,15,2,M_HAIR);
    hline(10,16,2,M_HAIR); hline(28,16,2,M_HAIR);
    hline(10,17,2,M_HAIR); hline(28,17,2,M_HAIR);
    px(12,8,M_HL); px(27,9,M_HL);
  }

  function drawMaikoFace() {
    // Forehead
    hline(12,10,16,M_SKIN); hline(12,11,16,M_SKIN);
    hline(11,12,18,M_SKIN); hline(11,13,18,M_SKIN);
    hline(11,14,18,M_SKIN);
    // Eye area
    hline(12,15,16,M_SKIN); hline(12,16,16,M_SKIN);
    hline(12,17,16,M_SKIN);
    // Mid face
    hline(12,18,16,M_SKIN); hline(12,19,16,M_SKIN);
    hline(12,20,16,M_SKIN);
    // Nose
    px(20,18,M_SKS); px(20,19,M_SKS); hline(19,20,3,M_SKS);
    // Blush
    px(13,18,M_BLUSH); px(14,18,M_BLUSH);
    px(25,18,M_BLUSH); px(26,18,M_BLUSH);
    // Mouth area
    hline(13,21,14,M_SKIN); hline(13,22,14,M_SKIN);
    hline(14,23,12,M_SKIN);
    // Lips (small, traditional)
    hline(18,22,4,M_LIP); px(19,21,M_LIP); px(20,21,M_LIP);
    // Chin
    hline(14,24,12,M_SKIN); hline(15,25,10,M_SKIN);
    hline(15,26,10,M_SKS); hline(16,27,8,M_SKS);
    hline(17,28,6,M_SKD);
    // Jaw shadow
    px(12,18,M_SKS); px(12,19,M_SKS); px(13,20,M_SKS); px(13,21,M_SKS);
    px(14,22,M_SKS); px(14,23,M_SKS);
    px(27,18,M_SKS); px(27,19,M_SKS); px(26,20,M_SKS); px(26,21,M_SKS);
    px(25,22,M_SKS); px(25,23,M_SKS);
  }

  function drawMaikoEyes(mx, my) {
    mx += GAZE_BIAS_X; my += GAZE_BIAS_Y;
    var lx = 14, rx = 23, ey = 16;
    hline(lx,ey,3,M_EYE); hline(lx,ey+1,3,M_EYE);
    hline(rx,ey,3,M_EYE); hline(rx,ey+1,3,M_EYE);
    // Eyeliner
    hline(lx,ey-1,3,M_HAIR); hline(rx,ey-1,3,M_HAIR);
    // Brows
    hline(14,14,3,M_BROW); hline(23,14,3,M_BROW);
    // Iris tracking
    var lcx=lx+1.5, lcy=ey+0.5, rcx=rx+1.5, rcy=ey+0.5;
    var la=Math.atan2(my-lcy,mx-lcx), ra=Math.atan2(my-rcy,mx-rcx);
    var ld=Math.min(1,Math.hypot(mx-lcx,my-lcy)/20);
    var rd=Math.min(1,Math.hypot(mx-rcx,my-rcy)/20);
    var lpx=Math.round(lcx+Math.cos(la)*ld*0.5);
    var lpy=Math.round(lcy+Math.sin(la)*ld*0.5);
    var rpx=Math.round(rcx+Math.cos(ra)*rd*0.5);
    var rpy=Math.round(rcy+Math.sin(ra)*rd*0.5);
    px(lpx,lpy,M_IRIS); px(lpx,lpy+1,M_IRIS);
    if (isWinking) {
      hline(rx,ey,3,M_HAIR); hline(rx,ey+1,3,M_SKIN);
    } else {
      px(rpx,rpy,M_IRIS); px(rpx,rpy+1,M_IRIS);
    }
  }

  function drawMaikoNeck() {
    hline(17,29,6,M_SKIN); hline(17,30,6,M_SKIN);
    hline(16,31,8,M_SKIN); hline(16,32,8,M_SKIN);
    hline(16,33,8,M_SKS); hline(15,34,10,M_SKS);
    px(17,30,M_SKS); px(22,30,M_SKS);
  }

  function drawMaikoKimono() {
    // V-collar left
    hline(12,35,8,M_KIM); hline(11,36,8,M_KIM);
    hline(10,37,8,M_KIM); hline(9,38,8,M_KIM);
    hline(8,39,8,M_KIM); hline(7,40,9,M_KIM);
    hline(6,41,9,M_KIM); hline(5,42,10,M_KIM);
    // V-collar right
    hline(20,35,8,M_KIM); hline(21,36,8,M_KIM);
    hline(22,37,8,M_KIM); hline(23,38,8,M_KIM);
    hline(24,39,8,M_KIM); hline(24,40,9,M_KIM);
    hline(25,41,9,M_KIM); hline(25,42,10,M_KIM);
    // Gold eri accent
    px(19,35,M_KIM_A); px(20,35,M_KIM_A);
    px(18,36,M_KIM_A); px(19,36,M_KIM_A);
    hline(17,37,4,M_KIM_A); hline(16,38,5,M_KIM_A);
    hline(15,39,6,M_KIM_A); hline(15,40,6,M_KIM_A);
    hline(14,41,7,M_KIM_A); hline(14,42,7,M_KIM_A);
    // Skin in V opening
    px(18,35,M_SKIN); px(17,36,M_SKIN); px(18,36,M_SKIN);
    // Body
    hline(5,43,30,M_KIM); hline(4,44,32,M_KIM);
    hline(4,45,32,M_KIM_L);
    // Obi sash
    hline(4,46,32,M_KIM_A); hline(4,47,32,M_KIM_A);
    // Lower kimono
    hline(4,48,32,M_KIM); hline(4,49,32,M_KIM);
    hline(4,50,32,M_KIM); hline(4,51,32,M_KIM);
    // Pattern
    px(8,44,M_KIM_L); px(15,49,M_KIM_L); px(25,45,M_KIM_L);
    px(30,50,M_KIM_L); px(10,50,M_KIM_A); px(28,48,M_KIM_A);
  }

  function drawMaiko(mx, my) {
    drawMaikoHair(); drawMaikoFace(); drawMaikoEyes(mx, my);
    drawMaikoNeck(); drawMaikoKimono();
  }

  // ==================================================
  //  BEAR (Wood theme)
  // ==================================================
  var B_FUR = '#8a6840', B_FL = '#a88060', B_FD = '#6a4828';
  var B_SNOUT = '#c8a880', B_SL = '#d8b890';
  var B_NOSE = '#1a1010', B_EYE_C = '#1a1010', B_EYE_H = '#fff';
  var B_EAR = '#a06848', B_BELLY = '#c8a880', B_BL = '#d8b890';

  function drawBearEars() {
    // Left ear
    hline(8,1,6,B_FUR); hline(7,2,8,B_FUR); hline(7,3,8,B_FUR); hline(8,4,6,B_FUR);
    hline(9,2,4,B_EAR); hline(9,3,4,B_EAR);
    // Right ear
    hline(26,1,6,B_FUR); hline(25,2,8,B_FUR); hline(25,3,8,B_FUR); hline(26,4,6,B_FUR);
    hline(27,2,4,B_EAR); hline(27,3,4,B_EAR);
  }

  function drawBearHead() {
    hline(13,4,14,B_FUR); hline(11,5,18,B_FUR);
    hline(10,6,20,B_FUR); hline(9,7,22,B_FUR);
    hline(8,8,24,B_FUR);
    for (var r = 9; r <= 18; r++) hline(8,r,24,B_FUR);
    hline(9,19,22,B_FUR); hline(9,20,22,B_FUR);
    hline(10,21,20,B_FUR); hline(11,22,18,B_FUR);
    hline(12,23,16,B_FUR); hline(13,24,14,B_FUR);
    // Fur highlights
    px(12,7,B_FL); px(27,8,B_FL); px(10,13,B_FL); px(29,11,B_FL);
    // Snout
    hline(16,16,8,B_SNOUT); hline(15,17,10,B_SNOUT);
    hline(15,18,10,B_SNOUT); hline(15,19,10,B_SNOUT);
    hline(16,20,8,B_SNOUT);
    hline(17,16,6,B_SL);
    // Nose
    hline(18,16,4,B_NOSE); hline(18,17,4,B_NOSE);
    // Mouth
    px(19,19,B_FD); px(20,19,B_FD);
    px(18,20,B_FD); px(21,20,B_FD);
  }

  function drawBearEyes(mx, my) {
    mx += GAZE_BIAS_X; my += GAZE_BIAS_Y;
    var lx = 12, rx = 23, ey = 11;
    // Bigger eyes: 5w x 4h
    rect(lx,ey,5,4,B_EYE_C); rect(rx,ey,5,4,B_EYE_C);
    var lcx=lx+2.5, lcy=ey+2, rcx=rx+2.5, rcy=ey+2;
    var la=Math.atan2(my-lcy,mx-lcx), ra=Math.atan2(my-rcy,mx-rcx);
    var ld=Math.min(1,Math.hypot(mx-lcx,my-lcy)/20);
    var rd=Math.min(1,Math.hypot(mx-rcx,my-rcy)/20);
    var lpx=Math.round(lcx+Math.cos(la)*ld*1.5);
    var lpy=Math.round(lcy+Math.sin(la)*ld*1.0);
    var rpx=Math.round(rcx+Math.cos(ra)*rd*1.5);
    var rpy=Math.round(rcy+Math.sin(ra)*rd*1.0);
    // 2px highlight for visibility
    px(lpx,lpy,B_EYE_H); px(lpx+1,lpy,B_EYE_H);
    if (isWinking) {
      rect(rx,ey,5,4,B_FUR); hline(rx,ey+2,5,B_FD);
    } else {
      px(rpx,rpy,B_EYE_H); px(rpx+1,rpy,B_EYE_H);
    }
  }

  function drawBearBody() {
    hline(14,25,12,B_FUR); hline(13,26,14,B_FUR);
    hline(12,27,16,B_FUR); hline(11,28,18,B_FUR);
    hline(10,29,20,B_FUR); hline(9,30,22,B_FUR);
    for (var r = 31; r <= 37; r++) hline(8,r,24,B_FUR);
    hline(9,38,22,B_FUR); hline(10,39,20,B_FUR);
    hline(11,40,18,B_FUR); hline(12,41,16,B_FUR);
    // Arms
    hline(5,32,4,B_FD); hline(4,33,5,B_FD); hline(4,34,5,B_FD);
    hline(4,35,5,B_FD); hline(5,36,4,B_FD);
    hline(31,32,4,B_FD); hline(31,33,5,B_FD); hline(31,34,5,B_FD);
    hline(31,35,5,B_FD); hline(31,36,4,B_FD);
    // Paw pads
    px(5,35,B_SNOUT); px(6,35,B_SNOUT);
    px(33,35,B_SNOUT); px(34,35,B_SNOUT);
    // Belly
    hline(15,30,10,B_BELLY); hline(14,31,12,B_BELLY);
    hline(13,32,14,B_BELLY); hline(13,33,14,B_BELLY);
    hline(13,34,14,B_BELLY); hline(13,35,14,B_BELLY);
    hline(14,36,12,B_BELLY); hline(14,37,12,B_BELLY);
    hline(15,38,10,B_BELLY);
    // Belly highlight
    hline(16,33,8,B_BL); hline(16,34,8,B_BL); hline(16,35,8,B_BL);
    // Feet
    hline(10,42,6,B_FD); hline(24,42,6,B_FD);
    hline(10,43,6,B_FD); hline(24,43,6,B_FD);
    hline(10,44,6,B_FD); hline(24,44,6,B_FD);
    // Foot pads
    px(11,44,B_SNOUT); px(13,44,B_SNOUT);
    px(25,44,B_SNOUT); px(27,44,B_SNOUT);
  }

  function drawBear(mx, my) {
    drawBearEars(); drawBearHead(); drawBearEyes(mx, my);
    drawBearBody();
  }

  // ==================================================
  //  Hearts & Main Loop
  // ==================================================
  function drawHeart(hx, hy, size, alpha, color) {
    ctx.globalAlpha = alpha;
    var c = color;
    var x = Math.round(hx), y = Math.round(hy);
    if (size === 0) {
      px(x,y,c); px(x+2,y,c);
      px(x,y+1,c); px(x+1,y+1,c); px(x+2,y+1,c);
      px(x+1,y+2,c);
    } else {
      px(x+1,y,c); px(x+3,y,c);
      px(x,y+1,c); px(x+1,y+1,c); px(x+2,y+1,c); px(x+3,y+1,c); px(x+4,y+1,c);
      px(x,y+2,c); px(x+1,y+2,c); px(x+2,y+2,c); px(x+3,y+2,c); px(x+4,y+2,c);
      px(x+1,y+3,c); px(x+2,y+3,c); px(x+3,y+3,c);
      px(x+2,y+4,c);
    }
    ctx.globalAlpha = 1;
  }

  function updateHearts() {
    for (var i = hearts.length - 1; i >= 0; i--) {
      var h = hearts[i];
      h.x += h.vx; h.y += h.vy; h.life -= 0.015;
      if (h.life <= 0) hearts.splice(i, 1);
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    var theme = getTheme();

    if (theme === 'japanese') {
      drawMaiko(mouseX, mouseY);
    } else if (theme === 'wood') {
      drawBear(mouseX, mouseY);
    } else {
      drawDavid(mouseX, mouseY);
    }

    updateHearts();
    for (var i = 0; i < hearts.length; i++) {
      var h = hearts[i];
      drawHeart(h.x, h.y, h.size, h.life, h.color);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
