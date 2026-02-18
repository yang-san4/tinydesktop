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
  //  DAVID (Vapor / Mac / OSX)
  // ==================================================
  // Extended marble palette for richer shading
  var D_HL   = '#f4ede4';  // highlight
  var D_MARBLE = '#e8ddd0', D_MID = '#d8ccbc', D_SHD = '#c4b4a0';
  var D_DRK = '#a89888', D_DEEP = '#948470';
  var D_HAIR = '#b0a090', D_HAIR_D = '#908070', D_HAIR_DD = '#786858';
  var D_HAIR_L = '#c8baa8', D_LIP = '#d4b0a0', D_LIP_D = '#c0988a';
  var D_EYE = '#f0ece8', D_EYE_S = '#dcd4c8';
  var D_IRIS = '#6a7060', D_IRIS_D = '#4a5040', D_BROW = '#a09080';
  var D_PED = '#a09888', D_PED_L = '#c0b8a8', D_PED_D = '#807068', D_PED_DD = '#685848';

  function drawDavidHair() {
    // Crown volume - bigger, more sculpted curls
    hline(15,0,10,D_HAIR); hline(13,1,14,D_HAIR);
    hline(11,2,18,D_HAIR_D); hline(10,3,20,D_HAIR);
    hline(9,4,22,D_HAIR); hline(9,5,23,D_HAIR_D);
    hline(8,6,24,D_HAIR); hline(8,7,25,D_HAIR);
    hline(8,8,25,D_HAIR_D); hline(9,9,23,D_HAIR);
    hline(9,10,23,D_HAIR);
    // Curl highlights (light catching on top of curls)
    px(15,0,D_HAIR_L); px(18,0,D_HAIR_L); px(21,0,D_HAIR_L);
    px(13,1,D_HAIR_L); px(17,1,D_HAIR_L); px(22,1,D_HAIR_L);
    px(12,2,D_HAIR_L); px(16,3,D_HAIR_L); px(24,2,D_HAIR_L);
    px(14,4,D_HAIR_L); px(20,3,D_HAIR_L); px(27,4,D_HAIR_L);
    px(11,5,D_HAIR_L); px(19,5,D_HAIR_L); px(25,6,D_HAIR_L);
    px(13,7,D_HAIR_L); px(22,7,D_HAIR_L); px(29,7,D_HAIR_L);
    px(10,8,D_HAIR_L); px(17,8,D_HAIR_L); px(26,8,D_HAIR_L);
    // Curl shadows (gaps between curls)
    px(16,1,D_HAIR_DD); px(20,1,D_HAIR_DD); px(14,2,D_HAIR_DD);
    px(19,2,D_HAIR_DD); px(23,3,D_HAIR_DD); px(12,3,D_HAIR_DD);
    px(18,4,D_HAIR_DD); px(25,5,D_HAIR_DD); px(11,4,D_HAIR_DD);
    px(15,5,D_HAIR_DD); px(22,5,D_HAIR_DD); px(28,6,D_HAIR_DD);
    px(13,6,D_HAIR_DD); px(21,6,D_HAIR_DD); px(17,7,D_HAIR_DD);
    px(24,7,D_HAIR_DD); px(12,9,D_HAIR_DD); px(19,9,D_HAIR_DD);
    px(27,9,D_HAIR_DD); px(15,10,D_HAIR_DD); px(23,10,D_HAIR_DD);
    // Sideburns (left)
    hline(8,9,3,D_HAIR_D); hline(7,10,3,D_HAIR);
    hline(7,11,3,D_HAIR); hline(7,12,3,D_HAIR_D);
    hline(8,13,2,D_HAIR); hline(8,14,2,D_HAIR_D);
    px(8,15,D_HAIR_DD); px(8,16,D_HAIR_DD);
    // Sideburns (right)
    hline(30,9,3,D_HAIR_D); hline(30,10,3,D_HAIR);
    hline(30,11,3,D_HAIR); hline(30,12,3,D_HAIR_D);
    hline(30,13,2,D_HAIR); hline(30,14,2,D_HAIR_D);
    px(31,15,D_HAIR_DD); px(31,16,D_HAIR_DD);
  }

  function drawDavidFace() {
    // Forehead - wider, with brow ridge shading
    hline(10,9,20,D_MARBLE); hline(10,10,20,D_MARBLE);
    hline(9,11,22,D_HL);    hline(9,12,22,D_MARBLE);
    // Brow ridge (strong horizontal shadow)
    hline(10,13,20,D_MID);
    // Brow bones - prominent
    hline(12,13,5,D_SHD); hline(23,13,5,D_SHD);
    px(11,13,D_DRK); px(28,13,D_DRK);
    // Under-brow socket shadows
    hline(12,14,5,D_SHD); hline(23,14,5,D_SHD);

    // Eye area (recessed, lighter around eye)
    hline(10,14,2,D_MARBLE); hline(18,14,4,D_MARBLE); hline(28,14,2,D_MARBLE);
    hline(10,15,20,D_MARBLE); hline(10,16,20,D_MARBLE);
    // Cheekbone highlight (strong light from upper-left)
    hline(10,17,3,D_HL); px(11,18,D_HL); px(12,17,D_HL);
    hline(28,17,2,D_MID);

    // Mid face
    hline(10,17,20,D_MARBLE); hline(10,18,20,D_MARBLE);

    // Nose - 3D bridge, tip, and nostrils
    // Bridge (runs from brow to tip)
    px(19,14,D_MID); px(20,14,D_MID);
    px(19,15,D_MID); px(20,15,D_HL);
    px(19,16,D_MID); px(20,16,D_HL);
    px(19,17,D_MID); px(20,17,D_HL);
    // Nose tip (wider, rounded)
    hline(18,18,4,D_MID); px(21,18,D_SHD);
    // Nostrils
    px(18,19,D_DRK); px(21,19,D_DRK);
    hline(18,19,4,D_SHD);
    // Nose shadow underneath
    hline(17,20,6,D_SHD); px(17,20,D_DRK); px(22,20,D_DRK);

    // Ears
    // Left ear
    px(8,14,D_MID); px(8,15,D_MARBLE); px(8,16,D_MARBLE);
    px(8,17,D_MID); px(8,18,D_SHD);
    px(9,14,D_SHD); px(9,15,D_MID); px(9,16,D_MID);
    px(9,17,D_SHD); px(9,18,D_SHD);
    // Right ear
    px(31,14,D_MID); px(31,15,D_MARBLE); px(31,16,D_MARBLE);
    px(31,17,D_MID); px(31,18,D_SHD);
    px(30,14,D_SHD); px(30,15,D_MID); px(30,16,D_MID);
    px(30,17,D_SHD); px(30,18,D_SHD);

    // Cheeks
    hline(11,19,18,D_MARBLE); hline(11,20,18,D_MARBLE);
    hline(11,21,18,D_MARBLE); hline(12,22,16,D_MARBLE);
    // Cheekbone shadow (right side, away from light)
    px(28,18,D_MID); px(28,19,D_MID); px(28,20,D_SHD);
    px(27,19,D_MID);
    // Left cheek highlight
    px(11,19,D_HL); px(12,19,D_HL);

    // Nasolabial folds (subtle)
    px(15,20,D_MID); px(15,21,D_MID);
    px(24,20,D_MID); px(24,21,D_MID);

    // Lips - Cupid's bow shape
    hline(12,23,16,D_MARBLE);
    // Upper lip (darker, Cupid's bow dip in center)
    px(16,22,D_LIP_D); px(17,22,D_LIP_D); px(18,22,D_DRK);
    px(19,23,D_DRK); px(20,23,D_DRK);
    px(21,22,D_DRK); px(22,22,D_LIP_D); px(23,22,D_LIP_D);
    // Upper lip body
    hline(16,23,3,D_LIP_D); hline(21,23,3,D_LIP_D);
    // Lower lip (fuller, lighter, reflects light)
    hline(17,24,6,D_LIP); px(18,24,D_HL); px(19,24,D_HL); px(20,24,D_HL);
    hline(18,25,4,D_LIP);
    // Lip corners
    px(15,23,D_DRK); px(24,23,D_DRK);
    // Shadow under lower lip
    hline(17,26,6,D_SHD);

    // Chin - rounded, prominent
    hline(13,25,14,D_MARBLE); hline(13,26,14,D_MARBLE);
    hline(14,27,12,D_MARBLE); hline(14,28,12,D_MID);
    // Chin highlight (center)
    px(19,27,D_HL); px(20,27,D_HL); px(19,26,D_HL); px(20,26,D_HL);
    // Chin cleft (subtle)
    px(19,28,D_SHD); px(20,28,D_SHD);
    // Jawline
    hline(15,29,10,D_MID); hline(16,30,8,D_SHD);
    // Left jawline contour
    px(10,18,D_MID); px(10,19,D_SHD); px(10,20,D_SHD);
    px(11,21,D_SHD); px(11,22,D_SHD);
    px(12,23,D_SHD); px(12,24,D_SHD); px(13,25,D_SHD);
    // Right jawline contour (deeper shadow)
    px(29,18,D_DRK); px(29,19,D_DRK); px(29,20,D_DRK);
    px(28,21,D_DRK); px(28,22,D_SHD);
    px(27,23,D_SHD); px(27,24,D_SHD); px(26,25,D_SHD);
  }

  function drawDavidEyes(mx, my) {
    mx += GAZE_BIAS_X; my += GAZE_BIAS_Y;
    var lx = 13, rx = 23, ey = 15;
    // Eye sockets (slightly recessed)
    hline(lx-1,ey-1,6,D_SHD); hline(rx-1,ey-1,6,D_SHD);
    // Sclera - almond shaped (wider: 5px)
    hline(lx,ey,5,D_EYE); hline(lx,ey+1,5,D_EYE);
    hline(rx,ey,5,D_EYE); hline(rx,ey+1,5,D_EYE);
    // Eye corners (inner/outer)
    px(lx,ey,D_EYE_S); px(lx+4,ey,D_EYE_S);
    px(rx,ey,D_EYE_S); px(rx+4,ey,D_EYE_S);
    // Upper eyelid line (dark crease)
    hline(lx,ey-1,5,D_DRK); hline(rx,ey-1,5,D_DRK);
    // Lower eyelid (subtle)
    hline(lx+1,ey+2,3,D_EYE_S); hline(rx+1,ey+2,3,D_EYE_S);

    // Iris tracking
    var lcx=lx+2.5, lcy=ey+0.5, rcx=rx+2.5, rcy=ey+0.5;
    var la=Math.atan2(my-lcy,mx-lcx), ra=Math.atan2(my-rcy,mx-rcx);
    var ld=Math.min(1.2,Math.hypot(mx-lcx,my-lcy)/18);
    var rd=Math.min(1.2,Math.hypot(mx-rcx,my-rcy)/18);
    var lpx=Math.round(lcx+Math.cos(la)*ld), lpy=Math.round(lcy+Math.sin(la)*ld*0.5);
    var rpx=Math.round(rcx+Math.cos(ra)*rd), rpy=Math.round(rcy+Math.sin(ra)*rd*0.5);
    // Iris (2px wide for more expression)
    px(lpx,lpy,D_IRIS); px(lpx+1,lpy,D_IRIS);
    px(lpx,lpy+1,D_IRIS_D); px(lpx+1,lpy+1,D_IRIS_D);
    // Pupil highlight
    px(lpx,lpy,D_IRIS_D); px(lpx+1,lpy,'#f0ece8');
    if (isWinking) {
      hline(rx,ey,5,D_DRK); hline(rx,ey+1,5,D_MID);
      px(rx+1,ey+1,D_SHD); px(rx+3,ey+1,D_SHD);
    } else {
      px(rpx,rpy,D_IRIS); px(rpx+1,rpy,D_IRIS);
      px(rpx,rpy+1,D_IRIS_D); px(rpx+1,rpy+1,D_IRIS_D);
      px(rpx,rpy,D_IRIS_D); px(rpx+1,rpy,'#f0ece8');
    }
  }

  function drawDavidNeck() {
    // Neck - with sternocleidomastoid muscle hints
    hline(16,31,8,D_MARBLE); hline(15,32,10,D_MARBLE);
    hline(15,33,10,D_MARBLE); hline(14,34,12,D_MID);
    hline(14,35,12,D_MID); hline(13,36,14,D_MID);
    hline(13,37,14,D_SHD);
    // Throat pit (jugular notch)
    px(19,35,D_SHD); px(20,35,D_SHD);
    px(19,36,D_DRK); px(20,36,D_DRK);
    // Muscle contours
    px(16,32,D_MID); px(16,33,D_SHD); px(16,34,D_SHD);
    px(23,32,D_MID); px(23,33,D_SHD); px(23,34,D_SHD);
    // Neck highlight (left side)
    px(17,32,D_HL); px(17,33,D_HL); px(18,34,D_HL);
    // Neck shadow (right side)
    px(24,32,D_DRK); px(24,33,D_DRK); px(25,34,D_DRK);
    // Shoulder slope
    hline(11,38,18,D_SHD); hline(10,39,20,D_SHD);
    // Collarbone hints
    hline(12,38,4,D_DRK); hline(24,38,4,D_DRK);
    px(14,38,D_MID); px(25,38,D_MID);
  }

  function drawDavidPedestal() {
    // Base connection
    hline(8,40,24,D_DRK);
    // Upper molding (ogee profile)
    hline(7,41,26,D_SHD); hline(6,42,28,D_PED_L);
    hline(5,43,30,D_PED_L);
    // Highlight on molding edge
    px(6,42,D_HL); px(7,42,D_HL); px(32,42,D_PED);
    // Main pedestal body
    hline(4,44,32,D_PED); hline(4,45,32,D_PED);
    hline(4,46,32,D_PED_D);
    // Center inset panel
    hline(8,44,24,D_PED_L); hline(8,45,24,D_PED);
    // Lower section
    hline(6,47,28,D_PED); hline(6,48,28,D_PED);
    hline(6,49,28,D_PED_D);
    // Base molding
    hline(5,50,30,D_PED_D); hline(4,51,32,D_PED_DD);
    // Pedestal shadow gradient (left light, right dark)
    px(4,44,D_PED_L); px(4,45,D_PED_L); px(5,43,D_HL);
    px(35,44,D_PED_D); px(35,45,D_PED_D); px(34,43,D_PED_D);
  }

  function drawDavid(mx, my) {
    drawDavidHair(); drawDavidFace(); drawDavidEyes(mx, my);
    drawDavidNeck(); drawDavidPedestal();
  }

  // ==================================================
  //  MAIKO (Japanese theme)
  // ==================================================
  var M_HAIR = '#1a1020', M_HL = '#2a2038', M_HDD = '#0e0810';
  var M_SKIN = '#f0e8e0', M_SKL = '#f8f0e8', M_SKS = '#e0d0c8', M_SKD = '#d0beb0';
  var M_LIP = '#c8372d', M_LIP_D = '#a02820', M_BLUSH = '#e8b8b0', M_BLUSH_D = '#e0a8a0';
  var M_KR = '#c8372d', M_KR_L = '#e04838', M_KG = '#c8a84e', M_KG_L = '#e0c060';
  var M_KIM = '#8a2020', M_KIM_D = '#6a1818', M_KIM_L = '#a83030', M_KIM_A = '#c8a84e';
  var M_OBI_D = '#a08838';
  var M_EYE = '#f0ece8', M_EYE_S = '#e0d8d0', M_IRIS = '#1a1020', M_BROW = '#3a2030';
  var M_WHITE = '#f8f4f0'; // oshiroi white makeup

  function drawMaikoHair() {
    // Top bun (mage) - rounder, more defined
    hline(16,0,8,M_HAIR); hline(14,1,12,M_HAIR);
    hline(13,2,14,M_HAIR); hline(12,3,16,M_HAIR);
    hline(12,4,16,M_HAIR); hline(13,5,14,M_HAIR);
    hline(14,6,12,M_HAIR);
    // Bun sheen highlights
    px(17,1,M_HL); px(20,1,M_HL); px(22,2,M_HL);
    px(15,2,M_HL); px(19,3,M_HL); px(24,3,M_HL);
    px(16,4,M_HL); px(22,4,M_HL);
    // Bun deep shadows
    px(18,2,M_HDD); px(21,3,M_HDD); px(14,3,M_HDD);
    px(25,4,M_HDD); px(17,5,M_HDD); px(23,5,M_HDD);
    // Decorative comb (kushi) at top
    hline(17,0,6,M_KG); px(18,0,M_KG_L); px(21,0,M_KG_L);
    // Kanzashi ornaments (left - hanging)
    px(10,2,M_KG); px(9,3,M_KR); px(10,3,M_KR_L);
    px(8,4,M_KR); px(9,4,M_KG_L); px(10,4,M_KR);
    px(9,5,M_KG); px(10,5,M_KR);
    // Kanzashi (right - hanging)
    px(30,2,M_KG); px(31,3,M_KR); px(30,3,M_KR_L);
    px(32,4,M_KR); px(31,4,M_KG_L); px(30,4,M_KR);
    px(31,5,M_KG); px(30,5,M_KR);
    // Main hair - sleeker with lacquer sheen
    hline(10,7,20,M_HAIR); hline(9,8,22,M_HAIR);
    hline(9,9,22,M_HAIR); hline(9,10,22,M_HAIR);
    // Sheen on main hair
    px(14,7,M_HL); px(20,7,M_HL); px(26,8,M_HL);
    px(12,9,M_HL); px(18,9,M_HL); px(24,9,M_HL);
    // Side hair (tabo) framing face
    hline(9,11,3,M_HAIR); hline(28,11,3,M_HAIR);
    hline(9,12,3,M_HAIR); hline(28,12,3,M_HAIR);
    hline(9,13,2,M_HAIR); hline(29,13,2,M_HAIR);
    hline(9,14,2,M_HAIR); hline(29,14,2,M_HAIR);
    hline(10,15,2,M_HAIR); hline(28,15,2,M_HAIR);
    hline(10,16,2,M_HAIR); hline(28,16,2,M_HAIR);
    hline(10,17,2,M_HAIR); hline(28,17,2,M_HAIR);
    // Side hair sheen
    px(10,12,M_HL); px(29,11,M_HL);
  }

  function drawMaikoFace() {
    // Oshiroi (white makeup) base - very pale
    // Forehead
    hline(12,10,16,M_WHITE); hline(12,11,16,M_WHITE);
    hline(11,12,18,M_SKL); hline(11,13,18,M_SKIN);
    hline(11,14,18,M_SKIN);
    // Eye area
    hline(12,15,16,M_SKIN); hline(12,16,16,M_SKIN);
    hline(12,17,16,M_SKIN);
    // Mid face
    hline(12,18,16,M_SKIN); hline(12,19,16,M_SKIN);
    hline(12,20,16,M_SKIN);

    // Nose - delicate, refined
    px(20,16,M_SKS); px(20,17,M_SKS); // bridge hint
    px(19,18,M_SKS); px(20,18,M_SKS); // tip
    hline(19,19,3,M_SKS); // nostrils subtle
    px(18,19,M_SKD); px(21,19,M_SKD); // nostril shadows

    // Blush (more diffuse, traditional oval)
    px(13,17,M_BLUSH); px(14,17,M_BLUSH);
    px(13,18,M_BLUSH); px(14,18,M_BLUSH_D); px(15,18,M_BLUSH);
    px(13,19,M_BLUSH);
    px(25,17,M_BLUSH); px(26,17,M_BLUSH);
    px(25,18,M_BLUSH_D); px(26,18,M_BLUSH); px(24,18,M_BLUSH);
    px(26,19,M_BLUSH);

    // Mouth area
    hline(13,20,14,M_SKIN); hline(13,21,14,M_SKIN); hline(13,22,14,M_SKIN);
    hline(14,23,12,M_SKIN);
    // Lips - traditional small, bee-stung shape (ochoboguchi)
    // Upper lip (tiny, dark)
    px(19,21,M_LIP_D); px(20,21,M_LIP_D);
    // Lower lip (fuller red, centered)
    hline(18,22,4,M_LIP); px(19,22,M_KR_L); px(20,22,M_KR_L);
    // Lip highlight
    px(19,22,M_KR_L);
    // Shadow under lower lip
    px(19,23,M_SKS); px(20,23,M_SKS);

    // Chin - soft oval
    hline(14,24,12,M_SKIN); hline(15,25,10,M_SKIN);
    hline(15,26,10,M_SKS); hline(16,27,8,M_SKS);
    hline(17,28,6,M_SKD);
    // Chin center highlight
    px(19,25,M_SKL); px(20,25,M_SKL);

    // Face contour shadows
    px(12,17,M_SKS); px(12,18,M_SKS); px(12,19,M_SKS);
    px(13,20,M_SKS); px(13,21,M_SKS); px(14,22,M_SKS); px(14,23,M_SKS);
    px(27,17,M_SKS); px(27,18,M_SKS); px(27,19,M_SKS);
    px(26,20,M_SKS); px(26,21,M_SKS); px(25,22,M_SKS); px(25,23,M_SKS);
    // Forehead highlight (oshiroi sheen)
    px(18,10,M_SKL); px(19,10,M_SKL); px(20,11,M_SKL);
  }

  function drawMaikoEyes(mx, my) {
    mx += GAZE_BIAS_X; my += GAZE_BIAS_Y;
    var lx = 14, rx = 23, ey = 16;
    // Wider almond eyes (4px wide)
    hline(lx,ey,4,M_EYE); hline(lx,ey+1,4,M_EYE);
    hline(rx,ey,4,M_EYE); hline(rx,ey+1,4,M_EYE);
    // Eye corners
    px(lx,ey,M_EYE_S); px(lx+3,ey,M_EYE_S);
    px(rx,ey,M_EYE_S); px(rx+3,ey,M_EYE_S);
    // Eyeliner (thick, winged - traditional)
    hline(lx-1,ey-1,5,M_HAIR); hline(rx-1,ey-1,5,M_HAIR);
    // Wing extensions
    px(lx-1,ey,M_HAIR); px(rx+4,ey,M_HAIR);
    // Red inner eyeliner (traditional maiko style)
    px(lx,ey+2,M_KR); px(lx+1,ey+2,M_KR);
    px(rx+2,ey+2,M_KR); px(rx+3,ey+2,M_KR);
    // Brows (thin, elegant arches)
    hline(14,13,4,M_BROW); px(13,14,M_BROW);
    hline(23,13,4,M_BROW); px(27,14,M_BROW);

    // Iris tracking
    var lcx=lx+2, lcy=ey+0.5, rcx=rx+2, rcy=ey+0.5;
    var la=Math.atan2(my-lcy,mx-lcx), ra=Math.atan2(my-rcy,mx-rcx);
    var ld=Math.min(1,Math.hypot(mx-lcx,my-lcy)/18);
    var rd=Math.min(1,Math.hypot(mx-rcx,my-rcy)/18);
    var lpx=Math.round(lcx+Math.cos(la)*ld*0.7);
    var lpy=Math.round(lcy+Math.sin(la)*ld*0.5);
    var rpx=Math.round(rcx+Math.cos(ra)*rd*0.7);
    var rpy=Math.round(rcy+Math.sin(ra)*rd*0.5);
    // Iris (2px)
    px(lpx,lpy,M_IRIS); px(lpx+1,lpy,M_IRIS);
    px(lpx,lpy+1,M_IRIS); px(lpx+1,lpy+1,M_HDD);
    // Highlight catch light
    px(lpx+1,lpy,M_HL);
    if (isWinking) {
      hline(rx,ey,4,M_HAIR); hline(rx,ey+1,4,M_SKIN);
      px(rx+1,ey+1,M_SKS);
    } else {
      px(rpx,rpy,M_IRIS); px(rpx+1,rpy,M_IRIS);
      px(rpx,rpy+1,M_IRIS); px(rpx+1,rpy+1,M_HDD);
      px(rpx+1,rpy,M_HL);
    }
  }

  function drawMaikoNeck() {
    // Nape (unuji) - the famous W-shaped white nape
    hline(17,29,6,M_SKIN); hline(17,30,6,M_SKIN);
    hline(16,31,8,M_SKIN); hline(16,32,8,M_SKIN);
    hline(16,33,8,M_SKS); hline(15,34,10,M_SKS);
    // Neck shadow contours
    px(17,31,M_SKS); px(22,31,M_SKS);
    px(16,33,M_SKD); px(23,33,M_SKD);
    // Nape highlight (center)
    px(19,30,M_SKL); px(20,30,M_SKL);
  }

  function drawMaikoKimono() {
    // V-collar left (layers visible)
    hline(12,35,8,M_KIM); hline(11,36,8,M_KIM);
    hline(10,37,8,M_KIM); hline(9,38,8,M_KIM);
    hline(8,39,8,M_KIM); hline(7,40,9,M_KIM);
    hline(6,41,9,M_KIM); hline(5,42,10,M_KIM);
    // V-collar right
    hline(20,35,8,M_KIM); hline(21,36,8,M_KIM);
    hline(22,37,8,M_KIM); hline(23,38,8,M_KIM);
    hline(24,39,8,M_KIM); hline(24,40,9,M_KIM);
    hline(25,41,9,M_KIM); hline(25,42,10,M_KIM);
    // Kimono fold shadows (left collar)
    px(12,35,M_KIM_D); px(11,36,M_KIM_D); px(10,37,M_KIM_D);
    px(9,38,M_KIM_D); px(8,39,M_KIM_D); px(7,40,M_KIM_D);
    // Kimono fold highlights (right collar)
    px(27,35,M_KIM_L); px(28,36,M_KIM_L); px(29,37,M_KIM_L);
    px(31,39,M_KIM_L); px(32,40,M_KIM_L);
    // Gold eri (collar) accent - with gradient
    px(19,35,M_KIM_A); px(20,35,M_KIM_A);
    px(18,36,M_KIM_A); px(19,36,M_KG_L);
    hline(17,37,4,M_KIM_A); px(18,37,M_KG_L);
    hline(16,38,5,M_KIM_A); px(17,38,M_KG_L);
    hline(15,39,6,M_KIM_A); hline(15,40,6,M_KIM_A);
    hline(14,41,7,M_KIM_A); hline(14,42,7,M_KIM_A);
    // Eri highlight
    px(16,39,M_KG_L); px(17,40,M_KG_L); px(15,41,M_KG_L);
    // White under-collar (juban) visible
    px(18,35,M_WHITE); px(19,35,M_WHITE);
    px(17,36,M_WHITE); px(18,36,M_WHITE);
    px(16,37,M_WHITE); px(17,37,M_WHITE);
    // Skin in V opening
    px(18,35,M_SKIN); px(17,36,M_SKIN);
    // Body
    hline(5,43,30,M_KIM); hline(4,44,32,M_KIM);
    hline(4,45,32,M_KIM_L);
    // Kimono fold texture
    px(6,43,M_KIM_D); px(8,43,M_KIM_L); px(30,43,M_KIM_D);
    px(5,44,M_KIM_D); px(10,44,M_KIM_L); px(32,44,M_KIM_D);
    // Obi sash (wider, with musubi bow detail)
    hline(4,46,32,M_KIM_A); hline(4,47,32,M_KIM_A);
    hline(4,48,32,M_OBI_D);
    // Obi highlight and texture
    px(6,46,M_KG_L); px(12,46,M_KG_L); px(20,47,M_KG_L); px(28,46,M_KG_L);
    px(8,47,M_OBI_D); px(16,47,M_OBI_D); px(24,47,M_OBI_D); px(32,47,M_OBI_D);
    // Obi-jime cord (center tie)
    hline(4,47,32,M_KR); px(18,47,M_KR_L); px(20,47,M_KR_L);
    // Lower kimono
    hline(4,49,32,M_KIM); hline(4,50,32,M_KIM);
    hline(4,51,32,M_KIM_D);
    // Kimono patterns (floral motif dots)
    px(8,44,M_KIM_L); px(9,44,M_KG);
    px(25,45,M_KIM_L); px(26,45,M_KG);
    px(15,49,M_KIM_L); px(16,49,M_KG); px(16,50,M_KIM_L);
    px(28,49,M_KIM_L); px(29,50,M_KG);
    px(7,50,M_KIM_L); px(8,50,M_KG);
    px(33,50,M_KIM_L); px(34,49,M_KG);
  }

  function drawMaiko(mx, my) {
    drawMaikoHair(); drawMaikoFace(); drawMaikoEyes(mx, my);
    drawMaikoNeck(); drawMaikoKimono();
  }

  // ==================================================
  //  BEAR (Wood theme)
  // ==================================================
  var B_FUR = '#8a6840', B_FL = '#a88060', B_FLL = '#c0986a';
  var B_FD = '#6a4828', B_FDD = '#503818';
  var B_SNOUT = '#c8a880', B_SL = '#d8b890', B_SD = '#b09068';
  var B_NOSE = '#1a1010', B_NOSE_H = '#383030';
  var B_EYE_C = '#1a1010', B_EYE_H = '#fff';
  var B_EAR = '#a06848', B_EAR_D = '#805838';
  var B_BELLY = '#c8a880', B_BL = '#d8b890', B_BD = '#b09068';
  var B_PAD = '#4a3020', B_PAD_L = '#5a4030';

  function drawBearEars() {
    // Left ear - rounder, with depth
    hline(8,0,6,B_FUR); hline(7,1,8,B_FUR); hline(6,2,9,B_FUR);
    hline(6,3,9,B_FUR); hline(7,4,8,B_FUR); hline(8,5,6,B_FUR);
    // Inner ear (pink-brown)
    hline(8,1,4,B_EAR); hline(8,2,5,B_EAR); hline(8,3,5,B_EAR); hline(9,4,3,B_EAR);
    // Inner ear shadow
    px(8,2,B_EAR_D); px(8,3,B_EAR_D); px(9,3,B_EAR_D);
    // Ear fur highlights
    px(7,1,B_FL); px(13,1,B_FL);
    // Right ear
    hline(26,0,6,B_FUR); hline(25,1,8,B_FUR); hline(25,2,9,B_FUR);
    hline(25,3,9,B_FUR); hline(25,4,8,B_FUR); hline(26,5,6,B_FUR);
    hline(28,1,4,B_EAR); hline(27,2,5,B_EAR); hline(27,3,5,B_EAR); hline(28,4,3,B_EAR);
    px(31,2,B_EAR_D); px(31,3,B_EAR_D); px(30,3,B_EAR_D);
    px(32,1,B_FL); px(27,1,B_FL);
  }

  function drawBearHead() {
    // Head shape - rounder, fluffier
    hline(13,5,14,B_FUR); hline(11,6,18,B_FUR);
    hline(10,7,20,B_FUR); hline(9,8,22,B_FUR);
    hline(8,9,24,B_FUR);
    for (var r = 10; r <= 19; r++) hline(8,r,24,B_FUR);
    hline(9,20,22,B_FUR); hline(9,21,22,B_FUR);
    hline(10,22,20,B_FUR); hline(11,23,18,B_FUR);
    hline(12,24,16,B_FUR); hline(13,25,14,B_FUR);

    // Fur texture - scattered highlights and shadows
    px(11,7,B_FL); px(16,6,B_FL); px(24,6,B_FL); px(28,8,B_FL);
    px(10,10,B_FL); px(14,8,B_FLL); px(22,8,B_FL); px(29,10,B_FL);
    px(9,14,B_FL); px(30,13,B_FL); px(10,18,B_FL); px(29,17,B_FL);
    px(12,7,B_FD); px(18,6,B_FD); px(27,7,B_FD);
    px(9,11,B_FD); px(30,12,B_FD); px(9,16,B_FD); px(30,16,B_FD);
    // Forehead tuft (lighter)
    px(19,8,B_FLL); px(20,8,B_FLL); px(18,9,B_FL); px(21,9,B_FL);

    // Snout - rounder, more 3D
    hline(16,16,8,B_SNOUT); hline(15,17,10,B_SNOUT);
    hline(14,18,12,B_SNOUT); hline(14,19,12,B_SNOUT);
    hline(15,20,10,B_SNOUT); hline(16,21,8,B_SNOUT);
    // Snout highlight (top)
    hline(17,16,6,B_SL); hline(16,17,8,B_SL);
    // Snout shadow (bottom)
    hline(16,21,8,B_SD); px(14,19,B_SD); px(25,19,B_SD);

    // Nose - shiny, 3D
    hline(18,15,4,B_NOSE); hline(17,16,6,B_NOSE); hline(18,17,4,B_NOSE);
    // Nose highlight (wet look)
    px(18,15,B_NOSE_H); px(19,15,B_NOSE_H);
    // Nostrils
    px(18,17,B_FDD); px(21,17,B_FDD);

    // Mouth - W shape smile
    px(19,20,B_FDD); px(20,20,B_FDD);
    px(17,20,B_FD); px(22,20,B_FD);
    px(16,19,B_FD); px(23,19,B_FD);
    // Tongue hint
    px(19,21,B_EAR); px(20,21,B_EAR);

    // Cheek fluff
    hline(8,14,3,B_FL); hline(29,14,3,B_FL);
    px(8,15,B_FLL); px(31,15,B_FLL);
  }

  function drawBearEyes(mx, my) {
    mx += GAZE_BIAS_X; my += GAZE_BIAS_Y;
    var lx = 12, rx = 24, ey = 11;
    // Rounder eyes: 5w x 5h
    rect(lx,ey,5,5,B_EYE_C);
    rect(rx,ey,5,5,B_EYE_C);
    // Eye shape rounding (remove corners)
    px(lx,ey,B_FUR); px(lx+4,ey,B_FUR);
    px(lx,ey+4,B_FUR); px(lx+4,ey+4,B_FUR);
    px(rx,ey,B_FUR); px(rx+4,ey,B_FUR);
    px(rx,ey+4,B_FUR); px(rx+4,ey+4,B_FUR);

    var lcx=lx+2.5, lcy=ey+2.5, rcx=rx+2.5, rcy=ey+2.5;
    var la=Math.atan2(my-lcy,mx-lcx), ra=Math.atan2(my-rcy,mx-rcx);
    var ld=Math.min(1.2,Math.hypot(mx-lcx,my-lcy)/18);
    var rd=Math.min(1.2,Math.hypot(mx-rcx,my-rcy)/18);
    var lpx=Math.round(lcx+Math.cos(la)*ld*1.2);
    var lpy=Math.round(lcy+Math.sin(la)*ld*0.8);
    var rpx=Math.round(rcx+Math.cos(ra)*rd*1.2);
    var rpy=Math.round(rcy+Math.sin(ra)*rd*0.8);
    // 2x2 highlight for cute sparkle
    px(lpx,lpy,B_EYE_H); px(lpx+1,lpy,B_EYE_H);
    px(lpx,lpy+1,'#c0c0c0');
    if (isWinking) {
      rect(rx,ey,5,5,B_FUR);
      px(rx,ey+2,B_FUR); px(rx+4,ey+2,B_FUR);
      hline(rx,ey+2,5,B_FD); hline(rx+1,ey+3,3,B_FD);
      // Happy squint
      px(rx+1,ey+1,B_FDD); px(rx+3,ey+1,B_FDD);
    } else {
      px(rpx,rpy,B_EYE_H); px(rpx+1,rpy,B_EYE_H);
      px(rpx,rpy+1,'#c0c0c0');
    }
    // Brow fur tufts
    hline(lx,ey-1,5,B_FD); hline(rx,ey-1,5,B_FD);
    px(lx+1,ey-1,B_FDD); px(rx+3,ey-1,B_FDD);
  }

  function drawBearBody() {
    // Neck
    hline(14,26,12,B_FUR); hline(13,27,14,B_FUR);
    hline(12,28,16,B_FUR); hline(11,29,18,B_FUR);
    hline(10,30,20,B_FUR); hline(9,31,22,B_FUR);
    // Body
    for (var r = 32; r <= 38; r++) hline(8,r,24,B_FUR);
    hline(9,39,22,B_FUR); hline(10,40,20,B_FUR);
    hline(11,41,18,B_FUR); hline(12,42,16,B_FUR);

    // Body fur texture
    px(10,31,B_FL); px(28,32,B_FL); px(9,34,B_FLL); px(30,35,B_FL);
    px(11,37,B_FL); px(29,38,B_FL);
    px(10,33,B_FD); px(29,34,B_FD); px(9,36,B_FD); px(30,37,B_FD);

    // Arms - rounder, thicker
    hline(5,32,4,B_FUR); hline(4,33,5,B_FUR); hline(3,34,6,B_FUR);
    hline(3,35,6,B_FUR); hline(4,36,5,B_FUR); hline(5,37,4,B_FUR);
    hline(31,32,4,B_FUR); hline(31,33,5,B_FUR); hline(31,34,6,B_FUR);
    hline(31,35,6,B_FUR); hline(31,36,5,B_FUR); hline(31,37,4,B_FUR);
    // Arm shadow
    px(5,32,B_FD); px(4,33,B_FD); px(3,34,B_FD);
    px(34,33,B_FD); px(35,34,B_FD); px(35,35,B_FD);
    // Arm highlight
    px(7,33,B_FL); px(7,34,B_FL);
    px(32,33,B_FL); px(32,34,B_FL);

    // Paw pads (detailed: 3 small + 1 big)
    // Left paw
    hline(4,37,4,B_FD);
    px(4,36,B_PAD); px(5,36,B_PAD_L); px(7,36,B_PAD);
    hline(4,37,5,B_PAD); px(5,37,B_PAD_L);
    // Right paw
    hline(32,37,4,B_FD);
    px(32,36,B_PAD); px(33,36,B_PAD_L); px(35,36,B_PAD);
    hline(31,37,5,B_PAD); px(33,37,B_PAD_L);

    // Belly - rounder, with gradient
    hline(15,31,10,B_BELLY); hline(14,32,12,B_BELLY);
    hline(13,33,14,B_BELLY); hline(13,34,14,B_BELLY);
    hline(13,35,14,B_BELLY); hline(13,36,14,B_BELLY);
    hline(14,37,12,B_BELLY); hline(14,38,12,B_BELLY);
    hline(15,39,10,B_BELLY);
    // Belly highlight (center glow)
    hline(17,33,6,B_BL); hline(16,34,8,B_BL);
    hline(16,35,8,B_BL); hline(17,36,6,B_BL);
    // Belly shadow (bottom)
    hline(15,38,10,B_BD); hline(16,39,8,B_BD);
    // Belly button hint
    px(19,37,B_BD); px(20,37,B_BD);

    // Feet - rounder with visible toes
    hline(10,43,7,B_FD); hline(9,44,8,B_FD); hline(9,45,8,B_FD);
    hline(23,43,7,B_FD); hline(23,44,8,B_FD); hline(23,45,8,B_FD);
    // Foot pads
    hline(10,45,3,B_PAD); hline(13,45,2,B_PAD);
    hline(24,45,3,B_PAD); hline(27,45,2,B_PAD);
    // Toe beans!
    px(10,44,B_PAD); px(12,44,B_PAD); px(14,44,B_PAD);
    px(24,44,B_PAD); px(26,44,B_PAD); px(28,44,B_PAD);
    // Toe bean highlights
    px(11,44,B_PAD_L); px(13,44,B_PAD_L);
    px(25,44,B_PAD_L); px(27,44,B_PAD_L);
    // Foot fur highlight
    px(11,43,B_FL); px(25,43,B_FL);
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
