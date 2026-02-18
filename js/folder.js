// ===== Tiny Desktop - Folder System =====

(function () {
  var folders = {};
  var folderId = 0;
  var desktop = document.getElementById('desktop');
  var desktopIcons = document.getElementById('desktop-icons');

  // ----- Create folder -----
  function createFolder(x, y) {
    folderId++;
    var id = 'folder-' + folderId;
    folders[id] = { name: 'Folder', iconTargets: [] };

    var icon = document.createElement('div');
    icon.className = 'desktop-icon desktop-folder';
    icon.dataset.folderId = id;
    icon.style.left = x + 'px';
    icon.style.top = y + 'px';
    icon.innerHTML =
      '<div class="di-img di-folder"></div>' +
      '<div class="di-label">Folder</div>';

    // Double-click opens folder window
    icon.addEventListener('dblclick', function () {
      if (window._tinyDesktopDragged) return;
      openFolder(id);
    });

    // Click to select
    icon.addEventListener('mousedown', function () {
      document.querySelectorAll('.desktop-icon.selected').forEach(function (i) {
        i.classList.remove('selected');
      });
      this.classList.add('selected');
    });

    desktopIcons.appendChild(icon);
    return id;
  }

  // ----- Open folder window -----
  function openFolder(id) {
    var data = folders[id];
    if (!data) return;

    var winId = 'folder-window-' + id;
    var existing = document.getElementById(winId);

    // If already open, bring to front
    if (existing && !existing.classList.contains('closed')) {
      existing.classList.remove('minimized');
      if (window._tinyDesktop) window._tinyDesktop.bringToFront(existing);
      document.dispatchEvent(new Event('tinydesktop-update'));
      return;
    }

    // If was closed, reopen it
    if (existing) {
      existing.classList.remove('closed');
      existing.classList.remove('minimized');
      renderFolderContents(id);
      if (window._tinyDesktop) window._tinyDesktop.bringToFront(existing);
      document.dispatchEvent(new Event('tinydesktop-update'));
      return;
    }

    // Find folder icon position
    var folderIcon = desktopIcons.querySelector('[data-folder-id="' + id + '"]');
    var posX = 100, posY = 60;
    if (folderIcon) {
      posX = parseInt(folderIcon.style.left) + 40 || 100;
      posY = parseInt(folderIcon.style.top) || 60;
      if (posX + 160 > 440) posX = 440 - 170;
      if (posY + 120 > 306) posY = 306 - 130;
    }

    // Create window DOM
    var win = document.createElement('div');
    win.className = 'window';
    win.id = winId;
    win.style.left = posX + 'px';
    win.style.top = posY + 'px';
    win.style.width = '160px';

    win.innerHTML =
      '<div class="title-bar" data-window="' + winId + '">' +
        '<span class="title-bar-text">' + data.name + '</span>' +
        '<div class="title-bar-controls">' +
          '<button class="btn-minimize" data-window="' + winId + '">_</button>' +
          '<button class="btn-close" data-window="' + winId + '">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="window-body folder-body">' +
        '<div class="folder-grid"></div>' +
      '</div>';

    desktop.appendChild(win);

    // Register close button handler
    var closeBtn = win.querySelector('.btn-close');
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      win.classList.remove('minimized');
      win.classList.add('closed');
      document.dispatchEvent(new Event('tinydesktop-update'));
    });

    // Register minimize button handler
    var minBtn = win.querySelector('.btn-minimize');
    minBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      win.classList.add('minimized');
      document.dispatchEvent(new Event('tinydesktop-update'));
    });

    renderFolderContents(id);
    if (window._tinyDesktop) window._tinyDesktop.bringToFront(win);
    document.dispatchEvent(new Event('tinydesktop-update'));
  }

  // ----- Render folder contents -----
  function renderFolderContents(id) {
    var data = folders[id];
    if (!data) return;

    var winId = 'folder-window-' + id;
    var win = document.getElementById(winId);
    if (!win) return;

    var grid = win.querySelector('.folder-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (data.iconTargets.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'folder-empty';
      empty.textContent = 'Empty';
      grid.appendChild(empty);
      return;
    }

    data.iconTargets.forEach(function (targetId) {
      // Find the original desktop icon
      var origIcon = desktopIcons.querySelector('[data-target="' + targetId + '"]');
      if (!origIcon) return;

      var item = document.createElement('div');
      item.className = 'folder-item';
      item.dataset.target = targetId;

      // Clone visual content
      var imgClass = origIcon.querySelector('.di-img').className;
      var label = origIcon.querySelector('.di-label').textContent;
      item.innerHTML =
        '<div class="' + imgClass + '"></div>' +
        '<div class="di-label">' + label + '</div>';

      // Double-click opens the app
      item.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        var target = document.getElementById(targetId);
        if (target) {
          target.classList.remove('minimized');
          target.classList.remove('closed');
          // Center on desktop (440x306) — read size after visible
          requestAnimationFrame(function () {
            var tw = target.offsetWidth || 80;
            var th = target.offsetHeight || 60;
            target.style.left = Math.max(0, Math.floor((440 - tw) / 2)) + 'px';
            target.style.top = Math.max(0, Math.floor((306 - th) / 2)) + 'px';
            target.style.right = 'auto';
          });
          if (window._tinyDesktop) window._tinyDesktop.bringToFront(target);
          document.dispatchEvent(new Event('tinydesktop-update'));
        }
      });

      // Drag out of folder to restore to desktop
      item.addEventListener('mousedown', function (e) {
        e.stopPropagation();
        var startX = e.clientX;
        var startY = e.clientY;
        var dragging = false;
        var ghost = null;
        var thisTarget = targetId;
        var thisFolderId = id;

        function onMove(ev) {
          if (!dragging && (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3)) {
            dragging = true;
            // Create ghost element for visual feedback
            ghost = document.createElement('div');
            ghost.className = 'desktop-icon folder-drag-ghost';
            ghost.innerHTML = item.innerHTML;
            ghost.style.position = 'absolute';
            ghost.style.pointerEvents = 'none';
            ghost.style.opacity = '0.7';
            ghost.style.zIndex = '10000';
            desktop.appendChild(ghost);
          }
          if (dragging && ghost) {
            var desktopRect = desktop.getBoundingClientRect();
            ghost.style.left = (ev.clientX - desktopRect.left - 18) + 'px';
            ghost.style.top = (ev.clientY - desktopRect.top - 18) + 'px';
          }
        }

        function onUp(ev) {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (ghost) {
            ghost.remove();
          }
          if (dragging) {
            var desktopRect = desktop.getBoundingClientRect();
            var dropX = ev.clientX - desktopRect.left - 18;
            var dropY = ev.clientY - desktopRect.top - 18;

            // Check if dropped outside the folder window
            var folderWin = document.getElementById('folder-window-' + thisFolderId);
            if (folderWin) {
              var winRect = folderWin.getBoundingClientRect();
              if (ev.clientX < winRect.left || ev.clientX > winRect.right ||
                  ev.clientY < winRect.top || ev.clientY > winRect.bottom) {
                removeFromFolder(thisFolderId, thisTarget, dropX, dropY);
              }
            }
          }
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      grid.appendChild(item);
    });
  }

  // ----- Add icon to folder -----
  function addToFolder(folderId, iconEl) {
    var data = folders[folderId];
    if (!data) return;

    var targetId = iconEl.dataset.target;
    if (!targetId) return;

    // Don't add folders to folders
    if (iconEl.classList.contains('desktop-folder')) return;

    // Don't add duplicates
    if (data.iconTargets.indexOf(targetId) !== -1) return;

    data.iconTargets.push(targetId);
    iconEl.classList.add('in-folder');
    iconEl.dataset.inFolder = folderId;

    // Re-render if folder window is open
    renderFolderContents(folderId);
  }

  // ----- Remove icon from folder -----
  function removeFromFolder(folderId, targetId, dropX, dropY) {
    var data = folders[folderId];
    if (!data) return;

    var idx = data.iconTargets.indexOf(targetId);
    if (idx === -1) return;

    data.iconTargets.splice(idx, 1);

    // Restore icon on desktop
    var origIcon = desktopIcons.querySelector('[data-target="' + targetId + '"]');
    if (origIcon) {
      origIcon.classList.remove('in-folder');
      delete origIcon.dataset.inFolder;
      // Place at drop position, clamped to desktop bounds
      var x = Math.max(0, Math.min(dropX, 404));
      var y = Math.max(0, Math.min(dropY, 270));
      origIcon.style.left = x + 'px';
      origIcon.style.top = y + 'px';
      origIcon.style.right = 'auto';
    }

    renderFolderContents(folderId);
  }

  // ----- Delete folder -----
  function deleteFolder(folderId) {
    var data = folders[folderId];
    if (!data) return;

    // Restore all icons to desktop
    data.iconTargets.slice().forEach(function (targetId) {
      var origIcon = desktopIcons.querySelector('[data-target="' + targetId + '"]');
      if (origIcon) {
        origIcon.classList.remove('in-folder');
        delete origIcon.dataset.inFolder;
      }
    });

    // Remove folder window if exists
    var winId = 'folder-window-' + folderId;
    var win = document.getElementById(winId);
    if (win) win.remove();

    // Remove folder icon
    var icon = desktopIcons.querySelector('[data-folder-id="' + folderId + '"]');
    if (icon) icon.remove();

    delete folders[folderId];
    document.dispatchEvent(new Event('tinydesktop-update'));
  }

  // ----- Find folder ID from an open folder window element -----
  function folderIdFromWindow(winEl) {
    if (!winEl) return null;
    var m = winEl.id.match(/^folder-window-(.+)$/);
    return m ? m[1] : null;
  }

  // ----- Public API -----
  window._tinyFolder = {
    createFolder: createFolder,
    openFolder: openFolder,
    addToFolder: addToFolder,
    removeFromFolder: removeFromFolder,
    deleteFolder: deleteFolder,
    getFolders: function () { return folders; },
    folderIdFromWindow: folderIdFromWindow
  };

  // ----- Create a default folder on startup -----
  createFolder(42, 118);
})();
