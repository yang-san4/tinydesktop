// ===== TinyWeb - Fake Browser =====

(function () {
  var content = document.getElementById('browser-content');
  var urlInput = document.getElementById('browser-url');
  var backBtn = document.getElementById('browser-back');
  var fwdBtn = document.getElementById('browser-forward');
  var goBtn = document.getElementById('browser-go');
  var loadingBar = document.getElementById('browser-loading');

  var historyStack = [];
  var historyIdx = -1;
  var isNavigating = false;

  // ----- Theme detection -----
  function getTheme() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return 'japanese';
    if (scr.classList.contains('theme-wood')) return 'wood';
    if (scr.classList.contains('theme-mac')) return 'mac';
    if (scr.classList.contains('theme-osx')) return 'osx';
    return 'vapor';
  }

  function getAccentColor() {
    var t = getTheme();
    if (t === 'japanese') return '#c8372d';
    if (t === 'wood') return '#c8a050';
    if (t === 'mac') return '#333';
    if (t === 'osx') return '#3478f6';
    return '#b967ff';
  }

  function getLinkColor() {
    var t = getTheme();
    if (t === 'japanese') return '#c8a84e';
    if (t === 'wood') return '#e0d0a0';
    if (t === 'mac') return '#0000cc';
    if (t === 'osx') return '#3478f6';
    return '#00fff0';
  }

  // ----- Pixel Art Helper -----
  // rows: array of strings (each char = 1 pixel), pal: char->color map, s: scale
  function pxArt(rows, pal, s) {
    s = s || 2;
    var sh = [], w = 0;
    for (var y = 0; y < rows.length; y++) {
      if (rows[y].length > w) w = rows[y].length;
      for (var x = 0; x < rows[y].length; x++) {
        var c = pal[rows[y][x]];
        if (c) sh.push((x * s) + 'px ' + (y * s) + 'px 0 0 ' + c);
      }
    }
    if (!sh.length) return '';
    return '<div style="display:inline-block;width:' + (w * s) + 'px;height:' + (rows.length * s) + 'px;' +
      'position:relative;overflow:hidden;vertical-align:middle;">' +
      '<div style="position:absolute;top:0;left:0;width:' + s + 'px;height:' + s + 'px;' +
      'box-shadow:' + sh.join(',') + ';"></div></div>';
  }

  // ----- Pixel Art Data -----

  // Computer monitor for home page
  var artMonitor = [
    '..MMMMMMMMMM..',
    '..MMMMMMMMMM..',
    '..MCSSSSSSCM..',
    '..MCSSSSSSCM..',
    '..MCSSSGSSCM..',
    '..MCSSGGSSCM..',
    '..MCSSSSSSCM..',
    '..MCSSSSSSCM..',
    '..MMMMMMMMMM..',
    '..MMMMMMMMMM..',
    '.....DDDD.....',
    '....DDDDDD....',
    '...DDDDDDDD...'
  ];
  var palMonitor = { M: '#888', C: '#666', S: '#3a78b0', G: '#48c848', D: '#777' };

  // Magnifying glass for search
  var artSearch = [
    '...GGGG...',
    '..G....G..',
    '.G......G.',
    'G........G',
    'G........G',
    '.G......G.',
    '..G....G..',
    '...GGGG...',
    '........HH',
    '.........HH'
  ];
  var palSearch = { G: '#88aacc', H: '#aaa' };

  // Clownfish
  var artClown = [
    '....OOO.......',
    '...OWWOO......',
    '..OOOWWOOO....',
    '.OOBWWWOOOOTT.',
    '..OOOWWOOO....',
    '...OWWOO......',
    '....OOO.......'
  ];
  var palClown = { O: '#ff6020', W: '#fff', B: '#222', T: '#ff8848' };

  // Neon tetra
  var artTetra = [
    '....BBB......',
    '...BBBBS.....',
    '..BBEBBSSS...',
    '..BBRRRSSSTT.',
    '...BBBBS.....',
    '....BBB......'
  ];
  var palTetra = { B: '#30c8e0', R: '#e03030', S: '#c0c0c0', E: '#222', T: '#c8c8c8' };

  // Angelfish (tall)
  var artAngel = [
    '....F....',
    '...FF....',
    '...FFF...',
    '..FFFF...',
    '..FEFFF..',
    '.FFFFFF..',
    '..FFFFF..',
    '...FFF...',
    '....FFTT.',
    '....F....'
  ];
  var palAngel = { F: '#ffc820', E: '#222', T: '#ffa000' };

  // Blue tang
  var artTang = [
    '....BBBB......',
    '...BBBBBB.....',
    '..BBEBBBBYY...',
    '.BBBBBBBBYYY..',
    '..BBBBBBYY....',
    '...BBBBBY.....',
    '....BBBB......'
  ];
  var palTang = { B: '#3888ff', Y: '#ffd830', E: '#222' };

  // Sun (large for current weather)
  var artSunBig = [
    '.R...R...R.',
    '..R..R..R..',
    '...YYYYY...',
    '..YYYYYYY..',
    'R.YYOOOYY.R',
    '..YYYYYYY..',
    'R.YYOOOYY.R',
    '..YYYYYYY..',
    '...YYYYY...',
    '..R..R..R..',
    '.R...R...R.'
  ];
  var palSunBig = { Y: '#ffd700', O: '#ffaa00', R: '#ffcc00' };

  // Sun (small for forecast)
  var artSunSm = [
    '.R.R.R.',
    '..YYY..',
    'R.YOY.R',
    '..YYY..',
    '.R.R.R.'
  ];
  var palSunSm = { Y: '#ffd700', O: '#ffaa00', R: '#ffcc00' };

  // Cloud (small)
  var artCloud = [
    '..CCC....',
    '.CCCCC...',
    'CCCCCCCC.',
    'CCCCCCCCC',
    '.CCCCCCC.'
  ];
  var palCloud = { C: '#aabbcc' };

  // Rain
  var artRain = [
    '..CCC....',
    '.CCCCC...',
    'CCCCCCCC.',
    'CCCCCCCCC',
    '.CCCCCCC.',
    '..D.D.D..',
    '.D.D.D...'
  ];
  var palRain = { C: '#8899aa', D: '#5588cc' };

  // Partly cloudy
  var artPartly = [
    '.R.R.....',
    '..YY.CC..',
    'R.YYCCCCC',
    '..YYCCCCC',
    '..CCCCCC.',
    '.CCCCCCC.'
  ];
  var palPartly = { Y: '#ffd700', R: '#ffcc00', C: '#aabbcc' };

  // Cat (for news)
  var artCat = [
    '.E...E.',
    'EE.E.EE',
    'EEEEEEE',
    'EEBEBEE',
    'EEENEE.',
    '.EEEEE.',
    '.E...E.',
    '.EE.EE.'
  ];
  var palCat = { E: '#b08860', B: '#222', N: '#e07080' };

  // Fish (small, for news)
  var artFishSm = [
    '..OOO...',
    '.OOOOO..',
    'OOBOOOTT',
    '.OOOOO..',
    '..OOO...'
  ];
  var palFishSm = { O: '#ff8040', B: '#222', T: '#ff6020' };

  // Maze (small, for news)
  var artMazeSm = [
    'WWWWWWWW',
    'W..W...W',
    'W.WW.W.W',
    'W....W.W',
    'W.WW.W.W',
    'W.W..W.W',
    'W.W.WW.W',
    'WWWWWWWW'
  ];
  var palMazeSm = { W: '#6688aa' };

  // Paint/theme (small, for news)
  var artPaint = [
    '..RRGBB.',
    '.RRRGGBB',
    'RRRGGBBB',
    'RRRGBBBB',
    '.RRRBBB.',
    '...HH...',
    '...HH...',
    '....H...'
  ];
  var palPaint = { R: '#e04040', G: '#40c040', B: '#4080e0', H: '#aa8844' };

  // Guestbook user avatars
  var artAvatar1 = [
    '.HHH.',
    'HHHHH',
    'HBHBH',
    'HHMHH',
    '.SSS.',
    'SSSSS'
  ];
  var palAvatar1 = { H: '#ffcc88', B: '#333', M: '#dd6666', S: '#5588cc' };

  var artAvatar2 = [
    '.HHH.',
    'HHHHH',
    'HBHBH',
    'HHMHH',
    '.SSS.',
    'SSSSS'
  ];
  var palAvatar2 = { H: '#ffcc88', B: '#333', M: '#dd6666', S: '#cc5555' };

  var artAvatar3 = [
    '.HHH.',
    'HHHHH',
    'HBHBH',
    'HHMHH',
    '.SSS.',
    'SSSSS'
  ];
  var palAvatar3 = { H: '#ffcc88', B: '#333', M: '#dd6666', S: '#44aa44' };

  var artAvatar4 = [
    '.HHH.',
    'HHHHH',
    'HBHBH',
    'HHMHH',
    '.SSS.',
    'SSSSS'
  ];
  var palAvatar4 = { H: '#ffcc88', B: '#333', M: '#dd6666', S: '#cc8844' };

  var artAvatar5 = [
    '.HHH.',
    'HHHHH',
    'HBHBH',
    'HHMHH',
    '.SSS.',
    'SSSSS'
  ];
  var palAvatar5 = { H: '#ffcc88', B: '#333', M: '#dd6666', S: '#8855cc' };

  // 404 broken page
  var art404 = [
    '.PPPPPPPP.',
    '.PPPPPPPP.',
    '.PP....PP.',
    '.PP....PP.',
    '.PP.XX.PP.',
    '.PP.XX.PP.',
    '.PP....PP.',
    '.PP....PP.',
    '.PPPPPPPP.',
    '.PPPPPPPP.'
  ];
  var pal404 = { P: '#555', X: '#cc4444' };

  // Error disconnect
  var artErr = [
    '..LLLL....',
    '.LLLLLL...',
    'LLLLLLLL..',
    '.LLLLLL...',
    '..LLLL.XX.',
    '......XXXX',
    '.....XX...',
    '..RRRR.XX.',
    '.RRRRRR...',
    'RRRRRRRR..',
    '.RRRRRR...',
    '..RRRR....'
  ];
  var palErr = { L: '#44aa44', R: '#cc4444', X: '#ffcc00' };

  // ----- Pages -----
  var pages = {};

  pages['tiny://home'] = function () {
    var accent = getAccentColor();
    var link = getLinkColor();
    var monitor = pxArt(artMonitor, palMonitor, 2);
    return '<div style="text-align:center;padding:6px 4px;">' +
      '<div style="margin-bottom:4px;">' + monitor + '</div>' +
      '<div style="font-size:8px;color:' + accent + ';margin-bottom:2px;">TinyWeb</div>' +
      '<div style="font-size:4px;color:#888;margin-bottom:6px;">Welcome to the Tiny Internet</div>' +
      '<div style="border-top:1px solid #444;margin:4px 0;"></div>' +
      '<div style="font-size:4px;text-align:left;line-height:2.2;">' +
        '<div style="font-size:5px;color:' + accent + ';margin-bottom:3px;">Bookmarks</div>' +
        '<a class="blink" data-href="tiny://search" style="color:' + link + '">TinySearch - Web Search</a><br>' +
        '<a class="blink" data-href="tiny://news" style="color:' + link + '">TinyNews - Daily Headlines</a><br>' +
        '<a class="blink" data-href="tiny://fish" style="color:' + link + '">Fish Wiki - Fish Guide</a><br>' +
        '<a class="blink" data-href="tiny://weather" style="color:' + link + '">TinyWeather - Forecast</a><br>' +
        '<a class="blink" data-href="tiny://videos" style="color:' + link + '">TinyTube - Watch Videos</a><br>' +
        '<a class="blink" data-href="tiny://guestbook" style="color:' + link + '">Guestbook - Say Hello!</a>' +
      '</div>' +
      '<div style="border-top:1px solid #444;margin:6px 0 3px;"></div>' +
      '<div style="font-size:3px;color:#666;">TinyWeb Browser v0.1 | 640KB Memory</div>' +
    '</div>';
  };

  pages['tiny://search'] = function () {
    var accent = getAccentColor();
    var link = getLinkColor();
    var glass = pxArt(artSearch, palSearch, 2);
    return '<div style="text-align:center;padding:8px 4px 6px;">' +
      '<div style="margin-bottom:4px;">' + glass + '</div>' +
      '<div style="font-size:9px;color:' + accent + ';margin-bottom:6px;">TinySearch</div>' +
      '<div style="display:flex;gap:2px;margin-bottom:6px;">' +
        '<input id="search-input" type="text" style="flex:1;font-family:\'Press Start 2P\',monospace;font-size:4px;padding:2px 3px;border:1px solid #888;background:#1a1a2a;color:#fff;outline:none;" placeholder="Search the tiny web...">' +
        '<button id="search-btn" style="font-family:\'Press Start 2P\',monospace;font-size:4px;padding:2px 4px;background:' + accent + ';border:1px solid #888;color:#fff;cursor:pointer;">Go</button>' +
      '</div>' +
      '<div id="search-results" style="text-align:left;font-size:4px;line-height:2;"></div>' +
      '<div style="border-top:1px solid #333;margin:6px 0 3px;"></div>' +
      '<div style="font-size:3px;color:#555;">Indexing 8 pages on the tiny web</div>' +
    '</div>';
  };

  pages['tiny://news'] = function () {
    var accent = getAccentColor();
    var link = getLinkColor();
    var d = new Date();
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dateStr = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    var catImg = pxArt(artCat, palCat, 2);
    var fishImg = pxArt(artFishSm, palFishSm, 2);
    var mazeImg = pxArt(artMazeSm, palMazeSm, 2);
    var paintImg = pxArt(artPaint, palPaint, 2);
    return '<div style="padding:4px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ' + accent + ';padding-bottom:2px;margin-bottom:4px;">' +
        '<span style="font-size:6px;color:' + accent + ';">TinyNews</span>' +
        '<span style="font-size:3px;color:#888;">' + dateStr + '</span>' +
      '</div>' +
      '<div style="font-size:4px;line-height:2;">' +
        '<div style="display:flex;gap:4px;margin-bottom:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + catImg + '</div>' +
          '<div>' +
            '<div style="font-size:5px;color:' + link + ';">Pixel Cat Seen on Desktop</div>' +
            '<div style="color:#999;">Residents report a small cat wandering near windows.</div>' +
          '</div>' +
        '</div>' +
        '<div style="border-top:1px solid #333;margin:3px 0;"></div>' +
        '<div style="display:flex;gap:4px;margin-bottom:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + fishImg + '</div>' +
          '<div>' +
            '<div style="font-size:5px;color:' + link + ';">Aquarium Fish Stable at 4</div>' +
            '<div style="color:#999;">The tiny aquarium ecosystem remains balanced.</div>' +
          '</div>' +
        '</div>' +
        '<div style="border-top:1px solid #333;margin:3px 0;"></div>' +
        '<div style="display:flex;gap:4px;margin-bottom:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + mazeImg + '</div>' +
          '<div>' +
            '<div style="font-size:5px;color:' + link + ';">3D Maze Record Broken</div>' +
            '<div style="color:#999;">Maze completed in under 30 seconds!</div>' +
          '</div>' +
        '</div>' +
        '<div style="border-top:1px solid #333;margin:3px 0;"></div>' +
        '<div style="display:flex;gap:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + paintImg + '</div>' +
          '<div>' +
            '<div style="font-size:5px;color:' + link + ';">New Theme "Aqua" Available</div>' +
            '<div style="color:#999;">A refreshing blue theme for TinyOS.</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  pages['tiny://fish'] = function () {
    var accent = getAccentColor();
    var link = getLinkColor();
    var clown = pxArt(artClown, palClown, 2);
    var tetra = pxArt(artTetra, palTetra, 2);
    var angel = pxArt(artAngel, palAngel, 2);
    var tang = pxArt(artTang, palTang, 2);
    return '<div style="padding:4px;">' +
      '<div style="font-size:6px;color:' + accent + ';border-bottom:1px solid ' + accent + ';padding-bottom:2px;margin-bottom:4px;">Fish Wiki</div>' +
      '<div style="font-size:4px;line-height:1.8;">' +
        '<div style="display:flex;gap:4px;margin-bottom:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + clown + '</div>' +
          '<div>' +
            '<span style="color:' + link + ';font-size:5px;">Clownfish</span><br>' +
            '<span style="color:#999;">Orange with white stripes. Lives in coral reefs. Famous from movies.</span>' +
          '</div>' +
        '</div>' +
        '<div style="border-top:1px solid #333;margin:3px 0;"></div>' +
        '<div style="display:flex;gap:4px;margin-bottom:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + tetra + '</div>' +
          '<div>' +
            '<span style="color:' + link + ';font-size:5px;">Neon Tetra</span><br>' +
            '<span style="color:#999;">Tiny iridescent fish with blue and red stripes. Swims in schools.</span>' +
          '</div>' +
        '</div>' +
        '<div style="border-top:1px solid #333;margin:3px 0;"></div>' +
        '<div style="display:flex;gap:4px;margin-bottom:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + angel + '</div>' +
          '<div>' +
            '<span style="color:' + link + ';font-size:5px;">Angelfish</span><br>' +
            '<span style="color:#999;">Elegant triangle-shaped fish. Graceful and slow-moving.</span>' +
          '</div>' +
        '</div>' +
        '<div style="border-top:1px solid #333;margin:3px 0;"></div>' +
        '<div style="display:flex;gap:4px;align-items:flex-start;">' +
          '<div style="flex-shrink:0;padding-top:1px;">' + tang + '</div>' +
          '<div>' +
            '<span style="color:' + link + ';font-size:5px;">Blue Tang</span><br>' +
            '<span style="color:#999;">Bright blue body with yellow tail. Loves to explore.</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="border-top:1px solid #333;margin:4px 0 2px;"></div>' +
      '<div style="font-size:3px;color:#666;">Fish Wiki - A project of TinyOS Aquarium</div>' +
    '</div>';
  };

  pages['tiny://weather'] = function () {
    var accent = getAccentColor();
    var sunBig = pxArt(artSunBig, palSunBig, 2);
    var forecasts = [
      { day: 'Today', art: artSunSm, pal: palSunSm, temp: '72', desc: 'Sunny' },
      { day: 'Tue', art: artCloud, pal: palCloud, temp: '68', desc: 'Cloudy' },
      { day: 'Wed', art: artRain, pal: palRain, temp: '65', desc: 'Rain' },
      { day: 'Thu', art: artPartly, pal: palPartly, temp: '70', desc: 'Partly' },
      { day: 'Fri', art: artSunSm, pal: palSunSm, temp: '69', desc: 'Sunny' }
    ];
    var html = '<div style="padding:4px;">' +
      '<div style="font-size:6px;color:' + accent + ';border-bottom:1px solid ' + accent + ';padding-bottom:2px;margin-bottom:4px;">TinyWeather</div>' +
      '<div style="text-align:center;margin-bottom:6px;">' +
        '<div style="margin-bottom:2px;">' + sunBig + '</div>' +
        '<div style="font-size:7px;color:' + accent + ';">72F</div>' +
        '<div style="font-size:4px;color:#999;">Tiny City, TinyOS</div>' +
        '<div style="font-size:4px;color:#888;">Sunny - feels like pixel perfect</div>' +
      '</div>' +
      '<div style="display:flex;gap:2px;justify-content:space-around;border-top:1px solid #333;padding-top:4px;">';
    for (var i = 0; i < forecasts.length; i++) {
      var f = forecasts[i];
      var icon = pxArt(f.art, f.pal, 2);
      html += '<div style="text-align:center;font-size:4px;">' +
        '<div style="color:#888;">' + f.day + '</div>' +
        '<div style="margin:2px 0;">' + icon + '</div>' +
        '<div style="color:' + accent + ';">' + f.temp + 'F</div>' +
      '</div>';
    }
    html += '</div></div>';
    return html;
  };

  pages['tiny://guestbook'] = function () {
    var accent = getAccentColor();
    var link = getLinkColor();
    var avatars = [
      pxArt(artAvatar1, palAvatar1, 2),
      pxArt(artAvatar2, palAvatar2, 2),
      pxArt(artAvatar3, palAvatar3, 2),
      pxArt(artAvatar4, palAvatar4, 2),
      pxArt(artAvatar5, palAvatar5, 2)
    ];
    var entries = [
      { name: 'PixelCat', date: '02/18', msg: 'Meow! Love this desktop :3' },
      { name: 'FishFan99', date: '02/17', msg: 'The aquarium is so calming~' },
      { name: 'MazeMaster', date: '02/16', msg: 'Beat the maze in 20 seconds!' },
      { name: 'DavidFan', date: '02/15', msg: 'David winks at me <3' },
      { name: 'RetroGamer', date: '02/14', msg: 'Minesweeper is addicting' }
    ];
    var html = '<div style="padding:4px;">' +
      '<div style="font-size:6px;color:' + accent + ';border-bottom:1px solid ' + accent + ';padding-bottom:2px;margin-bottom:4px;">Guestbook</div>' +
      '<div style="font-size:4px;color:#888;margin-bottom:4px;">Leave a message for everyone!</div>';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      html += '<div style="display:flex;gap:3px;border:1px solid #333;padding:2px 3px;margin-bottom:2px;align-items:center;">' +
        '<div style="flex-shrink:0;">' + avatars[i] + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;justify-content:space-between;">' +
            '<span style="color:' + link + ';">' + e.name + '</span>' +
            '<span style="color:#666;font-size:3px;">' + e.date + '</span>' +
          '</div>' +
          '<div style="color:#ccc;font-size:4px;">' + e.msg + '</div>' +
        '</div>' +
      '</div>';
    }
    html += '<div style="margin-top:4px;display:flex;gap:2px;">' +
      '<input id="gb-input" type="text" style="flex:1;font-family:\'Press Start 2P\',monospace;font-size:4px;padding:2px 3px;border:1px solid #888;background:#1a1a2a;color:#fff;outline:none;" placeholder="Your message...">' +
      '<button id="gb-send" style="font-family:\'Press Start 2P\',monospace;font-size:3px;padding:2px 4px;background:' + accent + ';border:1px solid #888;color:#fff;cursor:pointer;">Post</button>' +
    '</div>' +
    '</div>';
    return html;
  };

  // ----- TinyTube: Video animations -----
  var videoAnimId = null; // track active animation

  function stopVideoAnim() {
    if (videoAnimId) { cancelAnimationFrame(videoAnimId); videoAnimId = null; }
  }

  // Animation: Fish Tank
  function animFish(ctx, w, h, frame) {
    // Water
    ctx.fillStyle = '#0a2848';
    ctx.fillRect(0, 0, w, h);
    // Sandy bottom
    ctx.fillStyle = '#c8a860';
    ctx.fillRect(0, h - 5, w, 5);
    ctx.fillStyle = '#b09848';
    for (var i = 0; i < w; i += 7) ctx.fillRect(i, h - 5, 3, 1);
    // Seaweed
    for (var s = 0; s < 3; s++) {
      var sx = 10 + s * 30;
      ctx.fillStyle = '#208040';
      for (var sy = 0; sy < 12; sy++) {
        var sway = Math.sin((frame * 0.06) + s + sy * 0.3) * 2;
        ctx.fillRect(sx + sway, h - 6 - sy, 2, 2);
      }
    }
    // Bubbles
    for (var b = 0; b < 4; b++) {
      var bx = 15 + b * 20;
      var by = h - ((frame * 0.8 + b * 15) % (h + 5));
      ctx.fillStyle = 'rgba(150,200,255,0.5)';
      ctx.fillRect(bx, by, 2, 2);
    }
    // Fish
    var fishData = [
      { color: '#ff6030', speed: 0.6, y: 12, size: 4 },
      { color: '#40e0d0', speed: -0.4, y: 22, size: 3 },
      { color: '#ffd700', speed: 0.5, y: 30, size: 4 },
      { color: '#60a0ff', speed: -0.7, y: 18, size: 3 }
    ];
    for (var fi = 0; fi < fishData.length; fi++) {
      var fd = fishData[fi];
      var fx = ((frame * fd.speed + fi * 30) % (w + 16)) - 8;
      if (fd.speed < 0) fx = w - fx;
      var fy = fd.y + Math.sin(frame * 0.08 + fi) * 3;
      ctx.fillStyle = fd.color;
      var dir = fd.speed > 0 ? 1 : -1;
      // body
      ctx.fillRect(fx, fy, fd.size * 2, fd.size);
      ctx.fillRect(fx - dir, fy + 1, fd.size * 2 + 2, fd.size - 2);
      // tail
      ctx.fillRect(fx - dir * (fd.size), fy - 1, fd.size - 1, fd.size + 2);
      // eye
      ctx.fillStyle = '#fff';
      ctx.fillRect(fx + (dir > 0 ? fd.size * 2 - 2 : 0), fy + 1, 1, 1);
    }
  }

  // Animation: Cat (indoor room)
  function animCat(ctx, w, h, frame) {
    // Room wall
    ctx.fillStyle = '#e8ddd0';
    ctx.fillRect(0, 0, w, h);

    // Wallpaper subtle stripe
    ctx.fillStyle = '#e0d5c8';
    for (var sp = 0; sp < w; sp += 8) {
      ctx.fillRect(sp, 0, 1, h - 8);
    }

    // Window (left side)
    var winX = 4, winY = 3, winW = 18, winH = 16;
    ctx.fillStyle = '#a08060';
    ctx.fillRect(winX - 1, winY - 1, winW + 2, winH + 2);
    // Sky through window
    ctx.fillStyle = '#80c8f0';
    ctx.fillRect(winX, winY, winW, winH);
    // Cloud through window
    ctx.fillStyle = '#fff';
    var cloudX = (frame * 0.06) % 20 - 4;
    ctx.fillRect(winX + Math.floor(cloudX), winY + 3, 6, 2);
    ctx.fillRect(winX + Math.floor(cloudX) + 1, winY + 2, 4, 1);
    // Window cross frame
    ctx.fillStyle = '#a08060';
    ctx.fillRect(winX + Math.floor(winW / 2) - 1, winY, 2, winH);
    ctx.fillRect(winX, winY + Math.floor(winH / 2) - 1, winW, 2);
    // Curtains
    ctx.fillStyle = '#d0a880';
    ctx.fillRect(winX, winY, 3, winH);
    ctx.fillRect(winX + winW - 3, winY, 3, winH);
    ctx.fillStyle = '#c89870';
    ctx.fillRect(winX + 1, winY, 1, winH);
    ctx.fillRect(winX + winW - 2, winY, 1, winH);

    // Bookshelf (right side)
    var shX = w - 18, shY = 4;
    ctx.fillStyle = '#906838';
    ctx.fillRect(shX, shY, 16, 20);
    ctx.fillStyle = '#a07848';
    ctx.fillRect(shX + 1, shY, 14, 1);
    ctx.fillRect(shX + 1, shY + 9, 14, 1);
    // Books
    var bookColors = ['#c03030','#3050a0','#208040','#d0a020','#6030a0','#c06020','#306080','#a03060'];
    for (var shelf = 0; shelf < 2; shelf++) {
      var sy = shY + 1 + shelf * 10;
      var bx = shX + 1;
      for (var bk = 0; bk < 5; bk++) {
        var bkh = 5 + ((bk * 3 + shelf * 7) % 4);
        ctx.fillStyle = bookColors[(bk + shelf * 5) % bookColors.length];
        ctx.fillRect(bx, sy + (8 - bkh), 2, bkh);
        bx += 3;
      }
    }

    // Picture frame on wall
    var pfx = Math.floor(w / 2) - 1, pfy = 4;
    ctx.fillStyle = '#906838';
    ctx.fillRect(pfx, pfy, 10, 8);
    ctx.fillStyle = '#b0d8a0';
    ctx.fillRect(pfx + 1, pfy + 1, 8, 6);
    // Tiny landscape in frame
    ctx.fillStyle = '#70b8e0';
    ctx.fillRect(pfx + 1, pfy + 1, 8, 3);
    ctx.fillStyle = '#60a050';
    ctx.fillRect(pfx + 1, pfy + 4, 8, 3);
    ctx.fillStyle = '#508040';
    ctx.fillRect(pfx + 2, pfy + 3, 3, 2);

    // Floor (wooden planks)
    var floorY = h - 8;
    ctx.fillStyle = '#c09860';
    ctx.fillRect(0, floorY, w, 8);
    ctx.fillStyle = '#b08850';
    for (var pl = 0; pl < w; pl += 10) {
      ctx.fillRect(pl, floorY, 1, 8);
    }
    ctx.fillStyle = '#b89058';
    ctx.fillRect(0, floorY, w, 1);

    // Rug
    var rugX = Math.floor(w / 2) - 14;
    ctx.fillStyle = '#c05050';
    ctx.fillRect(rugX, floorY + 1, 28, 6);
    ctx.fillStyle = '#d06060';
    ctx.fillRect(rugX + 1, floorY + 2, 26, 4);
    // Rug pattern
    ctx.fillStyle = '#c04848';
    ctx.fillRect(rugX + 3, floorY + 3, 22, 1);
    ctx.fillRect(rugX + 3, floorY + 5, 22, 1);

    // Sunbeam on floor (drawn before cat so cat is on top)
    ctx.fillStyle = '#ede2d6';
    ctx.fillRect(winX + winW + 2, floorY + 1, 10, 6);
    ctx.fillStyle = '#e8dcd0';
    ctx.fillRect(winX + winW + 4, floorY - 2, 6, 3);

    // Cat body (sitting on rug)
    var cx = Math.floor(w / 2) - 6;
    var cy = floorY - 12;
    var blink = (frame % 70) < 4;
    var sleeping = (frame % 160) > 80;

    ctx.fillStyle = '#b08860';
    // ears
    ctx.fillRect(cx + 1, cy, 3, 3);
    ctx.fillRect(cx + 8, cy, 3, 3);
    // inner ear
    ctx.fillStyle = '#d0a880';
    ctx.fillRect(cx + 2, cy + 1, 1, 1);
    ctx.fillRect(cx + 9, cy + 1, 1, 1);
    // head
    ctx.fillStyle = '#b08860';
    ctx.fillRect(cx, cy + 2, 12, 8);
    ctx.fillRect(cx + 1, cy + 1, 10, 9);
    // Tabby stripes on head
    ctx.fillStyle = '#987040';
    ctx.fillRect(cx + 2, cy + 3, 2, 1);
    ctx.fillRect(cx + 8, cy + 3, 2, 1);
    ctx.fillRect(cx + 5, cy + 2, 2, 1);
    // eyes
    if (!blink && !sleeping) {
      ctx.fillStyle = '#222';
      ctx.fillRect(cx + 3, cy + 5, 2, 2);
      ctx.fillRect(cx + 8, cy + 5, 2, 2);
      ctx.fillStyle = '#80e0a0';
      ctx.fillRect(cx + 3, cy + 5, 1, 1);
      ctx.fillRect(cx + 8, cy + 5, 1, 1);
    } else {
      // Closed eyes (happy squint)
      ctx.fillStyle = '#555';
      ctx.fillRect(cx + 3, cy + 6, 2, 1);
      ctx.fillRect(cx + 8, cy + 6, 2, 1);
    }
    // nose
    ctx.fillStyle = '#e07080';
    ctx.fillRect(cx + 5, cy + 7, 2, 1);
    // whiskers
    ctx.fillStyle = '#ccc';
    ctx.fillRect(cx - 2, cy + 7, 3, 1);
    ctx.fillRect(cx + 11, cy + 7, 3, 1);
    ctx.fillRect(cx - 1, cy + 8, 2, 1);
    ctx.fillRect(cx + 11, cy + 8, 2, 1);
    // body
    ctx.fillStyle = '#b08860';
    ctx.fillRect(cx + 1, cy + 10, 10, 8);
    ctx.fillRect(cx, cy + 11, 12, 6);
    // Tabby stripes on body
    ctx.fillStyle = '#987040';
    ctx.fillRect(cx + 2, cy + 12, 8, 1);
    ctx.fillRect(cx + 3, cy + 15, 6, 1);
    // tail
    var tailWag = Math.sin(frame * 0.08) * 2;
    ctx.fillStyle = '#b08860';
    ctx.fillRect(cx + 11, cy + 13 + Math.floor(tailWag), 3, 2);
    ctx.fillRect(cx + 13, cy + 12 + Math.floor(tailWag), 3, 2);
    ctx.fillRect(cx + 15, cy + 10 + Math.floor(tailWag), 2, 2);
    // Tail stripe
    ctx.fillStyle = '#987040';
    ctx.fillRect(cx + 14, cy + 12 + Math.floor(tailWag), 1, 1);
    // paws
    ctx.fillStyle = '#c0a070';
    ctx.fillRect(cx + 1, cy + 17, 3, 2);
    ctx.fillRect(cx + 8, cy + 17, 3, 2);

    // Zzz when sleeping
    if (sleeping) {
      ctx.fillStyle = '#88aacc';
      var zFloat = (frame % 80) * 0.08;
      var zx = cx + 14, zy = cy - 3 - zFloat;
      // z1
      ctx.fillRect(Math.floor(zx), Math.floor(zy), 3, 1);
      ctx.fillRect(Math.floor(zx) + 2, Math.floor(zy) + 1, 1, 1);
      ctx.fillRect(Math.floor(zx), Math.floor(zy) + 2, 3, 1);
      // z2 (smaller, higher)
      if (zFloat > 2) {
        ctx.fillStyle = '#99bbdd';
        ctx.fillRect(Math.floor(zx) + 4, Math.floor(zy) - 2, 2, 1);
        ctx.fillRect(Math.floor(zx) + 5, Math.floor(zy) - 1, 1, 1);
        ctx.fillRect(Math.floor(zx) + 4, Math.floor(zy), 2, 1);
      }
    }

    // Yarn ball on floor
    var yarnX = cx - 12, yarnY = floorY - 3;
    ctx.fillStyle = '#e04060';
    ctx.fillRect(yarnX, yarnY, 4, 3);
    ctx.fillRect(yarnX + 1, yarnY - 1, 2, 1);
    ctx.fillRect(yarnX + 1, yarnY + 3, 2, 1);
    // Yarn string
    ctx.fillStyle = '#e04060';
    ctx.fillRect(yarnX + 4, yarnY + 1, 2, 1);
    ctx.fillRect(yarnX + 5, yarnY + 2, 2, 1);
    ctx.fillRect(yarnX + 6, yarnY + 1, 1, 1);
  }

  // Animation: Starfield / Space
  function animStars(ctx, w, h, frame) {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);
    // Stars moving toward viewer (simple)
    for (var i = 0; i < 30; i++) {
      var seed = i * 7919 + 1;
      var sx = ((seed * 13) % w);
      var sy = ((seed * 29) % h);
      // Move outward from center
      var dx = sx - w / 2;
      var dy = sy - h / 2;
      var t = (frame * 0.02 + i * 0.1) % 1;
      var px = w / 2 + dx * (1 + t * 2);
      var py = h / 2 + dy * (1 + t * 2);
      if (px < 0 || px >= w || py < 0 || py >= h) continue;
      var brightness = Math.floor(t * 255);
      var size = t > 0.5 ? 2 : 1;
      ctx.fillStyle = 'rgb(' + brightness + ',' + brightness + ',' + Math.min(255, brightness + 50) + ')';
      ctx.fillRect(px, py, size, size);
    }
  }

  // Animation: Piano keys
  function animPiano(ctx, w, h, frame) {
    ctx.fillStyle = '#1a1018';
    ctx.fillRect(0, 0, w, h);
    // Title area
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = '#888';
    ctx.fillRect(10, 3, 3, 4); ctx.fillRect(14, 3, 3, 4); // music notes
    ctx.fillRect(11, 1, 1, 3); ctx.fillRect(15, 1, 1, 3);
    // Keys
    var keyW = Math.floor(w / 8);
    var keyH = h - 14;
    var notePattern = [0, 1, 0, 1, 0, 0, 1, 0]; // 0=white, 1=black
    for (var k = 0; k < 8; k++) {
      var kx = k * keyW;
      // Active note changes every few frames
      var activeKey = Math.floor(frame / 5) % 8;
      var isActive = k === activeKey;
      if (notePattern[k] === 0) {
        ctx.fillStyle = isActive ? '#aaaacc' : '#f0f0f0';
        ctx.fillRect(kx, 12, keyW - 1, keyH);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(kx, 12 + keyH - 1, keyW - 1, 1);
      }
    }
    for (var k = 0; k < 8; k++) {
      var kx = k * keyW;
      var activeKey = Math.floor(frame / 5) % 8;
      var isActive = k === activeKey;
      if (notePattern[k] === 1) {
        ctx.fillStyle = isActive ? '#444466' : '#222';
        ctx.fillRect(kx + 1, 12, keyW - 3, keyH * 0.6);
      }
    }
    // Floating notes
    for (var n = 0; n < 5; n++) {
      var nx = 10 + n * 16 + Math.sin(frame * 0.05 + n) * 4;
      var ny = 30 - ((frame * 0.3 + n * 10) % 35);
      if (ny < 2) continue;
      ctx.fillStyle = ['#ff71ce', '#b967ff', '#00fff0', '#ffd700', '#ff6030'][n];
      ctx.fillRect(nx, ny, 2, 3);
      ctx.fillRect(nx + 2, ny, 1, 1);
    }
  }

  // Animation: Sand timer
  function animSand(ctx, w, h, frame) {
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, w, h);
    var cx = Math.floor(w / 2);
    var cy = Math.floor(h / 2);
    // Hourglass frame
    ctx.fillStyle = '#a08848';
    ctx.fillRect(cx - 14, cy - 18, 28, 2);
    ctx.fillRect(cx - 14, cy + 16, 28, 2);
    // Glass shape
    ctx.fillStyle = '#182030';
    // Top half (trapezoid)
    for (var y = 0; y < 16; y++) {
      var halfW = 12 - Math.floor(y * 12 / 16);
      ctx.fillRect(cx - halfW, cy - 16 + y, halfW * 2, 1);
    }
    // Bottom half (inverted trapezoid)
    for (var y = 0; y < 16; y++) {
      var halfW = Math.floor(y * 12 / 16);
      ctx.fillRect(cx - halfW, cy + y, halfW * 2, 1);
    }
    // Sand in top (decreasing)
    var sandLevel = 1 - ((frame * 0.005) % 1);
    ctx.fillStyle = '#d8b848';
    for (var y = 0; y < Math.floor(16 * sandLevel); y++) {
      var fromBottom = Math.floor(16 * sandLevel) - y;
      var halfW = 12 - Math.floor((16 - fromBottom) * 12 / 16);
      halfW = Math.max(0, halfW);
      ctx.fillRect(cx - halfW, cy - fromBottom, halfW * 2, 1);
    }
    // Sand in bottom (increasing)
    var botLevel = (frame * 0.005) % 1;
    ctx.fillStyle = '#d8b848';
    for (var y = 0; y < Math.floor(16 * botLevel); y++) {
      var fromBottom = y;
      var halfW = Math.floor(fromBottom * 12 / 16);
      ctx.fillRect(cx - halfW, cy + 16 - fromBottom - 1, halfW * 2, 1);
    }
    // Falling sand stream
    ctx.fillStyle = '#d8b848';
    ctx.fillRect(cx - 1, cy - 2, 2, 4);
    // Particles
    for (var p = 0; p < 3; p++) {
      var py = cy + ((frame * 1.5 + p * 5) % 14);
      var px = cx - 1 + ((p * 3 + frame) % 3) - 1;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // Animation: 3D Maze walkthrough
  function animMaze(ctx, w, h, frame) {
    // Column-based raycasting walkthrough (Wolfenstein 3D style)
    // 8x8 maze: 1=wall, 0=open — snake-shaped corridor
    var maze = [
      1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,1,
      1,1,1,1,1,1,0,1,
      1,0,0,0,0,0,0,1,
      1,0,1,1,1,1,1,1,
      1,0,0,0,0,0,0,1,
      1,1,1,1,1,1,0,1,
      1,1,1,1,1,1,1,1
    ];
    var MZ = 8;

    // Waypoints along the path (cell centers)
    var wp = [
      [1.5,1.5],[2.5,1.5],[3.5,1.5],[4.5,1.5],[5.5,1.5],[6.5,1.5],
      [6.5,2.5],[6.5,3.5],
      [5.5,3.5],[4.5,3.5],[3.5,3.5],[2.5,3.5],[1.5,3.5],
      [1.5,4.5],[1.5,5.5],
      [2.5,5.5],[3.5,5.5],[4.5,5.5],[5.5,5.5],[6.5,5.5],
      [6.5,6.5]
    ];

    var totalSeg = wp.length - 1;
    var SPD = 10;
    var totalF = totalSeg * SPD;
    var pauseF = 24;
    var cycleF = totalF + pauseF;
    var t = frame % cycleF;

    var atGoal = t >= totalF;
    var si = atGoal ? totalSeg - 1 : Math.floor(t / SPD);
    var st = atGoal ? 1.0 : (t % SPD) / SPD;

    // Position: linear interpolation
    var ni = Math.min(si + 1, wp.length - 1);
    var px = wp[si][0] + (wp[ni][0] - wp[si][0]) * st;
    var py = wp[si][1] + (wp[ni][1] - wp[si][1]) * st;

    // Direction angle per segment
    function segAng(i) {
      if (i < 0) i = 0;
      if (i >= totalSeg) i = totalSeg - 1;
      return Math.atan2(wp[i + 1][1] - wp[i][1], wp[i + 1][0] - wp[i][0]);
    }

    // Smooth angle blending at turns
    var ang = segAng(si);
    if (si < totalSeg - 1 && st > 0.55) {
      var na = segAng(si + 1);
      while (na - ang > Math.PI) na -= Math.PI * 2;
      while (na - ang < -Math.PI) na += Math.PI * 2;
      var bt = (st - 0.55) / 0.45;
      bt = bt * bt * (3 - 2 * bt);
      ang = ang + (na - ang) * bt * 0.5;
    }
    if (si > 0 && st < 0.45) {
      var pa = segAng(si - 1);
      while (pa - ang > Math.PI) pa -= Math.PI * 2;
      while (pa - ang < -Math.PI) pa += Math.PI * 2;
      var bt2 = 1 - st / 0.45;
      bt2 = bt2 * bt2 * (3 - 2 * bt2);
      ang = ang + (pa - ang) * bt2 * 0.5;
    }

    // Camera bob
    var bob = atGoal ? 0 : Math.sin(frame * 0.25) * 0.6;
    var halfH = Math.floor(h / 2);
    var FOV = 1.047; // ~60 degrees
    var halfFOV = FOV / 2;

    // Ceiling
    ctx.fillStyle = '#0e0e18';
    ctx.fillRect(0, 0, w, halfH);
    // Floor
    ctx.fillStyle = '#28283a';
    ctx.fillRect(0, halfH, w, h - halfH);

    // Floor depth lines
    for (var fl = 0; fl < 4; fl++) {
      var fy = halfH + 3 + fl * (3 + fl);
      if (fy >= h) break;
      ctx.fillStyle = 'rgba(60,60,80,0.15)';
      ctx.fillRect(0, fy, w, 1);
    }

    // Raycast each column
    for (var c = 0; c < w; c++) {
      var ra = ang - halfFOV + (c / w) * FOV;
      var rdx = Math.cos(ra);
      var rdy = Math.sin(ra);

      var mx = Math.floor(px), my = Math.floor(py);
      var ddx = Math.abs(1 / (rdx || 0.0001));
      var ddy = Math.abs(1 / (rdy || 0.0001));
      var sx, sy, sdx, sdy;

      if (rdx < 0) { sx = -1; sdx = (px - mx) * ddx; }
      else { sx = 1; sdx = (mx + 1 - px) * ddx; }
      if (rdy < 0) { sy = -1; sdy = (py - my) * ddy; }
      else { sy = 1; sdy = (my + 1 - py) * ddy; }

      var side = 0, hit = false;
      for (var stp = 0; stp < 16; stp++) {
        if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
        else { sdy += ddy; my += sy; side = 1; }
        if (mx >= 0 && mx < MZ && my >= 0 && my < MZ && maze[my * MZ + mx]) { hit = true; break; }
      }
      if (!hit) continue;

      // Perpendicular distance (fisheye corrected)
      var dist = side === 0 ? sdx - ddx : sdy - ddy;
      if (dist < 0.05) dist = 0.05;

      // Wall strip
      var wh = Math.floor(h * 0.85 / dist);
      var ds = Math.floor((h - wh) / 2 + bob);
      var de = ds + wh;

      // N/S walls lighter, E/W darker — distance fog
      var shade = Math.max(0.12, 1 - dist / 7);
      var base = side === 1 ? [90, 152, 210] : [55, 110, 168];
      var r = Math.floor(base[0] * shade);
      var g = Math.floor(base[1] * shade);
      var b = Math.floor(base[2] * shade);

      var y0 = Math.max(0, ds), y1 = Math.min(h, de);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillRect(c, y0, 1, y1 - y0);
    }

    // Crosshair
    var chx = Math.floor(w / 2), chy = halfH;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(chx - 2, chy, 5, 1);
    ctx.fillRect(chx, chy - 2, 1, 5);

    // Minimap (top-right)
    var ms = Math.min(16, Math.floor(w * 0.2));
    var mmx = w - ms - 2, mmy = 2;
    var cs = ms / MZ;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mmx - 1, mmy - 1, ms + 2, ms + 2);
    for (var ry = 0; ry < MZ; ry++) {
      for (var rx = 0; rx < MZ; rx++) {
        if (maze[ry * MZ + rx]) {
          ctx.fillStyle = '#3a5878';
          ctx.fillRect(Math.floor(mmx + rx * cs), Math.floor(mmy + ry * cs), Math.ceil(cs), Math.ceil(cs));
        }
      }
    }
    // Player dot
    ctx.fillStyle = '#0f0';
    ctx.fillRect(Math.floor(mmx + px * cs) - 1, Math.floor(mmy + py * cs) - 1, 2, 2);
    // Goal blink
    if (frame % 16 < 10) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(Math.floor(mmx + 6.5 * cs) - 1, Math.floor(mmy + 6.5 * cs) - 1, 2, 2);
    }

    // Goal reached overlay
    if (atGoal) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, halfH - 5, w, 10);
      // Pixel text "GOAL!"
      ctx.fillStyle = '#ffd700';
      var tx = Math.floor(w / 2) - 10, ty = halfH - 2;
      ctx.fillRect(tx,ty,3,1); ctx.fillRect(tx,ty,1,5); ctx.fillRect(tx,ty+4,3,1); ctx.fillRect(tx+2,ty+2,1,3);
      tx += 4;
      ctx.fillRect(tx,ty,3,1); ctx.fillRect(tx,ty,1,5); ctx.fillRect(tx,ty+4,3,1); ctx.fillRect(tx+2,ty,1,5);
      tx += 4;
      ctx.fillRect(tx,ty,3,1); ctx.fillRect(tx,ty,1,5); ctx.fillRect(tx+2,ty,1,5); ctx.fillRect(tx,ty+2,3,1);
      tx += 4;
      ctx.fillRect(tx,ty,1,5); ctx.fillRect(tx,ty+4,3,1);
      tx += 4;
      ctx.fillRect(tx,ty,1,3); ctx.fillRect(tx,ty+4,1,1);
    }
  }

  // Animation: Sunny City Walk (daytime city with nature)
  function animCity(ctx, w, h, frame) {
    var ground = h - 8;

    // Sky gradient (bright blue)
    ctx.fillStyle = '#58b0e8';
    ctx.fillRect(0, 0, w, Math.floor(h * 0.25));
    ctx.fillStyle = '#70c0f0';
    ctx.fillRect(0, Math.floor(h * 0.25), w, Math.floor(h * 0.15));
    ctx.fillStyle = '#90d0f8';
    ctx.fillRect(0, Math.floor(h * 0.4), w, ground - Math.floor(h * 0.4));

    // Clouds (drifting slowly)
    var clouds = [[8, 3, 8], [30, 5, 10], [55, 2, 7], [75, 6, 9]];
    for (var ci = 0; ci < clouds.length; ci++) {
      var cx = (clouds[ci][0] + frame * 0.08 + ci * 5) % (w + 16) - 8;
      var cy = clouds[ci][1], cw = clouds[ci][2];
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.floor(cx), cy, cw, 2);
      ctx.fillRect(Math.floor(cx) + 1, cy - 1, cw - 2, 1);
      ctx.fillRect(Math.floor(cx) + 2, cy + 2, cw - 3, 1);
    }

    // Sun
    ctx.fillStyle = '#ffe860';
    ctx.fillRect(w - 14, 2, 5, 5);
    ctx.fillRect(w - 15, 3, 7, 3);
    ctx.fillRect(w - 13, 1, 3, 1);
    ctx.fillRect(w - 13, 7, 3, 1);
    // Sun rays (twinkle)
    if (Math.sin(frame * 0.1) > 0) {
      ctx.fillStyle = '#fff4a0';
      ctx.fillRect(w - 17, 4, 1, 1);
      ctx.fillRect(w - 9, 4, 1, 1);
      ctx.fillRect(w - 12, 0, 1, 1);
      ctx.fillRect(w - 12, 8, 1, 1);
    }

    // Distant mountains
    ctx.fillStyle = '#78a8c0';
    var mts = [[0,12],[10,16],[22,10],[32,18],[44,13],[56,17],[68,11],[76,14]];
    for (var mi = 0; mi < mts.length; mi++) {
      var mx = mts[mi][0], mh = mts[mi][1];
      for (var my = 0; my < mh; my++) {
        var mw = Math.max(1, Math.floor((mh - my) * 1.2));
        ctx.fillRect(mx + my, ground - 16 - mh + my, mw, 1);
      }
    }
    // Mountain snow caps
    ctx.fillStyle = '#e0f0ff';
    ctx.fillRect(12, ground - 31, 3, 1); ctx.fillRect(13, ground - 32, 2, 1);
    ctx.fillRect(34, ground - 33, 3, 1); ctx.fillRect(35, ground - 34, 2, 1);
    ctx.fillRect(58, ground - 32, 3, 1); ctx.fillRect(59, ground - 33, 2, 1);

    // Distant tree line (behind buildings)
    ctx.fillStyle = '#408040';
    for (var ti = 0; ti < w; ti += 5) {
      var th = 3 + ((ti * 7) % 4);
      ctx.fillRect(ti, ground - 16 - th, 4, th);
      ctx.fillStyle = '#358035';
      ctx.fillRect(ti + 1, ground - 16 - th - 1, 2, 1);
      ctx.fillStyle = '#408040';
    }

    // Buildings (mid-ground, mixed with trees)
    var blds = [
      { x: 3, bw: 6, bh: 18, color: '#d8c8b0' },
      { x: 12, bw: 5, bh: 14, color: '#c0b8a8' },
      { x: 24, bw: 7, bh: 22, color: '#b8b0a0' },
      { x: 38, bw: 5, bh: 12, color: '#d0c0a8' },
      { x: 50, bw: 8, bh: 20, color: '#c8bca8' },
      { x: 64, bw: 6, bh: 16, color: '#d8d0b8' },
      { x: 74, bw: 5, bh: 13, color: '#c0b8a0' }
    ];
    for (var bi = 0; bi < blds.length; bi++) {
      var b = blds[bi];
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, ground - b.bh, b.bw, b.bh);
      // Roof
      ctx.fillStyle = '#a09080';
      ctx.fillRect(b.x - 1, ground - b.bh - 1, b.bw + 2, 2);
      // Windows
      for (var wy = 3; wy < b.bh - 2; wy += 4) {
        for (var wx = 1; wx < b.bw - 1; wx += 3) {
          ctx.fillStyle = '#80c8e8';
          ctx.fillRect(b.x + wx, ground - b.bh + wy, 2, 2);
          // Window reflection highlight
          ctx.fillStyle = '#b0e0f8';
          ctx.fillRect(b.x + wx, ground - b.bh + wy, 1, 1);
        }
      }
    }

    // Trees between buildings (foreground nature)
    var trees = [
      { x: 10, trunk: 4, crown: 6, type: 0 },
      { x: 20, trunk: 5, crown: 7, type: 1 },
      { x: 33, trunk: 3, crown: 5, type: 0 },
      { x: 45, trunk: 6, crown: 8, type: 1 },
      { x: 59, trunk: 4, crown: 6, type: 0 },
      { x: 70, trunk: 5, crown: 7, type: 1 }
    ];
    for (ti = 0; ti < trees.length; ti++) {
      var tr = trees[ti];
      var sway = Math.sin(frame * 0.04 + ti * 1.7) * 0.5;
      // Trunk
      ctx.fillStyle = '#806040';
      ctx.fillRect(tr.x + 1, ground - tr.trunk, 2, tr.trunk);
      // Crown (round or triangular)
      if (tr.type === 0) {
        // Round deciduous
        ctx.fillStyle = '#30a040';
        ctx.fillRect(tr.x - 1 + Math.floor(sway), ground - tr.trunk - tr.crown + 1, tr.crown, tr.crown - 1);
        ctx.fillRect(tr.x + Math.floor(sway), ground - tr.trunk - tr.crown, tr.crown - 2, tr.crown);
        ctx.fillStyle = '#40b850';
        ctx.fillRect(tr.x + Math.floor(sway), ground - tr.trunk - tr.crown + 2, tr.crown - 2, 2);
      } else {
        // Conifer / triangular
        ctx.fillStyle = '#207030';
        for (var ly = 0; ly < tr.crown; ly++) {
          var lw = Math.max(1, tr.crown - ly);
          ctx.fillRect(tr.x + 2 - Math.floor(lw / 2) + Math.floor(sway), ground - tr.trunk - tr.crown + ly, lw, 1);
        }
        ctx.fillStyle = '#308040';
        ctx.fillRect(tr.x + 1 + Math.floor(sway), ground - tr.trunk - tr.crown + 2, 2, 2);
      }
    }

    // Grass / ground
    ctx.fillStyle = '#50a850';
    ctx.fillRect(0, ground, w, 2);
    ctx.fillStyle = '#60b860';
    ctx.fillRect(0, ground, w, 1);

    // Sidewalk
    ctx.fillStyle = '#c8c0b0';
    ctx.fillRect(0, ground + 2, w, 2);

    // Road
    ctx.fillStyle = '#606068';
    ctx.fillRect(0, ground + 4, w, 4);
    // Road center line
    ctx.fillStyle = '#e0d868';
    var roadY = ground + 6;
    for (var rx = -10 + (frame % 12); rx < w; rx += 12) {
      ctx.fillRect(rx, roadY, 5, 1);
    }

    // Car 1 (moving right) — blue
    var carX = ((frame * 0.5) % (w + 24)) - 12;
    var cxi = Math.floor(carX);
    ctx.fillStyle = '#3070c0';
    ctx.fillRect(cxi, ground + 4, 8, 3);
    ctx.fillRect(cxi + 1, ground + 3, 6, 1);
    ctx.fillStyle = '#80c8f0';
    ctx.fillRect(cxi + 2, ground + 3, 2, 1);
    ctx.fillRect(cxi + 5, ground + 3, 2, 1);
    ctx.fillStyle = '#222';
    ctx.fillRect(cxi + 1, ground + 7, 2, 1);
    ctx.fillRect(cxi + 6, ground + 7, 2, 1);

    // Car 2 (moving left) — red
    var carX2 = w + 12 - ((frame * 0.35 + 50) % (w + 24));
    var cx2 = Math.floor(carX2);
    ctx.fillStyle = '#c03030';
    ctx.fillRect(cx2, ground + 4, 7, 3);
    ctx.fillRect(cx2 + 1, ground + 3, 5, 1);
    ctx.fillStyle = '#f0c080';
    ctx.fillRect(cx2 + 1, ground + 3, 2, 1);
    ctx.fillRect(cx2 + 4, ground + 3, 2, 1);
    ctx.fillStyle = '#222';
    ctx.fillRect(cx2, ground + 7, 2, 1);
    ctx.fillRect(cx2 + 5, ground + 7, 2, 1);

    // Birds
    for (var bdi = 0; bdi < 3; bdi++) {
      var birdX = (bdi * 25 + frame * 0.3 + bdi * 11) % (w + 10) - 5;
      var birdY = 6 + bdi * 3 + Math.sin(frame * 0.1 + bdi * 2) * 2;
      var wingUp = Math.sin(frame * 0.2 + bdi * 1.5) > 0;
      ctx.fillStyle = '#333';
      ctx.fillRect(Math.floor(birdX), Math.floor(birdY), 1, 1);
      if (wingUp) {
        ctx.fillRect(Math.floor(birdX) - 1, Math.floor(birdY) - 1, 1, 1);
        ctx.fillRect(Math.floor(birdX) + 1, Math.floor(birdY) - 1, 1, 1);
      } else {
        ctx.fillRect(Math.floor(birdX) - 1, Math.floor(birdY) + 1, 1, 1);
        ctx.fillRect(Math.floor(birdX) + 1, Math.floor(birdY) + 1, 1, 1);
      }
    }

    // Flower patches on grass
    var flowers = [[6,0,'#ff6080'],[15,1,'#ffb040'],[28,0,'#e060e0'],[42,1,'#ff6080'],[53,0,'#ffb040'],[67,1,'#e060e0'],[77,0,'#ff6080']];
    for (var fi = 0; fi < flowers.length; fi++) {
      var fl = flowers[fi];
      if (fl[0] < w) {
        ctx.fillStyle = fl[2];
        ctx.fillRect(fl[0], ground + fl[1], 1, 1);
        ctx.fillStyle = '#40a040';
        ctx.fillRect(fl[0], ground + fl[1] + 1, 1, 1);
      }
    }

    // Person walking (small silhouette on sidewalk)
    var personX = ((frame * 0.3 + 20) % (w + 16)) - 8;
    var pi = Math.floor(personX);
    var step = (Math.floor(frame * 0.15) % 2);
    ctx.fillStyle = '#504040';
    ctx.fillRect(pi + 1, ground - 1, 2, 1); // head
    ctx.fillRect(pi, ground, 3, 3);          // body
    if (step) {
      ctx.fillRect(pi, ground + 3, 1, 2);   // leg L
      ctx.fillRect(pi + 2, ground + 3, 1, 1); // leg R
    } else {
      ctx.fillRect(pi + 2, ground + 3, 1, 2);
      ctx.fillRect(pi, ground + 3, 1, 1);
    }
  }

  // Animation: VTuber Stream
  function animVtuber(ctx, w, h, frame) {
    // Background (gradient)
    ctx.fillStyle = '#1a0828';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#280840';
    ctx.fillRect(0, Math.floor(h * 0.3), w, h - Math.floor(h * 0.3));

    // Floating particles / sparkles
    for (var pi = 0; pi < 8; pi++) {
      var ppx = (pi * 11 + Math.floor(frame * 0.3 + pi * 7)) % w;
      var ppy = (pi * 8 + Math.floor(frame * 0.2 + pi * 13)) % h;
      var sparkle = Math.sin(frame * 0.15 + pi * 1.5) > 0;
      if (sparkle) {
        ctx.fillStyle = pi % 2 === 0 ? '#ff80c0' : '#80c0ff';
        ctx.fillRect(ppx, ppy, 1, 1);
      }
    }

    // VTuber character (center, anime-style face)
    var cx = Math.floor(w / 2) - 10;
    var cy = Math.floor(h * 0.2);
    var breathe = Math.sin(frame * 0.08) * 0.5;

    // Hair (long, pastel pink)
    ctx.fillStyle = '#ff80b0';
    ctx.fillRect(cx - 1, cy - 1, 22, 4);
    ctx.fillRect(cx - 2, cy + 2, 24, 6);
    ctx.fillRect(cx - 2, cy + 7, 24, 12);
    // Hair side strands
    ctx.fillRect(cx - 3, cy + 4, 3, 16);
    ctx.fillRect(cx + 20, cy + 4, 3, 16);
    // Hair bangs
    ctx.fillStyle = '#ff90b8';
    ctx.fillRect(cx, cy, 20, 3);
    ctx.fillRect(cx - 1, cy + 1, 4, 3);
    ctx.fillRect(cx + 17, cy + 1, 4, 3);

    // Face
    ctx.fillStyle = '#ffe0d0';
    ctx.fillRect(cx + 2, cy + 3, 16, 12);
    ctx.fillRect(cx + 1, cy + 5, 18, 8);
    ctx.fillRect(cx + 3, cy + 2, 14, 1);

    // Eyes (big anime eyes, blink)
    var blink = (frame % 90) < 3;
    if (!blink) {
      // Left eye
      ctx.fillStyle = '#2050a0';
      ctx.fillRect(cx + 4, cy + 6, 4, 4);
      ctx.fillStyle = '#3070d0';
      ctx.fillRect(cx + 5, cy + 6, 2, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx + 4, cy + 6, 2, 2);
      ctx.fillStyle = '#111';
      ctx.fillRect(cx + 5, cy + 7, 2, 2);
      // Right eye
      ctx.fillStyle = '#2050a0';
      ctx.fillRect(cx + 12, cy + 6, 4, 4);
      ctx.fillStyle = '#3070d0';
      ctx.fillRect(cx + 13, cy + 6, 2, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx + 14, cy + 6, 2, 2);
      ctx.fillStyle = '#111';
      ctx.fillRect(cx + 13, cy + 7, 2, 2);
    } else {
      // Closed eyes (lines)
      ctx.fillStyle = '#2050a0';
      ctx.fillRect(cx + 4, cy + 8, 4, 1);
      ctx.fillRect(cx + 12, cy + 8, 4, 1);
    }

    // Mouth (talking animation)
    var talking = Math.sin(frame * 0.3) > 0;
    ctx.fillStyle = '#e07080';
    if (talking) {
      ctx.fillRect(cx + 8, cy + 12, 4, 2);
      ctx.fillStyle = '#c05060';
      ctx.fillRect(cx + 9, cy + 13, 2, 1);
    } else {
      ctx.fillRect(cx + 8, cy + 12, 4, 1);
    }

    // Blush
    ctx.fillStyle = 'rgba(255,100,120,0.3)';
    ctx.fillRect(cx + 2, cy + 10, 3, 2);
    ctx.fillRect(cx + 15, cy + 10, 3, 2);

    // Cat ears (on hair)
    ctx.fillStyle = '#ff80b0';
    ctx.fillRect(cx, cy - 3, 4, 3);
    ctx.fillRect(cx + 1, cy - 4, 2, 2);
    ctx.fillRect(cx + 16, cy - 3, 4, 3);
    ctx.fillRect(cx + 17, cy - 4, 2, 2);
    // Inner ear
    ctx.fillStyle = '#ffa0c0';
    ctx.fillRect(cx + 1, cy - 2, 2, 2);
    ctx.fillRect(cx + 17, cy - 2, 2, 2);

    // Body / outfit
    var by = cy + 15 + Math.floor(breathe);
    ctx.fillStyle = '#4020a0';
    ctx.fillRect(cx + 1, by, 18, 10);
    ctx.fillRect(cx + 3, by - 1, 14, 2);
    // Collar ribbon
    ctx.fillStyle = '#ff5090';
    ctx.fillRect(cx + 7, by, 6, 2);
    ctx.fillRect(cx + 9, by + 2, 2, 2);

    // Arms
    ctx.fillStyle = '#ffe0d0';
    // Left arm (waving)
    var wave = Math.sin(frame * 0.12) * 2;
    ctx.fillRect(cx - 2, by + 2 + Math.floor(wave), 3, 6);
    ctx.fillRect(cx - 3, by + 1 + Math.floor(wave), 2, 3);
    // Right arm
    ctx.fillRect(cx + 19, by + 4, 3, 5);

    // Stream UI overlay elements
    // Chat box (bottom right)
    var cbx = w - 22, cby = h - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cbx, cby, 20, 16);
    ctx.fillStyle = '#555';
    ctx.fillRect(cbx, cby, 20, 1);
    // Chat messages (scrolling)
    var chatColors = ['#ff80a0','#80ff80','#80c0ff','#ffff80','#c080ff'];
    for (var ci = 0; ci < 4; ci++) {
      var chatY = cby + 2 + ci * 3;
      var chatOff = (ci + Math.floor(frame * 0.05)) % 5;
      ctx.fillStyle = chatColors[chatOff];
      ctx.fillRect(cbx + 1, chatY, 2, 2);
      ctx.fillStyle = '#888';
      var msgW = 6 + ((ci * 7 + Math.floor(frame * 0.02)) % 8);
      ctx.fillRect(cbx + 4, chatY, msgW, 1);
      ctx.fillRect(cbx + 4, chatY + 1, Math.max(3, msgW - 3), 1);
    }

    // Viewer count (top right)
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(w - 20, 1, 18, 6);
    ctx.fillStyle = '#ff3030';
    ctx.fillRect(w - 19, 2, 3, 1);
    ctx.fillRect(w - 18, 3, 1, 1);
    ctx.fillStyle = '#fff';
    // "LIVE" text (2px)
    ctx.fillRect(w - 14, 2, 1, 3);
    ctx.fillRect(w - 14, 4, 2, 1);
    ctx.fillRect(w - 11, 2, 1, 3);
    ctx.fillRect(w - 9, 2, 1, 3);

    // Superchat / emoji rain
    var emojiY = ((frame * 1.2) % (h + 10)) - 5;
    if (frame % 60 < 30) {
      ctx.fillStyle = '#ffff00';
      var ex = 4 + (frame % 7) * 3;
      ctx.fillRect(ex, h - emojiY, 2, 2);
    }

    // Name tag
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, h - 6, 30, 6);
    ctx.fillStyle = '#ff80c0';
    ctx.fillRect(1, h - 5, 1, 4);
    ctx.fillStyle = '#fff';
    // Small name placeholder bars
    ctx.fillRect(3, h - 4, 8, 1);
    ctx.fillRect(3, h - 2, 12, 1);
  }

  // Video play button overlay pixel art
  var artPlay = [
    '..PP......',
    '..PPPP....',
    '..PPPPPP..',
    '..PPPPPP..',
    '..PPPP....',
    '..PP......'
  ];
  var palPlay = { P: 'rgba(255,255,255,0.8)' };

  // Video list data
  var videoList = [
    { id: 'fish', title: 'Relaxing Fish Tank', ch: 'AquariumFan', views: '1.2K', anim: animFish },
    { id: 'cat', title: 'Cat Does Nothing 10hr', ch: 'PixelPets', views: '847', anim: animCat },
    { id: 'stars', title: 'Space Screensaver', ch: 'CosmicVibes', views: '2.3K', anim: animStars },
    { id: 'piano', title: 'Piano Melody Loop', ch: 'TinyMusic', views: '456', anim: animPiano },
    { id: 'sand', title: 'Sand Timer ASMR', ch: 'OddlyPixel', views: '3.1K', anim: animSand },
    { id: 'maze', title: '3D Maze Walkthrough', ch: 'MazeRunner', views: '5.7K', anim: animMaze },
    { id: 'city', title: 'Sunny City Walk', ch: 'PixelVibes', views: '12K', anim: animCity },
    { id: 'vtuber', title: 'Miko Ch. Live Stream', ch: 'MikoVT', views: '8.4K', anim: animVtuber }
  ];

  // Thumbnail pixel art (small icons for each video)
  var thumbFish = [
    'BBBBB',
    'B.OOB',
    'BOFOB',
    'B.OOB',
    'BBBBB'
  ];
  var palThFish = { B: '#0a2848', O: '#ff6030', F: '#fff' };

  var thumbCat = [
    'DDDDD',
    'DE.ED',
    'DEEED',
    'D.N.D',
    'DDDDD'
  ];
  var palThCat = { D: '#1a1a2a', E: '#b08860', N: '#e07080' };

  var thumbStars = [
    'SSSSS',
    'S.S.S',
    'SS.SS',
    'S.S.S',
    'SSSSS'
  ];
  var palThStars = { S: '#0a0a20' };

  var thumbPiano = [
    'DDDDD',
    'DWDWD',
    'DWDWD',
    'DWWWD',
    'DDDDD'
  ];
  var palThPiano = { D: '#1a1018', W: '#f0f0f0' };

  var thumbSand = [
    'DAAAD',
    'D.Y.D',
    'D...D',
    'D.Y.D',
    'DAAAD'
  ];
  var palThSand = { D: '#0a0a18', A: '#a08848', Y: '#d8b848' };

  var thumbMaze = [
    'BWBWB',
    'B...B',
    'BWB.B',
    'B...B',
    'BWBWB'
  ];
  var palThMaze = { B: '#3a70a8', W: '#5a98d0' };

  var thumbCity = [
    'SSCSS',
    'SBGBS',
    'BGTGB',
    'BTBTB',
    'GGRRG'
  ];
  var palThCity = { S: '#58b0e8', C: '#fff', B: '#d0c0a8', G: '#50a850', T: '#30a040', R: '#606068' };

  var thumbVtuber = [
    'DPPD.',
    'DFFFD',
    'DEFED',
    'D.M.D',
    'DDDDD'
  ];
  var palThVtuber = { D: '#1a0828', P: '#ff80b0', F: '#ffe0d0', E: '#3070d0', M: '#e07080' };

  var thumbArts = [thumbFish, thumbCat, thumbStars, thumbPiano, thumbSand, thumbMaze, thumbCity, thumbVtuber];
  var thumbPals = [palThFish, palThCat, palThStars, palThPiano, palThSand, palThMaze, palThCity, palThVtuber];

  pages['tiny://videos'] = function () {
    var accent = getAccentColor();
    var link = getLinkColor();
    var html = '<div style="padding:4px;">' +
      // Header
      '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ' + accent + ';padding-bottom:2px;margin-bottom:4px;">' +
        '<span style="font-size:6px;color:' + accent + ';">TinyTube</span>' +
        '<span style="font-size:3px;color:#888;">Pixel Video</span>' +
      '</div>' +
      // Main layout: left=player, right=list
      '<div style="display:flex;gap:4px;align-items:flex-start;">' +
        // Left column: player + info
        '<div style="flex:1;min-width:0;">' +
          '<div style="background:#000;border:1px solid #333;line-height:0;">' +
            '<canvas id="video-player" width="80" height="50" style="display:block;width:100%;image-rendering:pixelated;image-rendering:crisp-edges;"></canvas>' +
          '</div>' +
          '<div id="video-controls" style="display:flex;align-items:center;gap:2px;margin-top:2px;">' +
            '<button id="video-play" style="font-family:\'Press Start 2P\',monospace;font-size:4px;padding:1px 3px;background:' + accent + ';border:1px solid #888;color:#fff;cursor:pointer;">Play</button>' +
            '<div id="video-title-display" style="font-size:4px;color:' + link + ';flex:1;overflow:hidden;white-space:nowrap;">Select a video</div>' +
          '</div>' +
          '<div id="video-info" style="font-size:3px;color:#888;margin-top:1px;"></div>' +
        '</div>' +
        // Right column: video list
        '<div style="width:90px;flex-shrink:0;overflow-y:auto;max-height:180px;">' +
          '<div style="font-size:3px;color:#888;margin-bottom:2px;">Up next</div>';
    for (var i = 0; i < videoList.length; i++) {
      var v = videoList[i];
      var thumb = pxArt(thumbArts[i], thumbPals[i], 3);
      html += '<div class="video-item" data-video-idx="' + i + '" style="display:flex;gap:2px;padding:1px;margin-bottom:2px;cursor:pointer;border:1px solid transparent;align-items:flex-start;">' +
        '<div style="flex-shrink:0;border:1px solid #444;line-height:0;">' + thumb + '</div>' +
        '<div style="flex:1;min-width:0;overflow:hidden;">' +
          '<div style="font-size:3px;color:' + link + ';line-height:1.4;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + v.title + '</div>' +
          '<div style="font-size:3px;color:#888;line-height:1.3;">' + v.ch + '</div>' +
          '<div style="font-size:3px;color:#666;line-height:1.3;">' + v.views + ' views</div>' +
        '</div>' +
      '</div>';
    }
    html += '</div></div></div>';
    return html;
  };

  // Search results database
  var searchDb = [
    { title: 'TinyWeb Home', url: 'tiny://home', desc: 'Welcome to the Tiny Internet' },
    { title: 'TinySearch', url: 'tiny://search', desc: 'Search the tiny web' },
    { title: 'TinyNews', url: 'tiny://news', desc: 'Daily headlines from TinyOS' },
    { title: 'Fish Wiki', url: 'tiny://fish', desc: 'Guide to aquarium fish species' },
    { title: 'TinyWeather', url: 'tiny://weather', desc: 'Weather forecast for Tiny City' },
    { title: 'Guestbook', url: 'tiny://guestbook', desc: 'Community messages and greetings' },
    { title: 'TinyTube', url: 'tiny://videos', desc: 'Watch pixel art video animations' },
    { title: 'Relaxing Fish Tank', url: 'tiny://videos', desc: 'Watch fish swim in a tiny aquarium' },
    { title: 'Cat Does Nothing', url: 'tiny://videos', desc: 'A pixel cat doing absolutely nothing' },
    { title: '3D Maze Walkthrough', url: 'tiny://videos', desc: 'First-person 3D maze navigation guide' },
    { title: 'Sunny City Walk', url: 'tiny://videos', desc: 'Relaxing sunny city walk with nature and buildings' },
    { title: 'Miko Ch. VTuber Live', url: 'tiny://videos', desc: 'Cute VTuber live stream with chat' },
    { title: 'Clownfish', url: 'tiny://fish', desc: 'Orange fish with white stripes' },
    { title: 'Pixel Cat Desktop Pet', url: 'tiny://news', desc: 'Cat spotted walking on desktop' },
    { title: '3D Maze Record', url: 'tiny://news', desc: 'New maze speed record broken' },
    { title: 'Piano Music', url: 'tiny://home', desc: 'Play piano on TinyOS' },
    { title: 'Minesweeper Tips', url: 'tiny://home', desc: 'How to beat minesweeper' }
  ];

  // ----- 404 page -----
  function render404(url) {
    var accent = getAccentColor();
    var img = pxArt(art404, pal404, 3);
    return '<div style="text-align:center;padding:14px 8px;">' +
      '<div style="margin-bottom:4px;">' + img + '</div>' +
      '<div style="font-size:12px;color:' + accent + ';margin-bottom:4px;">404</div>' +
      '<div style="font-size:5px;color:#888;margin-bottom:6px;">Page Not Found</div>' +
      '<div style="font-size:4px;color:#666;margin-bottom:6px;">The page <span style="color:#ccc;">' + escapeHtml(url) + '</span> could not be found on this server.</div>' +
      '<a class="blink" data-href="tiny://home" style="color:' + getLinkColor() + ';font-size:4px;">Go to Home</a>' +
    '</div>';
  }

  // ----- Connection error page -----
  function renderError(url) {
    var accent = getAccentColor();
    var img = pxArt(artErr, palErr, 2);
    return '<div style="text-align:center;padding:10px 8px;">' +
      '<div style="margin-bottom:4px;">' + img + '</div>' +
      '<div style="font-size:6px;color:' + accent + ';margin-bottom:4px;">Connection Failed</div>' +
      '<div style="font-size:4px;color:#666;margin-bottom:6px;">Could not connect to <span style="color:#ccc;">' + escapeHtml(url) + '</span></div>' +
      '<div style="font-size:3px;color:#555;margin-bottom:6px;">The TinyWeb can only access pages on the tiny:// protocol.</div>' +
      '<a class="blink" data-href="tiny://home" style="color:' + getLinkColor() + ';font-size:4px;">Go to Home</a>' +
    '</div>';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ----- Navigation -----
  function navigate(url, addToHistory) {
    if (isNavigating) return;
    url = url.trim();
    if (!url) return;

    // Normalize URL
    if (url.indexOf('://') === -1 && url.indexOf('tiny://') !== 0) {
      url = 'tiny://' + url;
    }

    urlInput.value = url;
    isNavigating = true;

    // Show loading bar
    loadingBar.style.display = 'block';
    loadingBar.style.width = '0%';

    var progress = 0;
    var loadInterval = setInterval(function () {
      progress += Math.random() * 30 + 10;
      if (progress > 90) progress = 90;
      loadingBar.style.width = progress + '%';
    }, 60);

    // Simulate loading delay
    var delay = 200 + Math.random() * 300;
    setTimeout(function () {
      clearInterval(loadInterval);
      loadingBar.style.width = '100%';

      setTimeout(function () {
        loadingBar.style.display = 'none';
        loadingBar.style.width = '0%';

        // Render page
        var html;
        if (url.indexOf('tiny://') !== 0) {
          html = renderError(url);
        } else if (pages[url]) {
          html = pages[url]();
        } else {
          html = render404(url);
        }

        content.innerHTML = html;
        content.scrollTop = 0;
        bindPageInteractions(url);

        // Update window title
        var titleEl = document.querySelector('#window-browser .title-bar-text');
        if (titleEl) {
          var pageTitle = getPageTitle(url);
          titleEl.textContent = pageTitle ? pageTitle + ' - TinyWeb' : 'TinyWeb';
        }

        // History management
        if (addToHistory !== false) {
          // Trim forward history
          historyStack = historyStack.slice(0, historyIdx + 1);
          historyStack.push(url);
          historyIdx = historyStack.length - 1;
        }

        updateNavButtons();
        isNavigating = false;
      }, 100);
    }, delay);
  }

  function getPageTitle(url) {
    var titles = {
      'tiny://home': 'Home',
      'tiny://search': 'TinySearch',
      'tiny://news': 'TinyNews',
      'tiny://fish': 'Fish Wiki',
      'tiny://weather': 'TinyWeather',
      'tiny://guestbook': 'Guestbook',
      'tiny://videos': 'TinyTube'
    };
    return titles[url] || '';
  }

  function updateNavButtons() {
    backBtn.disabled = historyIdx <= 0;
    fwdBtn.disabled = historyIdx >= historyStack.length - 1;
    backBtn.style.opacity = backBtn.disabled ? '0.3' : '1';
    fwdBtn.style.opacity = fwdBtn.disabled ? '0.3' : '1';
  }

  // ----- Bind interactions within pages -----
  function bindPageInteractions(url) {
    // Stop any running video animation when navigating
    stopVideoAnim();

    // Links
    var links = content.querySelectorAll('a.blink[data-href]');
    links.forEach(function (a) {
      a.style.cursor = 'pointer';
      a.style.textDecoration = 'underline';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        navigate(this.getAttribute('data-href'));
      });
    });

    // Search page
    if (url === 'tiny://search') {
      var searchInput = document.getElementById('search-input');
      var searchBtn = document.getElementById('search-btn');
      var searchResults = document.getElementById('search-results');
      if (searchBtn && searchInput && searchResults) {
        var doSearch = function () {
          var q = searchInput.value.trim().toLowerCase();
          if (!q) return;
          var results = searchDb.filter(function (item) {
            return item.title.toLowerCase().indexOf(q) !== -1 ||
                   item.desc.toLowerCase().indexOf(q) !== -1;
          });
          var link = getLinkColor();
          if (results.length === 0) {
            searchResults.innerHTML = '<div style="color:#888;">No results for "' + escapeHtml(q) + '"</div>';
          } else {
            var html = '<div style="color:#888;margin-bottom:3px;">' + results.length + ' result' + (results.length > 1 ? 's' : '') + '</div>';
            results.forEach(function (r) {
              html += '<div style="margin-bottom:3px;">' +
                '<a class="blink" data-href="' + r.url + '" style="color:' + link + ';cursor:pointer;text-decoration:underline;">' + r.title + '</a><br>' +
                '<span style="color:#666;font-size:3px;">' + r.url + '</span><br>' +
                '<span style="color:#999;">' + r.desc + '</span>' +
              '</div>';
            });
            searchResults.innerHTML = html;
            // Re-bind links in results
            searchResults.querySelectorAll('a.blink[data-href]').forEach(function (a) {
              a.addEventListener('click', function (e) {
                e.preventDefault();
                navigate(this.getAttribute('data-href'));
              });
            });
          }
        };
        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keydown', function (e) {
          e.stopPropagation();
          if (e.key === 'Enter') doSearch();
        });
      }
    }

    // Video page
    if (url === 'tiny://videos') {
      var vCanvas = document.getElementById('video-player');
      var vCtx = vCanvas ? vCanvas.getContext('2d') : null;
      var vPlayBtn = document.getElementById('video-play');
      var vTitleEl = document.getElementById('video-title-display');
      var vInfoEl = document.getElementById('video-info');
      var currentAnim = null;
      var isPlaying = false;

      // Draw play button overlay on canvas
      function drawPlayOverlay() {
        if (!vCtx) return;
        vCtx.fillStyle = '#111';
        vCtx.fillRect(0, 0, 80, 50);
        // Play triangle
        vCtx.fillStyle = '#555';
        vCtx.fillRect(35, 18, 2, 14);
        vCtx.fillRect(37, 20, 2, 10);
        vCtx.fillRect(39, 22, 2, 6);
        vCtx.fillRect(41, 24, 2, 2);
      }
      drawPlayOverlay();

      function startAnim(animFn, idx) {
        stopVideoAnim();
        currentAnim = animFn;
        isPlaying = true;
        vPlayBtn.textContent = 'Pause';
        var v = videoList[idx];
        vTitleEl.textContent = v.title;
        vInfoEl.textContent = v.ch + ' \u00B7 ' + v.views + ' views';
        // Highlight selected
        content.querySelectorAll('.video-item').forEach(function (el) {
          el.style.borderColor = el.getAttribute('data-video-idx') == idx ? getAccentColor() : 'transparent';
        });
        var frame = 0;
        var lastTime = 0;
        function loop(ts) {
          if (!isPlaying || currentAnim !== animFn) return;
          // ~12fps
          if (ts - lastTime > 80) {
            lastTime = ts;
            animFn(vCtx, 80, 50, frame);
            frame++;
          }
          videoAnimId = requestAnimationFrame(loop);
        }
        videoAnimId = requestAnimationFrame(loop);
      }

      function pauseAnim() {
        isPlaying = false;
        stopVideoAnim();
        vPlayBtn.textContent = 'Play';
      }

      // Click on video items
      content.querySelectorAll('.video-item').forEach(function (el) {
        el.addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-video-idx'));
          startAnim(videoList[idx].anim, idx);
        });
        el.addEventListener('mouseenter', function () {
          if (this.style.borderColor === 'transparent' || !this.style.borderColor) {
            this.style.background = 'rgba(255,255,255,0.05)';
          }
        });
        el.addEventListener('mouseleave', function () {
          this.style.background = '';
        });
      });

      // Play/pause button
      if (vPlayBtn) {
        vPlayBtn.addEventListener('click', function () {
          if (isPlaying) {
            pauseAnim();
          } else if (currentAnim) {
            // Resume last video
            var idx = 0;
            content.querySelectorAll('.video-item').forEach(function (el) {
              if (el.style.borderColor && el.style.borderColor !== 'transparent') {
                idx = parseInt(el.getAttribute('data-video-idx'));
              }
            });
            startAnim(videoList[idx].anim, idx);
          } else {
            // Auto-play first video
            startAnim(videoList[0].anim, 0);
          }
        });
      }
    }

    // Guestbook page
    if (url === 'tiny://guestbook') {
      var gbInput = document.getElementById('gb-input');
      var gbSend = document.getElementById('gb-send');
      if (gbInput && gbSend) {
        gbInput.addEventListener('keydown', function (e) {
          e.stopPropagation();
          if (e.key === 'Enter') gbSend.click();
        });
        gbSend.addEventListener('click', function () {
          var msg = gbInput.value.trim();
          if (!msg) return;
          var link = getLinkColor();
          var d = new Date();
          var dateStr = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
          var avatar = pxArt(artAvatar1, { H: '#ffcc88', B: '#333', M: '#dd6666', S: getLinkColor() }, 2);
          var entry = document.createElement('div');
          entry.style.cssText = 'display:flex;gap:3px;border:1px solid #333;padding:2px 3px;margin-bottom:2px;align-items:center;';
          entry.innerHTML = '<div style="flex-shrink:0;">' + avatar + '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="display:flex;justify-content:space-between;">' +
                '<span style="color:' + link + ';">You</span>' +
                '<span style="color:#666;font-size:3px;">' + dateStr + '</span>' +
              '</div>' +
              '<div style="color:#ccc;font-size:4px;">' + escapeHtml(msg) + '</div>' +
            '</div>';
          // Insert before the input area
          var inputArea = gbSend.parentElement;
          inputArea.parentElement.insertBefore(entry, inputArea);
          gbInput.value = '';
          content.scrollTop = content.scrollHeight;
        });
      }
    }
  }

  // ----- Event handlers -----
  goBtn.addEventListener('click', function () {
    navigate(urlInput.value);
  });

  urlInput.addEventListener('keydown', function (e) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      navigate(urlInput.value);
    }
  });

  backBtn.addEventListener('click', function () {
    if (historyIdx > 0) {
      historyIdx--;
      urlInput.value = historyStack[historyIdx];
      navigate(historyStack[historyIdx], false);
    }
  });

  fwdBtn.addEventListener('click', function () {
    if (historyIdx < historyStack.length - 1) {
      historyIdx++;
      urlInput.value = historyStack[historyIdx];
      navigate(historyStack[historyIdx], false);
    }
  });

  // ----- Init: load home on first open -----
  var win = document.getElementById('window-browser');
  var loaded = false;

  // Use MutationObserver to detect when window is opened
  var observer = new MutationObserver(function () {
    if (!win.classList.contains('closed') && !loaded) {
      loaded = true;
      navigate('tiny://home');
    }
  });
  observer.observe(win, { attributes: true, attributeFilter: ['class'] });

  // Also check if already open
  if (!win.classList.contains('closed')) {
    loaded = true;
    navigate('tiny://home');
  }
})();
