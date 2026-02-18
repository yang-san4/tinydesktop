// ===== Terminal Emulator (pseudo shell) =====

(function () {
  var output = document.getElementById('terminal-output');
  var inputEl = document.getElementById('terminal-input');
  var cursorEl = document.getElementById('terminal-cursor');
  var promptEl = document.getElementById('terminal-prompt');
  var body = document.getElementById('terminal-body');

  var inputBuffer = '';
  var history = [];
  var historyIdx = -1;
  var startTime = Date.now();

  // ----- Pseudo filesystem -----
  var fs = {
    'home': {
      'user': {
        'readme.txt': 'Welcome to TinyOS v1.0!',
        'todo.txt': '1. Feed fish\n2. Fix clock\n3. Water plants',
        'secret.txt': 'The cake is a lie',
        '.hidden': 'You found me!',
        'projects': {
          'hello.txt': 'Hello, World!'
        }
      }
    }
  };

  // Reject dangerous property names to prevent prototype pollution
  var UNSAFE_NAMES = ['__proto__', 'constructor', 'prototype'];

  var cwd = '/home/user';

  // ----- Filesystem helpers -----
  function resolvePath(p) {
    if (!p) return cwd;
    if (p === '~') return '/home/user';
    if (p.indexOf('~/') === 0) p = '/home/user/' + p.slice(2);
    if (p[0] !== '/') p = cwd + '/' + p;
    // normalize
    var parts = p.split('/');
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '' || parts[i] === '.') continue;
      if (parts[i] === '..') { stack.pop(); continue; }
      stack.push(parts[i]);
    }
    return '/' + stack.join('/');
  }

  function getNode(path) {
    if (path === '/') return fs;
    var parts = path.split('/').filter(Boolean);
    var node = fs;
    for (var i = 0; i < parts.length; i++) {
      if (node === undefined || node === null || typeof node !== 'object') return undefined;
      node = node[parts[i]];
    }
    return node;
  }

  function getParentAndName(path) {
    var parts = path.split('/').filter(Boolean);
    var name = parts.pop();
    var parentPath = '/' + parts.join('/');
    return { parent: getNode(parentPath), name: name, parentPath: parentPath };
  }

  function isDir(node) {
    return node !== null && typeof node === 'object';
  }

  // ----- Prompt -----
  function getPrompt() {
    var dir = cwd === '/home/user' ? '~' : cwd.replace('/home/user/', '~/');
    return 'user@tinyos:' + dir + '$ ';
  }

  function updatePrompt() {
    promptEl.textContent = getPrompt();
  }

  // ----- Output -----
  function print(text) {
    output.textContent += text + '\n';
    scrollToBottom();
  }

  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  // ----- Theme detection -----
  function getThemeName() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return 'Wafuu';
    if (scr.classList.contains('theme-wood')) return 'Wood';
    if (scr.classList.contains('theme-mac')) return 'Classic';
    if (scr.classList.contains('theme-osx')) return 'Aqua';
    return 'Vapor';
  }

  // ----- Commands -----
  var commands = {};

  commands.help = function () {
    print('Available commands:');
    print('  help          Show this help');
    print('  ls [-a]       List files');
    print('  cat <file>    Show file contents');
    print('  cd <dir>      Change directory');
    print('  pwd           Print working dir');
    print('  echo <txt>    Print text');
    print('  date          Show date/time');
    print('  clear         Clear screen');
    print('  whoami        Current user');
    print('  uname [-a]    System info');
    print('  neofetch      System summary');
    print('  cowsay <t>    Cow says text');
    print('  theme [name]  Show/switch theme');
    print('  open <app>    Open an app');
    print('  matrix        Matrix rain');
    print('  mkdir <dir>   Create directory');
    print('  touch <f>     Create empty file');
    print('  rm <file>     Remove file');
  };

  commands.ls = function (args) {
    var showAll = false;
    var target = cwd;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '-a' || args[i] === '-la' || args[i] === '-al') showAll = true;
      else target = resolvePath(args[i]);
    }
    var node = getNode(target);
    if (node === undefined) { print('ls: no such directory'); return; }
    if (!isDir(node)) { print(target.split('/').pop()); return; }
    var names = Object.keys(node);
    if (!showAll) names = names.filter(function (n) { return n[0] !== '.'; });
    names.sort();
    var items = [];
    for (var j = 0; j < names.length; j++) {
      items.push(isDir(node[names[j]]) ? names[j] + '/' : names[j]);
    }
    if (items.length > 0) print(items.join('  '));
  };

  commands.cat = function (args) {
    if (args.length === 0) { print('cat: missing file'); return; }
    var path = resolvePath(args[0]);
    var node = getNode(path);
    if (node === undefined) { print('cat: ' + args[0] + ': No such file'); return; }
    if (isDir(node)) { print('cat: ' + args[0] + ': Is a directory'); return; }
    print(node);
  };

  commands.cd = function (args) {
    var target = args[0] || '~';
    var path = resolvePath(target);
    var node = getNode(path);
    if (node === undefined) { print('cd: ' + target + ': No such directory'); return; }
    if (!isDir(node)) { print('cd: ' + target + ': Not a directory'); return; }
    cwd = path;
  };

  commands.pwd = function () {
    print(cwd);
  };

  commands.echo = function (args) {
    print(args.join(' '));
  };

  commands.date = function () {
    print(new Date().toString());
  };

  commands.clear = function () {
    output.textContent = '';
  };

  commands.whoami = function () {
    print('user');
  };

  commands.uname = function (args) {
    if (args.indexOf('-a') !== -1) {
      print('TinyOS 1.0 pixel-arch tinyos 1.0.0 TinyDesktop');
    } else {
      print('TinyOS 1.0 pixel-arch');
    }
  };

  commands.neofetch = function () {
    var upSec = Math.floor((Date.now() - startTime) / 1000);
    var upM = Math.floor(upSec / 60);
    var upS = upSec % 60;
    var upH = Math.floor(upM / 60);
    upM = upM % 60;
    var upStr = upH > 0 ? upH + 'h ' + upM + 'm' : upM + 'm ' + upS + 's';
    var theme = getThemeName();
    var apps = document.querySelectorAll('.window, .widget').length;
    var openApps = document.querySelectorAll('.window:not(.closed), .widget:not(.closed)').length;
    var lines = [
      '         .---.      user@tinyos',
      '        /     \\     -----------',
      '       | () () |    OS: TinyOS 1.0',
      '       |  ___  |    Host: TinyPC CRT',
      '       | |   | |    Kernel: pixel-arch',
      '        \\|   |/     Shell: tsh 0.1',
      '     .--\'-----\'--.  Theme: ' + theme,
      '    / /////////// \\ Uptime: ' + upStr,
      '   / ///////////// \\Apps: ' + openApps + '/' + apps + ' open',
      '  \'-------._.------\'Display: 440x330',
      '          | |       Memory: 640 KB',
      '         _| |_      CPU: TinyChip 8-bit',
      '        |_____|'
    ];
    print(lines.join('\n'));
  };

  commands.cowsay = function (args) {
    var text = args.length > 0 ? args.join(' ') : 'moo';
    var top = ' ' + repeat('_', text.length + 2);
    var mid = '< ' + text + ' >';
    var bot = ' ' + repeat('-', text.length + 2);
    var cow = [
      top, mid, bot,
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )',
      '                ||----w |',
      '                ||     ||'
    ];
    print(cow.join('\n'));
  };

  commands.theme = function (args) {
    var themeMap = {
      'vapor': '', 'wafuu': 'japanese', 'mokume': 'wood',
      'classic': 'mac', 'aqua': 'osx'
    };
    var nameMap = {
      '': 'Vapor', 'japanese': 'Wafuu', 'wood': 'Mokume',
      'mac': 'Classic', 'osx': 'Aqua'
    };
    if (args.length === 0) {
      print('Current theme: ' + getThemeName());
      print('Available: vapor, wafuu, mokume, classic, aqua');
      return;
    }
    var name = args[0].toLowerCase();
    if (!themeMap.hasOwnProperty(name)) {
      print('Unknown theme: ' + args[0]);
      print('Available: vapor, wafuu, mokume, classic, aqua');
      return;
    }
    var cls = themeMap[name];
    var scr = document.getElementById('screen');
    scr.className = cls ? 'theme-' + cls : '';
    // Sync start menu active indicator
    document.querySelectorAll('[data-theme]').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('[data-theme="' + cls + '"]').forEach(function (b) { b.classList.add('active'); });
    // Sync context menu active indicator
    document.querySelectorAll('[data-ctx-theme]').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('[data-ctx-theme="' + cls + '"]').forEach(function (b) { b.classList.add('active'); });
    print('Theme changed to ' + nameMap[cls]);
  };

  // ----- Open command -----
  var appMap = {
    'clock': 'window-clock', 'calendar': 'window-calendar',
    'terminal': 'window-terminal', 'aquarium': 'window-aquarium',
    'timer': 'widget-hourglass', 'hourglass': 'widget-hourglass',
    'david': 'widget-david', 'mines': 'window-minesweeper',
    'minesweeper': 'window-minesweeper', 'maze': 'window-maze',
    '3dmaze': 'window-maze', 'piano': 'window-piano',
    'about': 'window-about',
    'browser': 'window-browser', 'tinyweb': 'window-browser'
  };

  commands.open = function (args) {
    if (args.length === 0) {
      print('Usage: open <app>');
      print('Apps: ' + Object.keys(appMap).join(', '));
      return;
    }
    var name = args[0].toLowerCase();
    if (!appMap.hasOwnProperty(name)) {
      print('Unknown app: ' + args[0]);
      print('Apps: ' + Object.keys(appMap).join(', '));
      return;
    }
    var el = document.getElementById(appMap[name]);
    if (!el) { print('App not found'); return; }
    el.classList.remove('minimized');
    el.classList.remove('closed');
    // Bring to front
    var allItems = document.querySelectorAll('.window, .widget');
    var maxZ = 10;
    allItems.forEach(function (item) {
      var z = parseInt(item.style.zIndex) || 0;
      if (z > maxZ) maxZ = z;
    });
    el.style.zIndex = maxZ + 1;
    document.dispatchEvent(new Event('tinydesktop-update'));
    print('Opened ' + args[0]);
  };

  // ----- Matrix rain -----
  commands.matrix = function () {
    var cols = 36;
    var rows = 16;
    var drops = [];
    for (var i = 0; i < cols; i++) {
      drops.push(Math.floor(Math.random() * -rows));
    }
    var chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01234789ABCDEF';
    var frame = 0;
    var maxFrames = 60;

    // Hide input line during animation
    var inputLine = document.getElementById('terminal-input-line');
    inputLine.style.display = 'none';

    var matrixDiv = document.createElement('div');
    matrixDiv.style.cssText = 'font-family:monospace;font-size:6px;line-height:7px;color:#0f0;white-space:pre;letter-spacing:1px;';
    output.appendChild(matrixDiv);

    function renderFrame() {
      var grid = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) row.push(' ');
        grid.push(row);
      }
      for (var c = 0; c < cols; c++) {
        var d = drops[c];
        for (var t = 0; t < 4; t++) {
          var r = d - t;
          if (r >= 0 && r < rows) {
            grid[r][c] = chars[Math.floor(Math.random() * chars.length)];
          }
        }
        drops[c]++;
        if (drops[c] > rows + 4) {
          drops[c] = Math.floor(Math.random() * -4);
        }
      }
      var text = '';
      for (var r = 0; r < rows; r++) {
        text += grid[r].join('') + '\n';
      }
      matrixDiv.textContent = text;
      scrollToBottom();

      frame++;
      if (frame < maxFrames) {
        setTimeout(renderFrame, 60);
      } else {
        matrixDiv.remove();
        inputLine.style.display = '';
        print('[matrix terminated]');
        scrollToBottom();
      }
    }
    renderFrame();
  };

  commands.mkdir = function (args) {
    if (args.length === 0) { print('mkdir: missing operand'); return; }
    var path = resolvePath(args[0]);
    var info = getParentAndName(path);
    if (!info.parent || !isDir(info.parent)) { print('mkdir: cannot create directory'); return; }
    if (UNSAFE_NAMES.indexOf(info.name) !== -1) { print('mkdir: invalid name'); return; }
    if (info.parent[info.name] !== undefined) { print('mkdir: ' + args[0] + ': already exists'); return; }
    info.parent[info.name] = {};
  };

  commands.touch = function (args) {
    if (args.length === 0) { print('touch: missing operand'); return; }
    var path = resolvePath(args[0]);
    var info = getParentAndName(path);
    if (!info.parent || !isDir(info.parent)) { print('touch: cannot create file'); return; }
    if (UNSAFE_NAMES.indexOf(info.name) !== -1) { print('touch: invalid name'); return; }
    if (info.parent[info.name] === undefined) {
      info.parent[info.name] = '';
    }
  };

  commands.rm = function (args) {
    if (args.length === 0) { print('rm: missing operand'); return; }
    var path = resolvePath(args[0]);
    var info = getParentAndName(path);
    if (UNSAFE_NAMES.indexOf(info.name) !== -1) { print('rm: invalid name'); return; }
    if (!info.parent || !info.parent.hasOwnProperty(info.name)) {
      print('rm: ' + args[0] + ': No such file');
      return;
    }
    if (isDir(info.parent[info.name])) {
      print('rm: ' + args[0] + ': Is a directory');
      return;
    }
    delete info.parent[info.name];
  };

  function repeat(ch, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += ch;
    return s;
  }

  // ----- Command execution -----
  function execute(line) {
    var trimmed = line.trim();
    if (!trimmed) return;

    // add to history
    if (history.length === 0 || history[history.length - 1] !== trimmed) {
      history.push(trimmed);
    }
    historyIdx = -1;

    // echo the command line
    print(getPrompt() + trimmed);

    // parse
    var parts = trimmed.split(/\s+/);
    var cmd = parts[0];
    var args = parts.slice(1);

    if (commands.hasOwnProperty(cmd)) {
      commands[cmd](args);
    } else {
      print(cmd + ': command not found');
    }
  }

  // ----- Key input -----
  body.addEventListener('keydown', function (e) {
    // prevent default for most keys to avoid scrolling etc
    if (e.key === 'Tab') { e.preventDefault(); tabComplete(); return; }
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      print(getPrompt() + inputBuffer + '^C');
      inputBuffer = '';
      updateInput();
      return;
    }
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      commands.clear();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      execute(inputBuffer);
      inputBuffer = '';
      updateInput();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      inputBuffer = inputBuffer.slice(0, -1);
      updateInput();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIdx === -1) historyIdx = history.length;
      if (historyIdx > 0) {
        historyIdx--;
        inputBuffer = history[historyIdx];
        updateInput();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      historyIdx++;
      if (historyIdx >= history.length) {
        historyIdx = -1;
        inputBuffer = '';
      } else {
        inputBuffer = history[historyIdx];
      }
      updateInput();
      return;
    }

    // printable characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      inputBuffer += e.key;
      updateInput();
    }
  });

  // ----- Tab completion -----
  function tabComplete() {
    var parts = inputBuffer.split(/\s+/);
    if (parts.length <= 1) {
      // complete command name
      var prefix = parts[0] || '';
      var matches = Object.keys(commands).filter(function (c) {
        return c.indexOf(prefix) === 0;
      });
      if (matches.length === 1) {
        inputBuffer = matches[0] + ' ';
        updateInput();
      } else if (matches.length > 1) {
        print(getPrompt() + inputBuffer);
        print(matches.join('  '));
      }
    } else {
      // complete file/dir name
      var partial = parts[parts.length - 1];
      var dir = cwd;
      var filePrefix = partial;
      var slashIdx = partial.lastIndexOf('/');
      if (slashIdx !== -1) {
        dir = resolvePath(partial.slice(0, slashIdx + 1));
        filePrefix = partial.slice(slashIdx + 1);
      }
      var node = getNode(dir);
      if (!node || !isDir(node)) return;
      var matches = Object.keys(node).filter(function (n) {
        return n.indexOf(filePrefix) === 0;
      });
      if (matches.length === 1) {
        parts[parts.length - 1] = (slashIdx !== -1 ? partial.slice(0, slashIdx + 1) : '') + matches[0];
        if (isDir(node[matches[0]])) parts[parts.length - 1] += '/';
        inputBuffer = parts.join(' ');
        updateInput();
      } else if (matches.length > 1) {
        print(getPrompt() + inputBuffer);
        print(matches.join('  '));
      }
    }
  }

  function updateInput() {
    inputEl.textContent = inputBuffer;
    scrollToBottom();
  }

  // ----- Focus on click -----
  body.addEventListener('click', function () {
    body.focus();
  });

  // ----- Init -----
  updatePrompt();
  print('TinyOS v1.0 - type "help"');
  body.focus();
})();
