// ===== Desktop Right-Click Context Menu =====

(function () {
  var menu = document.getElementById('context-menu');
  if (!menu) return;

  var desktop = document.getElementById('desktop');
  var screen = document.getElementById('screen');

  // Remember right-click position for actions like New Folder
  var ctxClickX = 0;
  var ctxClickY = 0;

  // Show context menu on right-click on desktop
  desktop.addEventListener('contextmenu', function (e) {
    // Only on empty desktop area
    if (e.target.closest('.window') || e.target.closest('.widget') || e.target.closest('.desktop-icon')) {
      return;
    }
    e.preventDefault();

    var desktopRect = desktop.getBoundingClientRect();
    ctxClickX = e.clientX - desktopRect.left;
    ctxClickY = e.clientY - desktopRect.top;

    var x = ctxClickX;
    var y = ctxClickY;

    // Keep menu within bounds
    var mw = 100, mh = 120;
    if (x + mw > 440) x = 440 - mw;
    if (y + mh > 306) y = 306 - mh;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.remove('hidden');
  });

  // Hide on click elsewhere
  document.addEventListener('mousedown', function (e) {
    if (!menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  // Hide on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') menu.classList.add('hidden');
  });

  // ----- Menu actions -----

  // New Folder
  menu.querySelector('[data-action="new-folder"]').addEventListener('click', function () {
    if (window._tinyFolder) {
      window._tinyFolder.createFolder(ctxClickX, ctxClickY);
    }
    menu.classList.add('hidden');
  });

  // Show All
  menu.querySelector('[data-action="show-all"]').addEventListener('click', function () {
    document.querySelectorAll('.window.minimized, .widget.minimized, .window.closed, .widget.closed').forEach(function (el) {
      el.classList.remove('minimized');
      el.classList.remove('closed');
    });
    // Trigger taskbar update via custom event
    document.dispatchEvent(new Event('tinydesktop-update'));
    menu.classList.add('hidden');
  });

  // Hide All
  menu.querySelector('[data-action="hide-all"]').addEventListener('click', function () {
    document.querySelectorAll('.window:not(.closed), .widget:not(.closed)').forEach(function (el) {
      el.classList.add('minimized');
    });
    document.dispatchEvent(new Event('tinydesktop-update'));
    menu.classList.add('hidden');
  });

  // About
  menu.querySelector('[data-action="about"]').addEventListener('click', function () {
    var about = document.getElementById('window-about');
    if (about) {
      about.classList.remove('minimized');
      about.classList.remove('closed');
      document.dispatchEvent(new Event('tinydesktop-update'));
    }
    menu.classList.add('hidden');
  });

  // Theme items in context menu
  menu.querySelectorAll('[data-ctx-theme]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var theme = this.dataset.ctxTheme;
      screen.className = theme ? 'theme-' + theme : '';
      // Sync start menu active indicator
      document.querySelectorAll('.start-menu-item[data-theme]').forEach(function (b) { b.classList.remove('active'); });
      var match = document.querySelector('.start-menu-item[data-theme="' + theme + '"]');
      if (match) match.classList.add('active');
      menu.classList.add('hidden');
    });
  });
})();
