// ===== Tiny Desktop - Window Manager =====

(function () {
  let topZ = 10;
  let dragState = null;
  let resizeState = null;

  // Flag to prevent click actions during drag
  window._tinyDesktopDragged = false;

  // ----- Bring to front (works for .window and .widget) -----
  function bringToFront(el) {
    topZ++;
    el.style.zIndex = topZ;
    // Deactivate all title bars
    document.querySelectorAll('.title-bar').forEach(tb => tb.classList.add('inactive'));
    // Activate this element's title bar if it has one
    const tb = el.querySelector('.title-bar');
    if (tb) tb.classList.remove('inactive');
    updateTaskbarItems();
  }

  // ----- Start drag -----
  function startDrag(el, e) {
    bringToFront(el);
    const elRect = el.getBoundingClientRect();
    dragState = {
      el: el,
      offsetX: e.clientX - elRect.left,
      offsetY: e.clientY - elRect.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    };
    e.preventDefault();
  }

  // ----- Check if click is near bottom-right corner of a window -----
  const RESIZE_ZONE = 12;

  function hitResizeZone(win, e) {
    const rect = win.getBoundingClientRect();
    return (rect.right - e.clientX) < RESIZE_ZONE &&
           (rect.bottom - e.clientY) < RESIZE_ZONE;
  }

  // ----- Drag handling -----
  function onMouseDown(e) {
    // Check resize zone on windows (before title-bar check)
    const win = e.target.closest('.window');
    if (win && !e.target.closest('.title-bar-controls') && hitResizeZone(win, e)) {
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      resizeState = {
        el: win,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height
      };
      e.preventDefault();
      return;
    }

    // Title bar drag (windows)
    const titleBar = e.target.closest('.title-bar');
    if (titleBar && !e.target.closest('.title-bar-controls')) {
      const winId = titleBar.dataset.window;
      const win2 = document.getElementById(winId);
      if (win2) startDrag(win2, e);
      return;
    }

    // Desktop icon drag
    const icon = e.target.closest('.desktop-icon');
    if (icon) {
      const iconRect = icon.getBoundingClientRect();
      dragState = {
        el: icon,
        offsetX: e.clientX - iconRect.left,
        offsetY: e.clientY - iconRect.top,
        startX: e.clientX,
        startY: e.clientY,
        moved: false
      };
      e.preventDefault();
      return;
    }

    // Widget drag
    const widget = e.target.closest('.widget');
    if (widget) {
      startDrag(widget, e);
      return;
    }
  }

  function onMouseMove(e) {
    // Resize
    if (resizeState) {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      const newW = Math.max(80, resizeState.startW + dx);
      const newH = Math.max(40, resizeState.startH + dy);
      resizeState.el.style.width = newW + 'px';
      resizeState.el.style.height = newH + 'px';
      document.body.style.cursor = 'nwse-resize';
      e.preventDefault();
      return;
    }

    if (!dragState) return;

    if (Math.abs(e.clientX - dragState.startX) > 2 ||
        Math.abs(e.clientY - dragState.startY) > 2) {
      dragState.moved = true;
    }

    const desktop = document.getElementById('desktop');
    const desktopRect = desktop.getBoundingClientRect();

    let x = e.clientX - desktopRect.left - dragState.offsetX;
    let y = e.clientY - desktopRect.top - dragState.offsetY;

    x = Math.max(0, Math.min(x, desktopRect.width - 30));
    y = Math.max(0, Math.min(y, desktopRect.height - 14));

    dragState.el.style.left = x + 'px';
    dragState.el.style.top = y + 'px';
    // Clear right/bottom positioning if set
    dragState.el.style.right = 'auto';
    dragState.el.style.bottom = 'auto';
  }

  function onMouseUp() {
    if (resizeState) {
      resizeState = null;
      document.body.style.cursor = '';
      return;
    }
    if (dragState) {
      if (dragState.moved) {
        window._tinyDesktopDragged = true;
        setTimeout(function () { window._tinyDesktopDragged = false; }, 0);
      }
      const tb = dragState.el.querySelector('.title-bar');
      if (tb) tb.style.cursor = 'grab';
      dragState.el.style.cursor = '';
      dragState = null;
    }
  }

  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // ----- Click to focus -----
  document.addEventListener('mousedown', function (e) {
    const el = e.target.closest('.window') || e.target.closest('.widget');
    if (el && !el.classList.contains('minimized')) {
      bringToFront(el);
    }
  });

  // ----- Minimize (windows) -----
  document.querySelectorAll('.btn-minimize').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const win = document.getElementById(this.dataset.window);
      if (win) {
        win.classList.add('minimized');
        updateTaskbarItems();
      }
    });
  });

  // ----- Close (windows - removes from taskbar) -----
  document.querySelectorAll('.btn-close').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const win = document.getElementById(this.dataset.window);
      if (win) {
        win.classList.remove('minimized');
        win.classList.add('closed');
        updateTaskbarItems();
      }
    });
  });

  // ----- Close (widgets - hover button) -----
  document.querySelectorAll('.widget-close').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const widget = this.closest('.widget');
      if (widget) {
        widget.classList.remove('minimized');
        widget.classList.add('closed');
        updateTaskbarItems();
      }
    });
  });

  // ----- Taskbar items (windows + widgets) -----
  function updateTaskbarItems() {
    const container = document.getElementById('taskbar-items');
    container.innerHTML = '';

    // Collect all manageable items: .window and .widget
    // Only show open (not closed) items in taskbar
    const items = document.querySelectorAll('.window:not(.closed), .widget:not(.closed)');

    items.forEach(el => {
      // Get title: from .title-bar-text or data-title
      const titleEl = el.querySelector('.title-bar-text');
      const title = titleEl ? titleEl.textContent : (el.dataset.title || '?');

      const btn = document.createElement('button');
      btn.className = 'taskbar-item';
      if (!el.classList.contains('minimized')) {
        btn.classList.add('active');
      }
      const icon = document.createElement('span');
      icon.className = 'tb-icon tb-' + el.id.replace(/^(window|widget)-/, '');
      btn.appendChild(icon);
      btn.appendChild(document.createTextNode(title));
      btn.addEventListener('click', function () {
        if (el.classList.contains('minimized')) {
          el.classList.remove('minimized');
          bringToFront(el);
        } else {
          const isTop = el.style.zIndex == topZ;
          if (isTop) {
            el.classList.add('minimized');
            updateTaskbarItems();
          } else {
            bringToFront(el);
          }
        }
      });
      container.appendChild(btn);
    });
  }

  // ----- Taskbar clock -----
  function updateTaskbarClock() {
    const el = document.getElementById('taskbar-clock');
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    el.textContent = h + ':' + m;
  }

  setInterval(updateTaskbarClock, 1000);
  updateTaskbarClock();

  // ----- Start Menu -----
  const startBtn = document.getElementById('start-button');
  const startMenu = document.getElementById('start-menu');

  startBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = !startMenu.classList.contains('hidden');
    startMenu.classList.toggle('hidden');
    startBtn.classList.toggle('open', !isOpen);
  });

  // Close start menu when clicking elsewhere
  document.addEventListener('mousedown', function (e) {
    if (!startMenu.classList.contains('hidden') &&
        !startMenu.contains(e.target) &&
        e.target !== startBtn) {
      startMenu.classList.add('hidden');
      startBtn.classList.remove('open');
    }
  });

  // App launchers in start menu
  document.querySelectorAll('.start-menu-item[data-open]').forEach(btn => {
    btn.addEventListener('click', function () {
      const target = document.getElementById(this.dataset.open);
      if (target) {
        target.classList.remove('minimized');
        target.classList.remove('closed');
        bringToFront(target);
      }
      startMenu.classList.add('hidden');
      startBtn.classList.remove('open');
    });
  });

  // Theme switching
  document.querySelectorAll('.start-menu-item[data-theme]').forEach(btn => {
    btn.addEventListener('click', function () {
      const theme = this.dataset.theme;
      const screen = document.getElementById('screen');
      // Remove all theme classes
      screen.className = theme ? 'theme-' + theme : '';
      // Update active indicator
      document.querySelectorAll('.start-menu-item[data-theme]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      // Close menu
      startMenu.classList.add('hidden');
      startBtn.classList.remove('open');
    });
  });

  // Show All button
  document.getElementById('show-all-btn').addEventListener('click', function () {
    document.querySelectorAll('.window.minimized, .widget.minimized, .window.closed, .widget.closed').forEach(el => {
      el.classList.remove('minimized');
      el.classList.remove('closed');
    });
    updateTaskbarItems();
    startMenu.classList.add('hidden');
    startBtn.classList.remove('open');
  });

  // ----- Desktop icons -----
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('dblclick', function () {
      if (window._tinyDesktopDragged) return;
      const target = document.getElementById(this.dataset.target);
      if (!target) return;
      target.classList.remove('minimized');
      target.classList.remove('closed');
      bringToFront(target);
    });
    icon.addEventListener('mousedown', function (e) {
      document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
      this.classList.add('selected');
    });
  });

  // Deselect icons when clicking empty desktop area
  document.getElementById('desktop').addEventListener('mousedown', function (e) {
    if (!e.target.closest('.desktop-icon') && !e.target.closest('.window') && !e.target.closest('.widget')) {
      document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
    }
  });

  // ----- About uptime -----
  var bootTime = Date.now();
  setInterval(function () {
    var el = document.getElementById('about-uptime');
    if (!el) return;
    var sec = Math.floor((Date.now() - bootTime) / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    var h = Math.floor(m / 60);
    m = m % 60;
    el.textContent = h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }, 1000);

  // ----- Allow external code to trigger taskbar refresh -----
  document.addEventListener('tinydesktop-update', function () {
    updateTaskbarItems();
  });

  // ----- Init -----
  updateTaskbarItems();
  const firstWin = document.querySelector('.window');
  if (firstWin) bringToFront(firstWin);
})();
