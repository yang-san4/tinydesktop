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

  // ----- Output mode (dom vs buffer for pipe capture) -----
  var outputMode = 'dom';
  var outputBuffer = '';

  // ----- Environment variables -----
  var envVars = {
    HOME: '/home/user',
    USER: 'user',
    SHELL: '/bin/tsh',
    PATH: '/usr/bin:/bin',
    TERM: 'tinyterm',
    HOSTNAME: 'tinyos.local'
  };

  // ----- Editor state -----
  var editorMode = false;
  var editorState = null;

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

  var UNSAFE_NAMES = ['__proto__', 'constructor', 'prototype'];
  var PROTECTED_PATHS = ['/', '/home', '/home/user'];
  var cwd = '/home/user';

  // Cache hasOwnProperty to prevent breakage if Object.prototype is polluted
  var _hasOwn = Object.prototype.hasOwnProperty;

  // ----- Filesystem helpers -----
  function resolvePath(p) {
    if (!p) return cwd;
    if (p === '~') return '/home/user';
    if (p.indexOf('~/') === 0) p = '/home/user/' + p.slice(2);
    if (p[0] !== '/') p = cwd + '/' + p;
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
      if (UNSAFE_NAMES.indexOf(parts[i]) !== -1) return undefined;
      if (!_hasOwn.call(node, parts[i])) return undefined;
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

  function deepCopyNode(node) {
    if (typeof node !== 'object' || node === null) return node;
    var copy = {};
    var keys = Object.keys(node);
    for (var i = 0; i < keys.length; i++) {
      if (UNSAFE_NAMES.indexOf(keys[i]) !== -1) continue;
      copy[keys[i]] = deepCopyNode(node[keys[i]]);
    }
    return copy;
  }

  function matchGlob(name, pattern) {
    var re = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
                          .replace(/\*/g, '.*')
                          .replace(/\?/g, '.') + '$';
    return new RegExp(re).test(name);
  }

  function getFileOrStdin(args, stdin) {
    if (args.length > 0) {
      var path = resolvePath(args[0]);
      var node = getNode(path);
      if (node === undefined) return { error: args[0] + ': No such file' };
      if (isDir(node)) return { error: args[0] + ': Is a directory' };
      return { data: node };
    }
    if (stdin !== null && stdin !== undefined) {
      return { data: stdin.replace(/\n$/, '') };
    }
    return { error: 'missing file operand' };
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
    if (outputMode === 'buffer') {
      outputBuffer += text + '\n';
    } else {
      output.textContent += text + '\n';
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  // ----- Capture output for pipes -----
  function captureOutput(cmd, args, stdin) {
    var prevMode = outputMode;
    var prevBuffer = outputBuffer;
    outputMode = 'buffer';
    outputBuffer = '';
    if (_hasOwn.call(commands, cmd)) {
      commands[cmd](args, stdin);
    }
    var result = outputBuffer;
    outputMode = prevMode;
    outputBuffer = prevBuffer;
    return result;
  }

  // ----- Tokenizer -----
  function tokenize(line) {
    var tokens = [];
    var i = 0;
    while (i < line.length) {
      if (line[i] === ' ' || line[i] === '\t') { i++; continue; }
      if (line[i] === '|') { tokens.push({ type: 'PIPE' }); i++; continue; }
      if (line[i] === '>') {
        if (i + 1 < line.length && line[i + 1] === '>') {
          tokens.push({ type: 'REDIR_APPEND' }); i += 2;
        } else {
          tokens.push({ type: 'REDIR_WRITE' }); i++;
        }
        continue;
      }
      var word = '';
      while (i < line.length && line[i] !== ' ' && line[i] !== '\t' &&
             line[i] !== '|' && line[i] !== '>') {
        if (line[i] === '"') {
          i++;
          while (i < line.length && line[i] !== '"') {
            if (line[i] === '\\' && i + 1 < line.length) { i++; word += line[i]; }
            else { word += line[i]; }
            i++;
          }
          if (i < line.length) i++;
        } else if (line[i] === "'") {
          i++;
          while (i < line.length && line[i] !== "'") { word += line[i]; i++; }
          if (i < line.length) i++;
        } else if (line[i] === '\\' && i + 1 < line.length) {
          i++; word += line[i]; i++;
        } else {
          word += line[i]; i++;
        }
      }
      if (word.length > 0) tokens.push({ type: 'WORD', value: word });
    }
    return tokens;
  }

  // ----- Variable expansion -----
  function expandVars(tokens) {
    var result = [];
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'WORD') {
        var val = tokens[i].value.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, function (m, name) {
          return _hasOwn.call(envVars, name) ? envVars[name] : '';
        });
        result.push({ type: 'WORD', value: val });
      } else {
        result.push(tokens[i]);
      }
    }
    return result;
  }

  // ----- Split tokens on pipes, extract redirects -----
  function splitOnPipes(tokens) {
    var segments = [];
    var current = { words: [], redir: null };
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'PIPE') {
        segments.push(current);
        current = { words: [], redir: null };
      } else if (tokens[i].type === 'REDIR_WRITE' || tokens[i].type === 'REDIR_APPEND') {
        if (i + 1 < tokens.length && tokens[i + 1].type === 'WORD') {
          current.redir = { type: tokens[i].type, file: tokens[i + 1].value };
          i++;
        }
      } else {
        current.words.push(tokens[i].value);
      }
    }
    segments.push(current);
    return segments;
  }

  // Commands that cannot be used in pipes
  var noPipeCommands = ['clear', 'matrix', 'sl', 'nano', 'edit'];

  // ----- Theme detection -----
  function getThemeName() {
    var scr = document.getElementById('screen');
    if (scr.classList.contains('theme-japanese')) return 'Wafuu';
    if (scr.classList.contains('theme-wood')) return 'Wood';
    if (scr.classList.contains('theme-mac')) return 'Classic';
    if (scr.classList.contains('theme-osx')) return 'Aqua';
    return 'Vapor';
  }

  function repeat(ch, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += ch;
    return s;
  }

  // ===== Commands =====
  var commands = {};

  // ----- help -----
  commands.help = function () {
    print('=== File System ===');
    print('  ls [-a]            List files');
    print('  cat <file>         Show file contents');
    print('  cd <dir>           Change directory');
    print('  pwd                Print working dir');
    print('  mkdir <dir>        Create directory');
    print('  touch <f>          Create empty file');
    print('  rm [-r] <path>     Remove file/dir');
    print('  mv <src> <dst>     Move/rename');
    print('  cp [-r] <s> <d>    Copy file/dir');
    print('  tree [dir]         Directory tree');
    print('  find [dir] [-name] Search files');
    print('');
    print('=== Text Processing ===');
    print('  echo <text>        Print text');
    print('  grep <pat> [file]  Pattern search');
    print('  head [-n N] [file] First N lines');
    print('  tail [-n N] [file] Last N lines');
    print('  wc [file]          Line/word/char count');
    print('  sort [file]        Sort lines');
    print('  rev [text]         Reverse string');
    print('');
    print('=== Shell Features ===');
    print('  cmd1 | cmd2        Pipe output');
    print('  cmd > file         Redirect (write)');
    print('  cmd >> file        Redirect (append)');
    print('  $VAR               Variable expansion');
    print('  export K=V         Set env variable');
    print('  env                Show env variables');
    print('  history            Command history');
    print('');
    print('=== System ===');
    print('  date               Show date/time');
    print('  uptime             System uptime');
    print('  hostname           Host name');
    print('  whoami             Current user');
    print('  uname [-a]         System info');
    print('  neofetch           System summary');
    print('  clear              Clear screen');
    print('  ps                 Process list');
    print('  kill <pid>         Kill by PID');
    print('  close <app>        Close app by name');
    print('');
    print('=== Apps ===');
    print('  open <app>         Open an app');
    print('  nano <file>        Text editor');
    print('  theme [name]       Show/switch theme');
    print('');
    print('=== Fun ===');
    print('  cowsay <text>      Cow says text');
    print('  matrix             Matrix rain');
    print('  fortune            Random quote');
    print('  cal                Calendar');
    print('  sl                 Steam locomotive');
    print('  figlet <text>      Big ASCII text');
    print('  yes [text]         Repeat text');
    print('  factor <n>         Prime factors');
  };

  // ----- ls -----
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

  // ----- cat -----
  commands.cat = function (args, stdin) {
    if (args.length === 0) {
      if (stdin !== null && stdin !== undefined) { print(stdin.replace(/\n$/, '')); return; }
      print('cat: missing file'); return;
    }
    var path = resolvePath(args[0]);
    var node = getNode(path);
    if (node === undefined) { print('cat: ' + args[0] + ': No such file'); return; }
    if (isDir(node)) { print('cat: ' + args[0] + ': Is a directory'); return; }
    print(node);
  };

  // ----- cd -----
  commands.cd = function (args) {
    var target = args[0] || '~';
    var path = resolvePath(target);
    var node = getNode(path);
    if (node === undefined) { print('cd: ' + target + ': No such directory'); return; }
    if (!isDir(node)) { print('cd: ' + target + ': Not a directory'); return; }
    cwd = path;
  };

  commands.pwd = function () { print(cwd); };
  commands.echo = function (args) { print(args.join(' ')); };
  commands.date = function () { print(new Date().toString()); };
  commands.clear = function () { output.textContent = ''; };
  commands.whoami = function () { print('user'); };

  commands.uname = function (args) {
    if (args.indexOf('-a') !== -1) {
      print('TinyOS 1.0 pixel-arch tinyos 1.0.0 TinyDesktop');
    } else {
      print('TinyOS 1.0 pixel-arch');
    }
  };

  // ----- neofetch -----
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
      '        \\|   |/     Shell: tsh 0.2',
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

  // ----- cowsay -----
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

  // ----- theme -----
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
    if (!_hasOwn.call(themeMap, name)) {
      print('Unknown theme: ' + args[0]);
      print('Available: vapor, wafuu, mokume, classic, aqua');
      return;
    }
    var cls = themeMap[name];
    var scr = document.getElementById('screen');
    scr.className = cls ? 'theme-' + cls : '';
    document.querySelectorAll('[data-theme]').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('[data-theme="' + cls + '"]').forEach(function (b) { b.classList.add('active'); });
    document.querySelectorAll('[data-ctx-theme]').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('[data-ctx-theme="' + cls + '"]').forEach(function (b) { b.classList.add('active'); });
    print('Theme changed to ' + nameMap[cls]);
  };

  // ----- open -----
  var appMap = {
    'clock': 'window-clock', 'calendar': 'window-calendar',
    'terminal': 'window-terminal', 'aquarium': 'window-aquarium',
    'timer': 'widget-hourglass', 'hourglass': 'widget-hourglass',
    'david': 'widget-david', 'mines': 'window-minesweeper',
    'minesweeper': 'window-minesweeper', 'maze': 'window-maze',
    '3dmaze': 'window-maze', 'piano': 'window-piano',
    'about': 'window-about',
    'browser': 'window-browser', 'tinyweb': 'window-browser',
    'gekko': 'window-fps', 'fps': 'window-fps',
    'tetris': 'window-tetris'
  };

  commands.open = function (args) {
    if (args.length === 0) {
      print('Usage: open <app>');
      print('Apps: ' + Object.keys(appMap).join(', '));
      return;
    }
    var name = args[0].toLowerCase();
    if (!_hasOwn.call(appMap, name)) {
      print('Unknown app: ' + args[0]);
      print('Apps: ' + Object.keys(appMap).join(', '));
      return;
    }
    var el = document.getElementById(appMap[name]);
    if (!el) { print('App not found'); return; }
    el.classList.remove('minimized');
    el.classList.remove('closed');
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

  // ----- matrix -----
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
        if (drops[c] > rows + 4) { drops[c] = Math.floor(Math.random() * -4); }
      }
      var text = '';
      for (var r = 0; r < rows; r++) { text += grid[r].join('') + '\n'; }
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

  // ----- mkdir -----
  commands.mkdir = function (args) {
    if (args.length === 0) { print('mkdir: missing operand'); return; }
    var path = resolvePath(args[0]);
    var info = getParentAndName(path);
    if (!info.parent || !isDir(info.parent)) { print('mkdir: cannot create directory'); return; }
    if (UNSAFE_NAMES.indexOf(info.name) !== -1) { print('mkdir: invalid name'); return; }
    if (info.parent[info.name] !== undefined) { print('mkdir: ' + args[0] + ': already exists'); return; }
    info.parent[info.name] = {};
  };

  // ----- touch -----
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

  // ----- rm [-r] -----
  commands.rm = function (args) {
    if (args.length === 0) { print('rm: missing operand'); return; }
    var recursive = false;
    var targets = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '-r' || args[i] === '-rf' || args[i] === '-fr') recursive = true;
      else targets.push(args[i]);
    }
    if (targets.length === 0) { print('rm: missing operand'); return; }
    for (var t = 0; t < targets.length; t++) {
      var path = resolvePath(targets[t]);
      if (PROTECTED_PATHS.indexOf(path) !== -1) {
        print('rm: cannot remove \'' + targets[t] + '\': Permission denied');
        continue;
      }
      var info = getParentAndName(path);
      if (UNSAFE_NAMES.indexOf(info.name) !== -1) { print('rm: invalid name'); continue; }
      if (!info.parent || !_hasOwn.call(info.parent, info.name)) {
        print('rm: ' + targets[t] + ': No such file or directory'); continue;
      }
      if (isDir(info.parent[info.name]) && !recursive) {
        print('rm: ' + targets[t] + ': Is a directory (use -r)'); continue;
      }
      delete info.parent[info.name];
    }
  };

  // ----- mv -----
  commands.mv = function (args) {
    if (args.length < 2) { print('mv: missing operand'); return; }
    var srcPath = resolvePath(args[0]);
    var dstPath = resolvePath(args[1]);
    var srcInfo = getParentAndName(srcPath);
    if (!srcInfo.parent || !_hasOwn.call(srcInfo.parent, srcInfo.name)) {
      print('mv: ' + args[0] + ': No such file or directory'); return;
    }
    var dstNode = getNode(dstPath);
    var dstInfo;
    if (dstNode !== undefined && isDir(dstNode)) {
      dstInfo = { parent: dstNode, name: srcInfo.name };
    } else {
      dstInfo = getParentAndName(dstPath);
    }
    if (!dstInfo.parent || !isDir(dstInfo.parent)) {
      print('mv: cannot move to \'' + args[1] + '\''); return;
    }
    if (UNSAFE_NAMES.indexOf(dstInfo.name) !== -1) { print('mv: invalid name'); return; }
    dstInfo.parent[dstInfo.name] = srcInfo.parent[srcInfo.name];
    delete srcInfo.parent[srcInfo.name];
  };

  // ----- cp [-r] -----
  commands.cp = function (args) {
    var recursive = false;
    var paths = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '-r' || args[i] === '-R') recursive = true;
      else paths.push(args[i]);
    }
    if (paths.length < 2) { print('cp: missing operand'); return; }
    var srcPath = resolvePath(paths[0]);
    var dstPath = resolvePath(paths[1]);
    var srcNode = getNode(srcPath);
    if (srcNode === undefined) { print('cp: ' + paths[0] + ': No such file or directory'); return; }
    if (isDir(srcNode) && !recursive) {
      print('cp: ' + paths[0] + ': Is a directory (use -r)'); return;
    }
    var dstNode = getNode(dstPath);
    var dstInfo;
    if (dstNode !== undefined && isDir(dstNode)) {
      var srcName = srcPath.split('/').filter(Boolean).pop();
      dstInfo = { parent: dstNode, name: srcName };
    } else {
      dstInfo = getParentAndName(dstPath);
    }
    if (!dstInfo.parent || !isDir(dstInfo.parent)) {
      print('cp: cannot copy to \'' + paths[1] + '\''); return;
    }
    if (UNSAFE_NAMES.indexOf(dstInfo.name) !== -1) { print('cp: invalid name'); return; }
    dstInfo.parent[dstInfo.name] = isDir(srcNode) ? deepCopyNode(srcNode) : srcNode;
  };

  // ----- grep -----
  commands.grep = function (args, stdin) {
    if (args.length === 0) { print('grep: missing pattern'); return; }
    var pattern = args[0];
    var fileArgs = args.slice(1);
    var result = getFileOrStdin(fileArgs, stdin);
    if (result.error) { print('grep: ' + result.error); return; }
    var lines = result.data.split('\n');
    var re;
    try { re = new RegExp(pattern); }
    catch (e) { re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }
    for (var i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) print(lines[i]);
    }
  };

  // ----- head -----
  commands.head = function (args, stdin) {
    var n = 10;
    var fileArgs = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '-n' && i + 1 < args.length) { n = parseInt(args[++i]) || 10; }
      else { fileArgs.push(args[i]); }
    }
    var result = getFileOrStdin(fileArgs, stdin);
    if (result.error) { print('head: ' + result.error); return; }
    var lines = result.data.split('\n');
    for (var j = 0; j < Math.min(n, lines.length); j++) { print(lines[j]); }
  };

  // ----- tail -----
  commands.tail = function (args, stdin) {
    var n = 10;
    var fileArgs = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '-n' && i + 1 < args.length) { n = parseInt(args[++i]) || 10; }
      else { fileArgs.push(args[i]); }
    }
    var result = getFileOrStdin(fileArgs, stdin);
    if (result.error) { print('tail: ' + result.error); return; }
    var lines = result.data.split('\n');
    var start = Math.max(0, lines.length - n);
    for (var j = start; j < lines.length; j++) { print(lines[j]); }
  };

  // ----- wc -----
  commands.wc = function (args, stdin) {
    var result = getFileOrStdin(args, stdin);
    if (result.error) { print('wc: ' + result.error); return; }
    var text = result.data;
    var lines = text.split('\n').length;
    var words = text.split(/\s+/).filter(Boolean).length;
    var chars = text.length;
    print('  ' + lines + '  ' + words + '  ' + chars);
  };

  // ----- sort -----
  commands.sort = function (args, stdin) {
    var result = getFileOrStdin(args, stdin);
    if (result.error) { print('sort: ' + result.error); return; }
    var lines = result.data.split('\n');
    lines.sort();
    print(lines.join('\n'));
  };

  // ----- rev -----
  commands.rev = function (args, stdin) {
    var text;
    if (args.length > 0) { text = args.join(' '); }
    else if (stdin !== null && stdin !== undefined) { text = stdin.replace(/\n$/, ''); }
    else { print('rev: missing input'); return; }
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      print(lines[i].split('').reverse().join(''));
    }
  };

  // ----- tree -----
  commands.tree = function (args) {
    var target = args.length > 0 ? resolvePath(args[0]) : cwd;
    var node = getNode(target);
    if (node === undefined) { print('tree: not found'); return; }
    if (!isDir(node)) { print('tree: not a directory'); return; }
    var dirName = target === '/' ? '/' : target.split('/').pop();
    print(dirName);
    var dirCount = 0, fileCount = 0;
    function walk(nd, prefix) {
      var keys = Object.keys(nd).sort();
      for (var i = 0; i < keys.length; i++) {
        var isLast = (i === keys.length - 1);
        var connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
        var child = nd[keys[i]];
        if (isDir(child)) {
          print(prefix + connector + keys[i] + '/');
          dirCount++;
          walk(child, prefix + (isLast ? '    ' : '\u2502   '));
        } else {
          print(prefix + connector + keys[i]);
          fileCount++;
        }
      }
    }
    walk(node, '');
    print('\n' + dirCount + ' directories, ' + fileCount + ' files');
  };

  // ----- find -----
  commands.find = function (args) {
    var dir = cwd;
    var namePattern = null;
    var i = 0;
    if (i < args.length && args[i] !== '-name') { dir = resolvePath(args[i]); i++; }
    if (i < args.length && args[i] === '-name' && i + 1 < args.length) {
      namePattern = args[i + 1]; i += 2;
    }
    var node = getNode(dir);
    if (node === undefined || !isDir(node)) { print('find: no such directory'); return; }
    var displayDir = (dir === cwd) ? '.' : dir;
    if (!namePattern) print(displayDir);
    function walk(nd, path) {
      var keys = Object.keys(nd).sort();
      for (var j = 0; j < keys.length; j++) {
        var fullPath = path + '/' + keys[j];
        if (!namePattern || matchGlob(keys[j], namePattern)) { print(fullPath); }
        if (isDir(nd[keys[j]])) { walk(nd[keys[j]], fullPath); }
      }
    }
    walk(node, displayDir);
  };

  // ----- history -----
  commands.history = function () {
    for (var i = 0; i < history.length; i++) {
      print('  ' + (i + 1) + '  ' + history[i]);
    }
  };

  // ----- ps -----
  commands.ps = function () {
    print('  PID  STATE    NAME');
    var items = document.querySelectorAll('.window, .widget');
    items.forEach(function (el, idx) {
      var titleEl = el.querySelector('.title-bar-text');
      var name = titleEl ? titleEl.textContent : (el.dataset.title || el.id);
      var state;
      if (el.classList.contains('closed')) state = 'stopped';
      else if (el.classList.contains('minimized')) state = 'sleep  ';
      else state = 'running';
      var pid = idx + 1;
      var pidStr = String(pid);
      while (pidStr.length < 4) pidStr = ' ' + pidStr;
      print(pidStr + '  ' + state + '  ' + name);
    });
  };

  // ----- kill -----
  commands.kill = function (args) {
    if (args.length === 0) { print('kill: missing PID'); return; }
    var pid = parseInt(args[0]);
    var items = document.querySelectorAll('.window, .widget');
    if (isNaN(pid) || pid < 1 || pid > items.length) {
      print('kill: (' + args[0] + ') - No such process'); return;
    }
    var el = items[pid - 1];
    el.classList.remove('minimized');
    el.classList.add('closed');
    document.dispatchEvent(new Event('tinydesktop-update'));
    var titleEl = el.querySelector('.title-bar-text');
    var name = titleEl ? titleEl.textContent : (el.dataset.title || el.id);
    print('Killed ' + name + ' (PID ' + pid + ')');
  };

  // ----- close -----
  commands.close = function (args) {
    if (args.length === 0) { print('close: missing app name'); return; }
    var name = args[0].toLowerCase();
    if (_hasOwn.call(appMap, name)) {
      var el = document.getElementById(appMap[name]);
      if (el && !el.classList.contains('closed')) {
        el.classList.remove('minimized');
        el.classList.add('closed');
        document.dispatchEvent(new Event('tinydesktop-update'));
        print('Closed ' + args[0]);
        return;
      }
    }
    var items = document.querySelectorAll('.window:not(.closed), .widget:not(.closed)');
    var found = false;
    items.forEach(function (el) {
      if (found) return;
      var titleEl = el.querySelector('.title-bar-text');
      var title = titleEl ? titleEl.textContent : (el.dataset.title || '');
      if (title.toLowerCase().indexOf(name) !== -1) {
        el.classList.remove('minimized');
        el.classList.add('closed');
        document.dispatchEvent(new Event('tinydesktop-update'));
        print('Closed ' + title);
        found = true;
      }
    });
    if (!found) print('close: ' + args[0] + ': not found');
  };

  // ----- export -----
  commands.export = function (args) {
    if (args.length === 0) {
      var keys = Object.keys(envVars).sort();
      for (var i = 0; i < keys.length; i++) {
        print('export ' + keys[i] + '="' + envVars[keys[i]] + '"');
      }
      return;
    }
    var expr = args.join(' ');
    var eqIdx = expr.indexOf('=');
    if (eqIdx === -1) {
      if (_hasOwn.call(envVars, expr)) print(expr + '=' + envVars[expr]);
      return;
    }
    var key = expr.slice(0, eqIdx).trim();
    var val = expr.slice(eqIdx + 1).trim();
    if ((val[0] === '"' && val[val.length - 1] === '"') ||
        (val[0] === "'" && val[val.length - 1] === "'")) {
      val = val.slice(1, -1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && UNSAFE_NAMES.indexOf(key) === -1) {
      envVars[key] = val;
    } else {
      print('export: invalid name: ' + key);
    }
  };

  // ----- env -----
  commands.env = function () {
    var keys = Object.keys(envVars).sort();
    for (var i = 0; i < keys.length; i++) {
      print(keys[i] + '=' + envVars[keys[i]]);
    }
  };

  // ----- nano / edit -----
  commands.nano = function (args) {
    if (args.length === 0) { print('nano: missing filename'); return; }
    var filename = args[0];
    var path = resolvePath(filename);
    var node = getNode(path);
    var content = '';
    if (node !== undefined) {
      if (isDir(node)) { print('nano: ' + filename + ': Is a directory'); return; }
      content = node;
    }
    editorMode = true;
    var lines = content.length > 0 ? content.split('\n') : [''];
    editorState = {
      filename: filename,
      path: path,
      lines: lines,
      cursorLine: 0,
      isNew: (node === undefined)
    };
    renderEditor();
  };
  commands.edit = commands.nano;

  function renderEditor() {
    if (!editorState) return;
    output.textContent = '';
    output.textContent += '  GNU nano  ' + editorState.filename +
      (editorState.isNew ? ' [New]' : '') + '\n';
    output.textContent += repeat('\u2500', 40) + '\n';
    var startLine = Math.max(0, editorState.cursorLine - 8);
    var endLine = Math.min(editorState.lines.length, startLine + 12);
    for (var i = startLine; i < endLine; i++) {
      var prefix = (i === editorState.cursorLine) ? '> ' : '  ';
      output.textContent += prefix + editorState.lines[i] + '\n';
    }
    output.textContent += repeat('\u2500', 40) + '\n';
    output.textContent += ' ^S Save   ^X Exit   \u2191\u2193 Navigate\n';
    inputEl.textContent = editorState.lines[editorState.cursorLine];
    promptEl.textContent = 'nano> ';
    scrollToBottom();
  }

  // ----- fortune -----
  var fortunes = [
    'The only way to do great work is to love what you do. - Steve Jobs',
    'In the middle of difficulty lies opportunity. - Einstein',
    'Talk is cheap. Show me the code. - Linus Torvalds',
    'First, solve the problem. Then, write the code. - John Johnson',
    'Any fool can write code that a computer can understand.',
    'The best error message is the one that never shows up.',
    'Simplicity is the soul of efficiency. - Austin Freeman',
    'Code is like humor. When you have to explain it, it\'s bad.',
    'Fix the cause, not the symptom. - Steve Maguire',
    'Premature optimization is the root of all evil. - Knuth',
    'There are only two hard things in CS: cache invalidation and naming things.',
    'It works on my machine!',
    'Have you tried turning it off and on again?',
    '// TODO: fix this later   (written 3 years ago)',
    'A user interface is like a joke. If you have to explain it, it\'s not that good.',
    'Weeks of coding can save hours of planning.'
  ];
  commands.fortune = function () {
    print(fortunes[Math.floor(Math.random() * fortunes.length)]);
  };

  // ----- cal -----
  commands.cal = function () {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
    var title = monthNames[month] + ' ' + year;
    var pad = Math.max(0, Math.floor((20 - title.length) / 2));
    print(repeat(' ', pad) + title);
    print('Su Mo Tu We Th Fr Sa');
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var line = '';
    for (var p = 0; p < firstDay; p++) line += '   ';
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = d < 10 ? ' ' + d : '' + d;
      line += ds;
      if (d === today) { line += '*'; } else { line += ' '; }
      if ((firstDay + d) % 7 === 0) {
        print(line.replace(/\s+$/, ''));
        line = '';
      }
    }
    if (line.trim().length > 0) print(line.replace(/\s+$/, ''));
  };

  // ----- sl -----
  commands.sl = function () {
    var inputLine = document.getElementById('terminal-input-line');
    inputLine.style.display = 'none';
    var train = [
      '      ====        ________',
      '  _D _|  |_______/        \\__I_I_____===__|_',
      '   |(_)---  |   H\\________/ |   |        =|_',
      '   /     |  |   H  |  |     |   |         ||',
      '  |      |  |   H  |__----__|   |         =|',
      '  | ________|___H__/__|_____/[][]~\\_______|',
      '  |/ |   |-----------I_____I [][] []  D   |=|',
      '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__',
      ' |/-=|___|=    ||    ||    ||    |_____/~\\___/       |',
      '  \\_/      \\O=====O=====O=====O_/      \\_/          /'
    ];
    var slDiv = document.createElement('div');
    slDiv.style.cssText = 'font-family:monospace;font-size:5px;line-height:6px;white-space:pre;overflow:hidden;';
    output.appendChild(slDiv);
    var pos = -55;
    var maxPos = 50;
    function renderFrame() {
      var display = '';
      for (var i = 0; i < train.length; i++) {
        if (pos >= 0) {
          display += repeat(' ', pos) + train[i] + '\n';
        } else {
          var cut = Math.min(-pos, train[i].length);
          display += train[i].slice(cut) + '\n';
        }
      }
      slDiv.textContent = display;
      scrollToBottom();
      pos++;
      if (pos < maxPos) {
        setTimeout(renderFrame, 40);
      } else {
        slDiv.remove();
        inputLine.style.display = '';
        scrollToBottom();
      }
    }
    renderFrame();
  };

  // ----- figlet -----
  var figletFont = {
    'A': [' # ', '# #', '###', '# #', '# #'],
    'B': ['## ', '# #', '## ', '# #', '## '],
    'C': [' ##', '#  ', '#  ', '#  ', ' ##'],
    'D': ['## ', '# #', '# #', '# #', '## '],
    'E': ['###', '#  ', '## ', '#  ', '###'],
    'F': ['###', '#  ', '## ', '#  ', '#  '],
    'G': [' ##', '#  ', '# #', '# #', ' ##'],
    'H': ['# #', '# #', '###', '# #', '# #'],
    'I': ['###', ' # ', ' # ', ' # ', '###'],
    'J': ['###', '  #', '  #', '# #', ' # '],
    'K': ['# #', '## ', '#  ', '## ', '# #'],
    'L': ['#  ', '#  ', '#  ', '#  ', '###'],
    'M': ['# #', '###', '# #', '# #', '# #'],
    'N': ['# #', '###', '###', '# #', '# #'],
    'O': [' # ', '# #', '# #', '# #', ' # '],
    'P': ['## ', '# #', '## ', '#  ', '#  '],
    'Q': [' # ', '# #', '# #', ' # ', '  #'],
    'R': ['## ', '# #', '## ', '# #', '# #'],
    'S': [' ##', '#  ', ' # ', '  #', '## '],
    'T': ['###', ' # ', ' # ', ' # ', ' # '],
    'U': ['# #', '# #', '# #', '# #', ' # '],
    'V': ['# #', '# #', '# #', ' # ', ' # '],
    'W': ['# #', '# #', '# #', '###', '# #'],
    'X': ['# #', '# #', ' # ', '# #', '# #'],
    'Y': ['# #', '# #', ' # ', ' # ', ' # '],
    'Z': ['###', '  #', ' # ', '#  ', '###'],
    '0': [' # ', '# #', '# #', '# #', ' # '],
    '1': [' # ', '## ', ' # ', ' # ', '###'],
    '2': [' # ', '# #', '  #', ' # ', '###'],
    '3': ['## ', '  #', ' # ', '  #', '## '],
    '4': ['# #', '# #', '###', '  #', '  #'],
    '5': ['###', '#  ', '## ', '  #', '## '],
    '6': [' # ', '#  ', '## ', '# #', ' # '],
    '7': ['###', '  #', ' # ', ' # ', ' # '],
    '8': [' # ', '# #', ' # ', '# #', ' # '],
    '9': [' # ', '# #', ' ##', '  #', ' # '],
    ' ': ['   ', '   ', '   ', '   ', '   '],
    '!': [' # ', ' # ', ' # ', '   ', ' # '],
    '.': ['   ', '   ', '   ', '   ', ' # '],
    '?': [' # ', '# #', '  #', ' # ', ' # ']
  };

  commands.figlet = function (args) {
    if (args.length === 0) { print('figlet: missing text'); return; }
    var text = args.join(' ').toUpperCase();
    var rows = ['', '', '', '', ''];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var glyph = figletFont[ch] || figletFont['?'];
      for (var r = 0; r < 5; r++) {
        rows[r] += glyph[r] + ' ';
      }
    }
    print(rows.join('\n'));
  };

  // ----- uptime -----
  commands.uptime = function () {
    var upSec = Math.floor((Date.now() - startTime) / 1000);
    var upM = Math.floor(upSec / 60);
    var upS = upSec % 60;
    var upH = Math.floor(upM / 60);
    upM = upM % 60;
    print('up ' + (upH > 0 ? upH + 'h ' : '') + upM + 'm ' + upS + 's');
  };

  // ----- hostname -----
  commands.hostname = function () { print('tinyos.local'); };

  // ----- yes -----
  commands.yes = function (args) {
    var text = args.length > 0 ? args.join(' ') : 'y';
    for (var i = 0; i < 20; i++) print(text);
  };

  // ----- factor -----
  commands.factor = function (args) {
    if (args.length === 0) { print('factor: missing number'); return; }
    var n = parseInt(args[0]);
    if (isNaN(n) || n < 1) { print('factor: invalid number'); return; }
    var original = n;
    var factors = [];
    for (var d = 2; d * d <= n; d++) {
      while (n % d === 0) { factors.push(d); n = n / d; }
    }
    if (n > 1) factors.push(n);
    print(original + ': ' + factors.join(' '));
  };

  // ===== Command execution (pipeline runner) =====
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

    // Handle && chaining
    var chainParts = splitOnAnd(trimmed);
    for (var ci = 0; ci < chainParts.length; ci++) {
      executeCommand(chainParts[ci]);
    }
  }

  // Split on && but respect quotes
  function splitOnAnd(line) {
    var parts = [];
    var current = '';
    var inSingle = false;
    var inDouble = false;
    for (var i = 0; i < line.length; i++) {
      if (line[i] === "'" && !inDouble) { inSingle = !inSingle; current += line[i]; continue; }
      if (line[i] === '"' && !inSingle) { inDouble = !inDouble; current += line[i]; continue; }
      if (!inSingle && !inDouble && line[i] === '&' && i + 1 < line.length && line[i + 1] === '&') {
        parts.push(current.trim());
        current = '';
        i++; // skip second &
        continue;
      }
      current += line[i];
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  function executeCommand(trimmed) {
    if (!trimmed) return;

    var tokens = tokenize(trimmed);
    if (tokens.length === 0) return;

    tokens = expandVars(tokens);
    var segments = splitOnPipes(tokens);

    var stdin = null;
    for (var s = 0; s < segments.length; s++) {
      var seg = segments[s];
      if (seg.words.length === 0) continue;
      var cmd = seg.words[0];
      var args = seg.words.slice(1);

      if (!_hasOwn.call(commands, cmd)) {
        print(cmd + ': command not found');
        return;
      }

      var inPipe = (segments.length > 1);
      if (inPipe && noPipeCommands.indexOf(cmd) !== -1) {
        print(cmd + ': cannot be used in a pipe');
        return;
      }

      var needCapture = (s < segments.length - 1) || (seg.redir !== null);
      if (needCapture && noPipeCommands.indexOf(cmd) === -1) {
        var captured = captureOutput(cmd, args, stdin);
        if (seg.redir !== null) {
          var redirPath = resolvePath(seg.redir.file);
          var redirInfo = getParentAndName(redirPath);
          if (!redirInfo.parent || !isDir(redirInfo.parent)) {
            print('redirect: cannot write to ' + seg.redir.file); return;
          }
          if (UNSAFE_NAMES.indexOf(redirInfo.name) !== -1) {
            print('redirect: invalid filename'); return;
          }
          var content = captured.replace(/\n$/, '');
          if (seg.redir.type === 'REDIR_APPEND') {
            var existing = redirInfo.parent[redirInfo.name];
            if (existing === undefined) existing = '';
            else if (typeof existing !== 'string') { print('redirect: target is a directory'); return; }
            redirInfo.parent[redirInfo.name] = existing + (existing ? '\n' : '') + content;
          } else {
            redirInfo.parent[redirInfo.name] = content;
          }
          stdin = null;
        } else {
          stdin = captured;
        }
      } else {
        commands[cmd](args, stdin);
        stdin = null;
      }
    }
  }

  // ===== Key input =====
  body.addEventListener('keydown', function (e) {
    // ----- Editor mode -----
    if (editorMode && editorState) {
      e.preventDefault();

      if (e.ctrlKey && e.key === 'x') {
        editorMode = false;
        editorState = null;
        output.textContent = '';
        updatePrompt();
        inputEl.textContent = '';
        inputBuffer = '';
        print('[nano exited]');
        return;
      }

      if (e.ctrlKey && e.key === 's') {
        var info = getParentAndName(editorState.path);
        if (info.parent && isDir(info.parent) && UNSAFE_NAMES.indexOf(info.name) === -1) {
          info.parent[info.name] = editorState.lines.join('\n');
          editorState.isNew = false;
        }
        renderEditor();
        return;
      }

      if (e.key === 'ArrowUp') {
        if (editorState.cursorLine > 0) editorState.cursorLine--;
        renderEditor(); return;
      }
      if (e.key === 'ArrowDown') {
        if (editorState.cursorLine < editorState.lines.length - 1) editorState.cursorLine++;
        renderEditor(); return;
      }
      if (e.key === 'Enter') {
        editorState.lines.splice(editorState.cursorLine + 1, 0, '');
        editorState.cursorLine++;
        renderEditor(); return;
      }
      if (e.key === 'Backspace') {
        var cl = editorState.cursorLine;
        if (editorState.lines[cl].length > 0) {
          editorState.lines[cl] = editorState.lines[cl].slice(0, -1);
        } else if (cl > 0) {
          editorState.lines.splice(cl, 1);
          editorState.cursorLine--;
        }
        renderEditor(); return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        editorState.lines[editorState.cursorLine] += e.key;
        renderEditor(); return;
      }
      return;
    }

    // ----- Normal terminal mode -----
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

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      inputBuffer += e.key;
      updateInput();
    }
  });

  // ----- Tab completion -----
  function tabComplete() {
    var tokens = tokenize(inputBuffer);
    var words = [];
    for (var t = 0; t < tokens.length; t++) {
      if (tokens[t].type === 'WORD') words.push(tokens[t].value);
    }

    if (words.length <= 1) {
      var prefix = words[0] || '';
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
      var partial = words[words.length - 1];
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
        var completed = (slashIdx !== -1 ? partial.slice(0, slashIdx + 1) : '') + matches[0];
        if (isDir(node[matches[0]])) completed += '/';
        var idx = inputBuffer.lastIndexOf(partial);
        if (idx !== -1) { inputBuffer = inputBuffer.slice(0, idx) + completed; }
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
