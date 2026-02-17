// ===== Tiny Desktop - Window Manager =====

(function () {
  let topZ = 10;
  let dragState = null;

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

  // ----- Drag handling -----
  function onMouseDown(e) {
    // Title bar drag (windows)
    const titleBar = e.target.closest('.title-bar');
    if (titleBar && !e.target.closest('.title-bar-controls')) {
      const winId = titleBar.dataset.window;
      const win = document.getElementById(winId);
      if (win) startDrag(win, e);
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

  // ----- Close (windows - same as minimize) -----
  document.querySelectorAll('.btn-close').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const win = document.getElementById(this.dataset.window);
      if (win) {
        win.classList.add('minimized');
        updateTaskbarItems();
      }
    });
  });

  // ----- Taskbar items (windows + widgets) -----
  function updateTaskbarItems() {
    const container = document.getElementById('taskbar-items');
    container.innerHTML = '';

    // Collect all manageable items: .window and .widget
    const items = document.querySelectorAll('.window, .widget');

    items.forEach(el => {
      // Get title: from .title-bar-text or data-title
      const titleEl = el.querySelector('.title-bar-text');
      const title = titleEl ? titleEl.textContent : (el.dataset.title || '?');

      const btn = document.createElement('button');
      btn.className = 'taskbar-item';
      if (!el.classList.contains('minimized')) {
        btn.classList.add('active');
      }
      btn.textContent = title;
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
    document.querySelectorAll('.window.minimized, .widget.minimized').forEach(el => {
      el.classList.remove('minimized');
    });
    updateTaskbarItems();
    startMenu.classList.add('hidden');
    startBtn.classList.remove('open');
  });

  // ----- Init -----
  updateTaskbarItems();
  const firstWin = document.querySelector('.window');
  if (firstWin) bringToFront(firstWin);
})();
