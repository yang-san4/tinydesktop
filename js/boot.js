// ===== Tiny Desktop - Boot Animation =====

(function () {
  var screen = document.getElementById('screen');
  var bootEl = document.getElementById('boot-screen');
  if (!bootEl) return;

  // Hide desktop & taskbar during boot
  var desktop = document.getElementById('desktop');
  var taskbar = document.getElementById('taskbar');
  var startMenu = document.getElementById('start-menu');
  desktop.style.visibility = 'hidden';
  taskbar.style.visibility = 'hidden';
  startMenu.style.visibility = 'hidden';

  var lines = [
    { text: 'TinyBIOS v1.0 (C) 2026 TinyOS Corp.', delay: 300 },
    { text: '', delay: 100 },
    { text: 'CPU: TinyChip 8-bit @ 4.77 MHz ........ OK', delay: 400 },
    { text: 'RAM: Testing 640 KB', delay: 200, typing: true },
    { text: ' ..................... 640 KB OK', delay: 600 },
    { text: 'FPU: Not detected', delay: 200 },
    { text: '', delay: 100 },
    { text: 'Detecting devices:', delay: 300 },
    { text: '  Display .... CRT 440x330 (4-bit color)', delay: 250 },
    { text: '  Keyboard ... PS/2 detected', delay: 200 },
    { text: '  Mouse ...... Serial 2-button', delay: 200 },
    { text: '  Sound ...... PC Speaker (beep)', delay: 200 },
    { text: '  Storage .... Floppy 1.44 MB', delay: 250 },
    { text: '', delay: 100 },
    { text: 'Loading TinyOS...', delay: 400 },
    { text: '', delay: 100 },
    { text: 'PROGRESS', delay: 0, isProgress: true },
    { text: '', delay: 200 },
    { text: 'Starting desktop...', delay: 500 }
  ];

  var outputEl = bootEl.querySelector('.boot-output');
  var lineIndex = 0;

  function addLine(text) {
    var span = document.createElement('div');
    span.textContent = text;
    outputEl.appendChild(span);
    bootEl.scrollTop = bootEl.scrollHeight;
  }

  function renderProgress(callback) {
    var bar = document.createElement('div');
    bar.className = 'boot-progress';
    var fill = document.createElement('div');
    fill.className = 'boot-progress-fill';
    bar.appendChild(fill);
    outputEl.appendChild(bar);

    var pct = 0;
    var interval = setInterval(function () {
      pct += Math.random() * 15 + 5;
      if (pct >= 100) {
        pct = 100;
        fill.style.width = '100%';
        clearInterval(interval);
        setTimeout(callback, 200);
      } else {
        fill.style.width = pct + '%';
      }
    }, 80);
  }

  function processLine() {
    if (lineIndex >= lines.length) {
      finishBoot();
      return;
    }

    var line = lines[lineIndex];
    lineIndex++;

    if (line.isProgress) {
      renderProgress(function () {
        processLine();
      });
      return;
    }

    addLine(line.text);

    setTimeout(processLine, line.delay);
  }

  function finishBoot() {
    setTimeout(function () {
      // Play boot chime
      if (window._tinyPlayChime) {
        try { window._tinyPlayChime(); } catch (e) {}
      }
      bootEl.classList.add('boot-fade');
      desktop.style.visibility = '';
      taskbar.style.visibility = '';
      startMenu.style.visibility = '';
      // Show welcome notification
      if (window._tinyNotifyBoot) window._tinyNotifyBoot();
      setTimeout(function () {
        bootEl.style.display = 'none';
      }, 600);
    }, 200);
  }

  // Start boot sequence after a brief delay
  setTimeout(processLine, 400);
})();
