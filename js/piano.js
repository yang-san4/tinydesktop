// ===== Mini Piano (Web Audio API) =====

(function () {
  var container = document.getElementById('piano-keys');
  if (!container) return;

  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  // Note frequencies (C4 to B4 + C5)
  var notes = [
    { key: 'C',  freq: 261.63, black: false },
    { key: 'C#', freq: 277.18, black: true },
    { key: 'D',  freq: 293.66, black: false },
    { key: 'D#', freq: 311.13, black: true },
    { key: 'E',  freq: 329.63, black: false },
    { key: 'F',  freq: 349.23, black: false },
    { key: 'F#', freq: 369.99, black: true },
    { key: 'G',  freq: 392.00, black: false },
    { key: 'G#', freq: 415.30, black: true },
    { key: 'A',  freq: 440.00, black: false },
    { key: 'A#', freq: 466.16, black: true },
    { key: 'B',  freq: 493.88, black: false },
    { key: 'C5', freq: 523.25, black: false }
  ];

  // Keyboard mapping (Z-row for white, S-row for black)
  var keyMap = {
    'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4,
    'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9,
    'j': 10, 'm': 11, ',': 12
  };

  function playNote(freq) {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    // Retro square-ish wave
    osc.type = 'square';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }

  // Build piano keys
  var whiteIndex = 0;
  notes.forEach(function (note, i) {
    var el = document.createElement('div');
    if (note.black) {
      el.className = 'piano-key piano-black';
    } else {
      el.className = 'piano-key piano-white';
      whiteIndex++;
    }
    el.dataset.index = i;
    el.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      playNote(note.freq);
      el.classList.add('pressed');
    });
    el.addEventListener('mouseup', function () {
      el.classList.remove('pressed');
    });
    el.addEventListener('mouseleave', function () {
      el.classList.remove('pressed');
    });
    el.addEventListener('mouseenter', function (e) {
      if (e.buttons === 1) {
        playNote(note.freq);
        el.classList.add('pressed');
      }
    });
    container.appendChild(el);
  });

  // Keyboard input
  var activeKeys = {};

  function isPianoActive() {
    var win = document.getElementById('window-piano');
    if (!win || win.classList.contains('closed') || win.classList.contains('minimized')) return false;
    // Check if terminal has focus
    if (document.activeElement && document.activeElement.id === 'terminal-body') return false;
    return true;
  }

  document.addEventListener('keydown', function (e) {
    if (!isPianoActive()) return;
    var k = e.key.toLowerCase();
    if (keyMap.hasOwnProperty(k) && !activeKeys[k]) {
      activeKeys[k] = true;
      var idx = keyMap[k];
      playNote(notes[idx].freq);
      var keys = container.querySelectorAll('.piano-key');
      if (keys[idx]) keys[idx].classList.add('pressed');
    }
  });

  document.addEventListener('keyup', function (e) {
    var k = e.key.toLowerCase();
    if (keyMap.hasOwnProperty(k)) {
      activeKeys[k] = false;
      var idx = keyMap[k];
      var keys = container.querySelectorAll('.piano-key');
      if (keys[idx]) keys[idx].classList.remove('pressed');
    }
  });

  // ----- Boot chime -----
  window._tinyPlayChime = function () {
    var ctx = getAudioCtx();
    var chimeNotes = [523.25, 659.25, 783.99]; // C5, E5, G5
    chimeNotes.forEach(function (freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.6);
    });
  };

  // ----- Click sound (exposed globally) -----
  window._tinyPlayClick = function () {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  };
})();
