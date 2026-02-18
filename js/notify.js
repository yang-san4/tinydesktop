// ===== Notification Popup System =====

(function () {
  var container = document.getElementById('notify-container');
  if (!container) return;

  var queue = [];
  var showing = false;
  var MAX_VISIBLE = 2;
  var visibleCount = 0;

  function show(title, body) {
    if (visibleCount >= MAX_VISIBLE) {
      queue.push({ title: title, body: body });
      return;
    }
    _display(title, body);
  }

  function _display(title, body) {
    visibleCount++;

    var el = document.createElement('div');
    el.className = 'notify-toast';

    var hdr = document.createElement('div');
    hdr.className = 'notify-title';
    hdr.textContent = title;

    var msg = document.createElement('div');
    msg.className = 'notify-body';
    msg.textContent = body;

    var closeBtn = document.createElement('button');
    closeBtn.className = 'notify-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', function () { dismiss(el); });

    el.appendChild(closeBtn);
    el.appendChild(hdr);
    el.appendChild(msg);
    container.appendChild(el);

    // Trigger animation
    requestAnimationFrame(function () {
      el.classList.add('notify-show');
    });

    // Auto-dismiss after 4s
    var timer = setTimeout(function () { dismiss(el); }, 4000);
    el._timer = timer;
  }

  function dismiss(el) {
    if (el._dismissed) return;
    el._dismissed = true;
    clearTimeout(el._timer);
    el.classList.remove('notify-show');
    el.classList.add('notify-hide');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      visibleCount--;
      // Show queued
      if (queue.length > 0) {
        var next = queue.shift();
        _display(next.title, next.body);
      }
    }, 300);
  }

  // Expose globally
  window._tinyNotify = show;

  // ----- Scheduled notifications -----
  var tips = [
    ['Tip', 'Right-click desktop for options'],
    ['Tip', 'Double-click icons to open apps'],
    ['Tip', 'Drag windows by their title bar'],
    ['Fun Fact', 'The first GUI was Xerox Alto (1973)'],
    ['Fun Fact', '640 KB ought to be enough'],
    ['Fun Fact', 'There are 8 apps installed'],
    ['Tip', 'Try the Piano! Keys: Z-M'],
    ['Tip', 'Resize windows from the corner'],
    ['Tip', 'Check out the 3D Maze game!']
  ];

  var tipIndex = 0;
  var tipShown = {};

  function showRandomTip() {
    // Pick a random tip that hasn't been shown yet
    var available = [];
    for (var i = 0; i < tips.length; i++) {
      if (!tipShown[i]) available.push(i);
    }
    if (available.length === 0) {
      // Reset
      tipShown = {};
      available = [];
      for (var j = 0; j < tips.length; j++) available.push(j);
    }
    var idx = available[Math.floor(Math.random() * available.length)];
    tipShown[idx] = true;
    show(tips[idx][0], tips[idx][1]);
  }

  // Show tips periodically (every 45s after first 20s)
  setTimeout(function () {
    showRandomTip();
    setInterval(showRandomTip, 45000);
  }, 20000);

  // Boot welcome (called from boot.js)
  window._tinyNotifyBoot = function () {
    setTimeout(function () {
      show('Welcome', 'Welcome to TinyOS!');
    }, 800);
  };
})();
