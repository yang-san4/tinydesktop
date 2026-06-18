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
    { text: 'TinyBIOS v1.0 (C) 2026 TinyOS Corp.', delay: 150 },
    { text: '', delay: 50 },
    { text: 'CPU: TinyChip 8-bit @ 4.77 MHz ........ OK', delay: 200 },
    { text: 'RAM: Testing 640 KB', delay: 100, typing: true },
    { text: ' ..................... 640 KB OK', delay: 300 },
    { text: 'FPU: Not detected', delay: 100 },
    { text: '', delay: 50 },
    { text: 'Detecting devices:', delay: 150 },
    { text: '  Display .... CRT 440x330 (4-bit color)', delay: 120 },
    { text: '  Keyboard ... PS/2 detected', delay: 100 },
    { text: '  Mouse ...... Serial 2-button', delay: 100 },
    { text: '  Sound ...... PC Speaker (beep)', delay: 100 },
    { text: '  Storage .... Floppy 1.44 MB', delay: 120 },
    { text: '', delay: 50 },
    { text: 'Loading TinyOS...', delay: 200 },
    { text: '', delay: 50 },
    { text: 'PROGRESS', delay: 0, isProgress: true },
    { text: '', delay: 100 },
    { text: 'Starting desktop...', delay: 250 }
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
      pct += Math.random() * 20 + 12;
      if (pct >= 100) {
        pct = 100;
        fill.style.width = '100%';
        clearInterval(interval);
        setTimeout(callback, 120);
      } else {
        fill.style.width = pct + '%';
      }
    }, 50);
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
      }, 400);
    }, 120);
  }

  // Start boot sequence after a brief delay
  setTimeout(processLine, 200);
})();
