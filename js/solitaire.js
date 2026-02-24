// ===== Klondike Solitaire (canvas, 101x132) =====

(function () {
  var canvas = document.getElementById('solitaire-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Constants
  var W = 101, H = 132;
  var CW = 13, CH = 18; // card size
  var GAP = 1;
  var COL_SPACE = 14; // CW + GAP
  var PAD = 2;
  var FACE_DOWN_OVERLAP = 3;
  var FACE_UP_OVERLAP = 5;

  // Positions
  var STOCK_X = PAD, STOCK_Y = PAD;
  var WASTE_X = PAD + COL_SPACE, WASTE_Y = PAD;
  var FOUND_X = PAD + COL_SPACE * 3; // foundations start at x=44
  var FOUND_Y = PAD;
  var TAB_Y = 24;

  // Suits & Colors
  var SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  var SUIT_COLOR = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
  var RANK_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  // 3x3 suit bitmaps
  var SUIT_BITMAPS = {
    hearts:   [0x5, 0x7, 0x2],   // .#. / ### / .#.  -> 101/111/010
    diamonds: [0x2, 0x7, 0x2],   // .#. / ### / .#.
    clubs:    [0x2, 0x7, 0x5],   // .#. / ### / #.#
    spades:   [0x2, 0x7, 0x6]    // .#. / ### / ##.
  };

  // 3x5 pixel font (same as Tetris)
  var FONT = {
    '0': [0xe,0xa,0xa,0xa,0xe], '1': [0x4,0xc,0x4,0x4,0xe],
    '2': [0xe,0x2,0xe,0x8,0xe], '3': [0xe,0x2,0x6,0x2,0xe],
    '4': [0xa,0xa,0xe,0x2,0x2], '5': [0xe,0x8,0xe,0x2,0xe],
    '6': [0xe,0x8,0xe,0xa,0xe], '7': [0xe,0x2,0x2,0x2,0x2],
    '8': [0xe,0xa,0xe,0xa,0xe], '9': [0xe,0xa,0xe,0x2,0xe],
    'A': [0x4,0xa,0xe,0xa,0xa], 'J': [0x2,0x2,0x2,0xa,0x4],
    'Q': [0x4,0xa,0xa,0xe,0x6], 'K': [0xa,0xa,0xc,0xa,0xa],
    'W': [0xa,0xa,0xe,0xe,0xa], 'I': [0xe,0x4,0x4,0x4,0xe],
    'N': [0xa,0xe,0xe,0xa,0xa], 'Y': [0xa,0xa,0x4,0x4,0x4],
    'O': [0x4,0xa,0xa,0xa,0x4], 'U': [0xa,0xa,0xa,0xa,0xe],
    ' ': [0x0,0x0,0x0,0x0,0x0], '!': [0x4,0x4,0x4,0x0,0x4]
  };

  // Game state
  var stock = [];
  var waste = [];
  var foundations = [[], [], [], []]; // one per suit index
  var tableau = []; // 7 columns, each element: { suit, rank, faceUp }
  var selected = null; // { zone, col, index } or null
  var won = false;
  var lastClickTime = 0;
  var lastClickZone = null;
  var lastClickCol = -1;
  var lastClickIndex = -1;
  var running = false;

  // ----- Deck -----
  function createDeck() {
    var deck = [];
    for (var s = 0; s < 4; s++) {
      for (var r = 0; r < 13; r++) {
        deck.push({ suit: s, rank: r, faceUp: false });
      }
    }
    return deck;
  }

  function shuffle(deck) {
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    return deck;
  }

  // ----- Deal -----
  function deal() {
    var deck = shuffle(createDeck());
    tableau = [];
    for (var c = 0; c < 7; c++) {
      tableau[c] = [];
      for (var r = 0; r <= c; r++) {
        var card = deck.pop();
        card.faceUp = (r === c);
        tableau[c].push(card);
      }
    }
    stock = deck.reverse(); // remaining 24 cards
    waste = [];
    foundations = [[], [], [], []];
    selected = null;
    won = false;
  }

  // ----- Card Y position in tableau -----
  function getCardY(col, index) {
    var y = TAB_Y;
    for (var i = 0; i < index; i++) {
      y += tableau[col][i].faceUp ? FACE_UP_OVERLAP : FACE_DOWN_OVERLAP;
    }
    return y;
  }

  function getTabColX(col) {
    return PAD + col * COL_SPACE;
  }

  // ----- Drawing -----
  function drawTinyText(x, y, str, color) {
    ctx.fillStyle = color;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i).toUpperCase();
      var glyph = FONT[ch];
      if (!glyph) continue;
      for (var row = 0; row < 5; row++) {
        for (var bit = 0; bit < 4; bit++) {
          if (glyph[row] & (1 << (3 - bit))) {
            ctx.fillRect(x + i * 4 + bit, y + row, 1, 1);
          }
        }
      }
    }
  }

  function drawSuit(x, y, suitIndex, color) {
    var bmp = SUIT_BITMAPS[SUITS[suitIndex]];
    ctx.fillStyle = color;
    for (var row = 0; row < 3; row++) {
      for (var bit = 0; bit < 3; bit++) {
        if (bmp[row] & (1 << (2 - bit))) {
          ctx.fillRect(x + bit, y + row, 1, 1);
        }
      }
    }
  }

  function drawCardBack(x, y) {
    // Dark green card back
    ctx.fillStyle = '#1a5c28';
    ctx.fillRect(x, y, CW, CH);
    // Border
    ctx.fillStyle = '#0e3a18';
    ctx.fillRect(x, y, CW, 1);
    ctx.fillRect(x, y + CH - 1, CW, 1);
    ctx.fillRect(x, y, 1, CH);
    ctx.fillRect(x + CW - 1, y, 1, CH);
    // Crosshatch dots
    ctx.fillStyle = '#267a38';
    for (var dy = 2; dy < CH - 2; dy += 2) {
      for (var dx = 2; dx < CW - 2; dx += 2) {
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }

  function drawCardFace(x, y, card, isSelected) {
    // Cream background
    ctx.fillStyle = '#f0f0e8';
    ctx.fillRect(x, y, CW, CH);
    // Border
    ctx.fillStyle = isSelected ? '#00e0e0' : '#a0a0a0';
    ctx.fillRect(x, y, CW, 1);
    ctx.fillRect(x, y + CH - 1, CW, 1);
    ctx.fillRect(x, y, 1, CH);
    ctx.fillRect(x + CW - 1, y, 1, CH);

    var suitColor = SUIT_COLOR[SUITS[card.suit]] === 'red' ? '#c03030' : '#202020';

    // Rank text top-left
    var rankStr = RANK_NAMES[card.rank];
    if (rankStr === '10') {
      drawTinyText(x + 2, y + 2, '10', suitColor);
    } else {
      drawTinyText(x + 2, y + 2, rankStr, suitColor);
    }

    // Suit icon centered
    drawSuit(x + 5, y + 9, card.suit, suitColor);
  }

  function drawEmptySlot(x, y) {
    // Dashed outline
    ctx.fillStyle = '#2a8040';
    // Top & bottom dashes
    for (var dx = 1; dx < CW - 1; dx += 2) {
      ctx.fillRect(x + dx, y, 1, 1);
      ctx.fillRect(x + dx, y + CH - 1, 1, 1);
    }
    // Left & right dashes
    for (var dy = 1; dy < CH - 1; dy += 2) {
      ctx.fillRect(x, y + dy, 1, 1);
      ctx.fillRect(x + CW - 1, y + dy, 1, 1);
    }
  }

  function drawStock() {
    if (stock.length > 0) {
      drawCardBack(STOCK_X, STOCK_Y);
    } else {
      // Recycle icon: circle with arrow
      drawEmptySlot(STOCK_X, STOCK_Y);
      ctx.fillStyle = '#2a8040';
      // Simple circular arrow indicator
      ctx.fillRect(STOCK_X + 5, STOCK_Y + 6, 3, 1);
      ctx.fillRect(STOCK_X + 5, STOCK_Y + 10, 3, 1);
      ctx.fillRect(STOCK_X + 4, STOCK_Y + 7, 1, 2);
      ctx.fillRect(STOCK_X + 8, STOCK_Y + 9, 1, 2);
      // Arrow tips
      ctx.fillRect(STOCK_X + 8, STOCK_Y + 6, 1, 1);
      ctx.fillRect(STOCK_X + 4, STOCK_Y + 11, 1, 1);
    }
  }

  function drawWaste() {
    if (waste.length > 0) {
      var card = waste[waste.length - 1];
      var isSel = selected && selected.zone === 'waste';
      drawCardFace(WASTE_X, WASTE_Y, card, isSel);
    } else {
      drawEmptySlot(WASTE_X, WASTE_Y);
    }
  }

  function drawFoundations() {
    for (var i = 0; i < 4; i++) {
      var x = FOUND_X + i * COL_SPACE;
      var pile = foundations[i];
      if (pile.length > 0) {
        var card = pile[pile.length - 1];
        var isSel = selected && selected.zone === 'foundation' && selected.col === i;
        drawCardFace(x, FOUND_Y, card, isSel);
      } else {
        drawEmptySlot(x, FOUND_Y);
      }
    }
  }

  function drawTableau() {
    for (var c = 0; c < 7; c++) {
      var x = getTabColX(c);
      if (tableau[c].length === 0) {
        drawEmptySlot(x, TAB_Y);
        continue;
      }
      for (var i = 0; i < tableau[c].length; i++) {
        var card = tableau[c][i];
        var cy = getCardY(c, i);
        var isSel = selected && selected.zone === 'tableau' &&
                    selected.col === c && i >= selected.index;
        if (card.faceUp) {
          drawCardFace(x, cy, card, isSel);
        } else {
          drawCardBack(x, cy);
        }
      }
    }
  }

  function drawWinMessage() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 50, W, 32);
    drawTinyText(20, 58, 'YOU WIN!', '#00e0e0');
    drawTinyText(12, 70, 'CLICK TO', '#80ff80');
    drawTinyText(12, 76, 'NEW GAME', '#80ff80');
  }

  function draw() {
    // Background - green felt
    ctx.fillStyle = '#1a6030';
    ctx.fillRect(0, 0, W, H);

    drawStock();
    drawWaste();
    drawFoundations();
    drawTableau();

    if (won) {
      drawWinMessage();
    }
  }

  // ----- Hit testing -----
  function getCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function hitTest(mx, my) {
    // Stock
    if (mx >= STOCK_X && mx < STOCK_X + CW && my >= STOCK_Y && my < STOCK_Y + CH) {
      return { zone: 'stock' };
    }
    // Waste
    if (mx >= WASTE_X && mx < WASTE_X + CW && my >= WASTE_Y && my < WASTE_Y + CH) {
      if (waste.length > 0) return { zone: 'waste' };
      return null;
    }
    // Foundations
    for (var f = 0; f < 4; f++) {
      var fx = FOUND_X + f * COL_SPACE;
      if (mx >= fx && mx < fx + CW && my >= FOUND_Y && my < FOUND_Y + CH) {
        return { zone: 'foundation', col: f };
      }
    }
    // Tableau - check from bottom card up
    for (var c = 0; c < 7; c++) {
      var tx = getTabColX(c);
      if (mx < tx || mx >= tx + CW) continue;
      // Check each card from last to first
      for (var i = tableau[c].length - 1; i >= 0; i--) {
        var cy = getCardY(c, i);
        var cardH = (i === tableau[c].length - 1) ? CH :
                    (tableau[c][i].faceUp ? FACE_UP_OVERLAP : FACE_DOWN_OVERLAP);
        if (my >= cy && my < cy + cardH) {
          return { zone: 'tableau', col: c, index: i };
        }
      }
      // If clicked below all cards but in the column, treat as clicking the last card
      if (tableau[c].length > 0) {
        var lastY = getCardY(c, tableau[c].length - 1);
        if (my >= lastY && my < lastY + CH) {
          return { zone: 'tableau', col: c, index: tableau[c].length - 1 };
        }
      }
      // Empty column
      if (my >= TAB_Y && my < TAB_Y + CH && tableau[c].length === 0) {
        return { zone: 'tableau', col: c, index: 0 };
      }
    }
    return null;
  }

  // ----- Game logic -----
  function canMoveToTableau(card, destCol) {
    var dest = tableau[destCol];
    if (dest.length === 0) {
      return card.rank === 12; // Only King on empty column
    }
    var top = dest[dest.length - 1];
    if (!top.faceUp) return false;
    var topColor = SUIT_COLOR[SUITS[top.suit]];
    var cardColor = SUIT_COLOR[SUITS[card.suit]];
    return topColor !== cardColor && top.rank === card.rank + 1;
  }

  function canMoveToFoundation(card, foundIndex) {
    var pile = foundations[foundIndex];
    if (pile.length === 0) {
      return card.rank === 0; // Ace
    }
    var top = pile[pile.length - 1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  }

  function autoFlipTableau() {
    for (var c = 0; c < 7; c++) {
      if (tableau[c].length > 0) {
        var top = tableau[c][tableau[c].length - 1];
        if (!top.faceUp) top.faceUp = true;
      }
    }
  }

  function checkWin() {
    for (var i = 0; i < 4; i++) {
      if (foundations[i].length !== 13) return false;
    }
    return true;
  }

  function tryAutoFoundation(card) {
    // Try to move card to its matching foundation
    var foundIndex = card.suit;
    return canMoveToFoundation(card, foundIndex);
  }

  // ----- Click handler -----
  function handleClick(e) {
    if (!running) return;
    var pos = getCanvasPos(e);
    var hit = hitTest(pos.x, pos.y);

    var now = Date.now();
    var isDoubleClick = false;
    if (hit && now - lastClickTime < 400 &&
        hit.zone === lastClickZone &&
        hit.col === lastClickCol &&
        hit.index === lastClickIndex) {
      isDoubleClick = true;
    }
    lastClickTime = now;
    lastClickZone = hit ? hit.zone : null;
    lastClickCol = hit ? (hit.col !== undefined ? hit.col : -1) : -1;
    lastClickIndex = hit ? (hit.index !== undefined ? hit.index : -1) : -1;

    if (won) {
      deal();
      draw();
      return;
    }

    if (!hit) {
      selected = null;
      draw();
      return;
    }

    // Stock click
    if (hit.zone === 'stock') {
      selected = null;
      if (stock.length > 0) {
        var card = stock.pop();
        card.faceUp = true;
        waste.push(card);
      } else {
        // Recycle waste to stock
        while (waste.length > 0) {
          var c = waste.pop();
          c.faceUp = false;
          stock.push(c);
        }
      }
      draw();
      return;
    }

    // Double-click: auto-send to foundation
    if (isDoubleClick) {
      var dblCard = null;
      var dblSource = null;

      if (hit.zone === 'waste' && waste.length > 0) {
        dblCard = waste[waste.length - 1];
        dblSource = 'waste';
      } else if (hit.zone === 'tableau' && tableau[hit.col].length > 0) {
        var lastIdx = tableau[hit.col].length - 1;
        if (hit.index === lastIdx && tableau[hit.col][lastIdx].faceUp) {
          dblCard = tableau[hit.col][lastIdx];
          dblSource = 'tableau';
        }
      }

      if (dblCard && tryAutoFoundation(dblCard)) {
        var fi = dblCard.suit;
        if (dblSource === 'waste') {
          foundations[fi].push(waste.pop());
        } else {
          foundations[fi].push(tableau[hit.col].pop());
          autoFlipTableau();
        }
        selected = null;
        if (checkWin()) won = true;
        draw();
        return;
      }
    }

    // No selection yet → select
    if (!selected) {
      if (hit.zone === 'waste' && waste.length > 0) {
        selected = { zone: 'waste' };
      } else if (hit.zone === 'tableau' && tableau[hit.col].length > 0) {
        // Can only select face-up cards
        if (tableau[hit.col][hit.index] && tableau[hit.col][hit.index].faceUp) {
          selected = { zone: 'tableau', col: hit.col, index: hit.index };
        }
      } else if (hit.zone === 'foundation' && foundations[hit.col].length > 0) {
        selected = { zone: 'foundation', col: hit.col };
      }
      draw();
      return;
    }

    // Already selected → try to move

    // Same card/zone click → deselect
    if (selected.zone === hit.zone) {
      if (selected.zone === 'waste' && hit.zone === 'waste') {
        selected = null;
        draw();
        return;
      }
      if (selected.zone === 'tableau' && selected.col === hit.col && selected.index === hit.index) {
        selected = null;
        draw();
        return;
      }
      if (selected.zone === 'foundation' && selected.col === hit.col) {
        selected = null;
        draw();
        return;
      }
    }

    // Try to move selected card(s) to clicked destination
    var moved = false;

    if (hit.zone === 'foundation') {
      // Move single card to foundation
      if (selected.zone === 'waste') {
        var wCard = waste[waste.length - 1];
        if (canMoveToFoundation(wCard, hit.col)) {
          foundations[hit.col].push(waste.pop());
          moved = true;
        }
      } else if (selected.zone === 'tableau') {
        // Only top card of tableau column
        var tCol = tableau[selected.col];
        if (selected.index === tCol.length - 1) {
          var tCard = tCol[tCol.length - 1];
          if (canMoveToFoundation(tCard, hit.col)) {
            foundations[hit.col].push(tCol.pop());
            autoFlipTableau();
            moved = true;
          }
        }
      } else if (selected.zone === 'foundation') {
        // Move from one foundation to another (unlikely but handle)
        var fCard = foundations[selected.col][foundations[selected.col].length - 1];
        if (canMoveToFoundation(fCard, hit.col)) {
          foundations[hit.col].push(foundations[selected.col].pop());
          moved = true;
        }
      }
    } else if (hit.zone === 'tableau') {
      if (selected.zone === 'waste') {
        var wc = waste[waste.length - 1];
        if (canMoveToTableau(wc, hit.col)) {
          tableau[hit.col].push(waste.pop());
          moved = true;
        }
      } else if (selected.zone === 'tableau') {
        var srcCard = tableau[selected.col][selected.index];
        if (canMoveToTableau(srcCard, hit.col)) {
          // Move stack
          var moving = tableau[selected.col].splice(selected.index);
          for (var m = 0; m < moving.length; m++) {
            tableau[hit.col].push(moving[m]);
          }
          autoFlipTableau();
          moved = true;
        }
      } else if (selected.zone === 'foundation') {
        var fc = foundations[selected.col];
        if (fc.length > 0) {
          var fcard = fc[fc.length - 1];
          if (canMoveToTableau(fcard, hit.col)) {
            tableau[hit.col].push(fc.pop());
            moved = true;
          }
        }
      }
    }

    selected = null;
    if (moved && checkWin()) won = true;
    draw();
  }

  // ----- Window observer -----
  function startGame() {
    if (running) return;
    running = true;
    deal();
    draw();
  }

  function stopGame() {
    running = false;
  }

  // Observe window visibility
  var win = document.getElementById('window-solitaire');
  if (win) {
    var observer = new MutationObserver(function () {
      var isClosed = win.classList.contains('closed');
      var isMinimized = win.classList.contains('minimized');
      if (!isClosed && !isMinimized) {
        if (!running) startGame();
      } else {
        // Keep running state so game persists when minimized
        if (isClosed) stopGame();
      }
    });
    observer.observe(win, { attributes: true, attributeFilter: ['class'] });
  }

  canvas.addEventListener('click', handleClick);

  // Initial draw
  deal();
  draw();
})();
