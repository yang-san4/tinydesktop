// ===== Desktop Right-Click Context Menu =====

(function () {
  var menu = document.getElementById('context-menu');
  if (!menu) return;

  var folderMenu = document.getElementById('folder-context-menu');
  var desktop = document.getElementById('desktop');
  var screen = document.getElementById('screen');

  // Remember right-click position for actions like New Folder
  var ctxClickX = 0;
  var ctxClickY = 0;

  // Remember which folder was right-clicked for folder menu actions
  var ctxFolderId = null;

  // Position a menu at the given desktop coords, keeping it within bounds
  function showMenuAt(menuEl, px, py) {
    var x = px;
    var y = py;
    var mw = 100, mh = 120;
    var dw = desktop.offsetWidth;
    var dh = desktop.offsetHeight;
    if (x + mw > dw) x = dw - mw;
    if (y + mh > dh) y = dh - mh;
    menuEl.style.left = x + 'px';
    menuEl.style.top = y + 'px';
    menuEl.classList.remove('hidden');
  }

  // Show context menu on right-click on desktop
  desktop.addEventListener('contextmenu', function (e) {
    var desktopRect = desktop.getBoundingClientRect();
    ctxClickX = e.clientX - desktopRect.left;
    ctxClickY = e.clientY - desktopRect.top;

    // Right-click on a folder icon → folder-specific menu
    var folderEl = e.target.closest('.desktop-folder');
    if (folderEl && folderMenu) {
      e.preventDefault();
      ctxFolderId = folderEl.dataset.folderId;
      menu.classList.add('hidden');
      showMenuAt(folderMenu, ctxClickX, ctxClickY);
      return;
    }

    // Only on empty desktop area for the default menu
    if (e.target.closest('.window') || e.target.closest('.widget') || e.target.closest('.desktop-icon')) {
      return;
    }
    e.preventDefault();

    if (folderMenu) folderMenu.classList.add('hidden');
    showMenuAt(menu, ctxClickX, ctxClickY);
  });

  // Hide on click elsewhere
  document.addEventListener('mousedown', function (e) {
    if (!menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
    if (folderMenu && !folderMenu.contains(e.target)) {
      folderMenu.classList.add('hidden');
    }
  });

  // Hide on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      menu.classList.add('hidden');
      if (folderMenu) folderMenu.classList.add('hidden');
    }
  });

  // ----- Menu actions -----

  // New Folder
  menu.querySelector('[data-action="new-folder"]').addEventListener('click', function () {
    if (window._tinyFolder) {
      window._tinyFolder.createFolder(ctxClickX, ctxClickY);
    }
    menu.classList.add('hidden');
  });

  // Clean Up (arrange icons)
  menu.querySelector('[data-action="arrange"]').addEventListener('click', function () {
    if (window._tinyDesktopArrange) {
      window._tinyDesktopArrange();
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

  // ----- Folder menu actions -----
  if (folderMenu) {
    // Open
    folderMenu.querySelector('[data-faction="open"]').addEventListener('click', function () {
      if (ctxFolderId && window._tinyFolder) window._tinyFolder.openFolder(ctxFolderId);
      folderMenu.classList.add('hidden');
    });

    // Rename
    folderMenu.querySelector('[data-faction="rename"]').addEventListener('click', function () {
      if (ctxFolderId && window._tinyFolder) {
        var current = '';
        var folders = window._tinyFolder.getFolders();
        if (folders[ctxFolderId]) current = folders[ctxFolderId].name;
        var name = window.prompt('Folder name:', current);
        if (name) window._tinyFolder.renameFolder(ctxFolderId, name.trim());
      }
      folderMenu.classList.add('hidden');
    });

    // Clean Up (arrange icons)
    folderMenu.querySelector('[data-faction="arrange"]').addEventListener('click', function () {
      if (window._tinyDesktopArrange) window._tinyDesktopArrange();
      folderMenu.classList.add('hidden');
    });

    // Delete Folder
    folderMenu.querySelector('[data-faction="delete"]').addEventListener('click', function () {
      if (ctxFolderId && window._tinyFolder) window._tinyFolder.deleteFolder(ctxFolderId);
      folderMenu.classList.add('hidden');
    });
  }

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
