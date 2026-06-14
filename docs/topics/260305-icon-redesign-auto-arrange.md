# デスクトップアイコン再設計 + 自動配置 + Game フォルダ

**日付**: 2026-03-05

## 変更概要

デスクトップアイコンの色をテーマ対応に変更し、位置をハードコードから自動グリッド配置へ移行。
ゲーム7本を起動時に Game フォルダへ自動格納するようにし、デスクトップの見通しを改善。

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `css/style.css` | アイコン6種 + タスクバーアイコンのハードコード色を CSS 変数化、テーマ固有オーバーライド4箇所削除 |
| `index.html` | 15個の `.desktop-icon` からインライン `style` 削除、コンテキストメニューに「Clean Up」追加 |
| `js/main.js` | `arrangeDesktopIcons()` 関数追加、init 時呼び出し、`window._tinyDesktopArrange` 公開 |
| `js/contextmenu.js` | `data-action="arrange"` ハンドラ追加 |
| `js/folder.js` | `createFolder()` に `name` 引数追加、起動時に Game フォルダ作成 + ゲーム7本格納 |
| `js/fps-classic.js` | ESC PAUSE HUD ヒントの視認性向上（`opacity:.3` → `text-shadow`） |

## 実装詳細

### 1. CSS 変数によるテーマ対応

**Before（ハードコード）:**
```css
.di-aqua {
  background: linear-gradient(180deg, #0a2a5a, #0a4a6a);
}
.di-aqua::after {
  background: #ff9040;
  box-shadow: 5px 3px 0 0 #40e0d0;
}
```

**After（CSS 変数）:**
```css
.di-aqua {
  background: linear-gradient(180deg, var(--surface2), var(--body-deep));
}
.di-aqua::after {
  background: var(--accent2);
  box-shadow: 5px 3px 0 0 var(--accent3);
}
```

変更対象と変数マッピング:

| アイコン | 背景 | ボーダー/装飾 |
|---|---|---|
| `.di-aqua` | `--surface2` / `--body-deep` グラデ | 魚: `--accent2` / `--accent3` |
| `.di-fps` | `--surface2` | `+`: `--accent2` |
| `.di-fpsc` | `--body-deep` | `+`: `--accent3` |
| `.di-tetris` | `--body-deep` | `T`: `--accent3` |
| `.di-solitaire` | `--surface` | カード: `--text-bright` / `--text-dim` |
| `.di-pinball` | `--body-deep` | ボール: `--text-bright`、枠: `--accent2` |

### 2. 自動グリッド配置

```js
function arrangeDesktopIcons() {
  var icons = document.querySelectorAll('#desktop-icons > .desktop-icon:not(.in-folder)');
  var startX = 4, startY = 3, cellW = 40, cellH = 37, maxRows = 8;
  var idx = 0;
  icons.forEach(function (icon) {
    var col = Math.floor(idx / maxRows);
    var row = idx % maxRows;
    icon.style.left = (startX + col * cellW) + 'px';
    icon.style.top = (startY + row * cellH) + 'px';
    idx++;
  });
}
```

**グリッド仕様:**
- 起点: (4, 3) — デスクトップ左上の余白
- セルサイズ: 40x37px — アイコン（36x30）+ 余白
- 最大行数: 8 — デスクトップ高さ 308px に収まる上限
- 配列順: **列優先**（上→下、次の列へ）— macOS / Windows と同じ

**ポイント:**
- `.in-folder` クラスのアイコンはセレクタで除外 → フォルダ内のアイコンはグリッドに含まれない
- ドラッグ後はユーザーが置いた位置に留まる（既存動作そのまま）
- 右クリック「Clean Up」で `arrangeDesktopIcons()` を呼べばグリッドに戻る

### 3. フォルダの初期化パターン

```js
// folder.js — createFolder に name 引数追加
function createFolder(x, y, name) {
  var folderName = name || 'Folder';
  folders[id] = { name: folderName, iconTargets: [] };
  // ...
  icon.innerHTML =
    '<div class="di-img di-folder"></div>' +
    '<div class="di-label">' + folderName + '</div>';
}

// 起動時に Game フォルダ作成
var gameTargets = [
  'window-fps', 'window-fpsc', 'window-tetris',
  'window-solitaire', 'window-pinball', 'window-minesweeper', 'window-maze'
];
var gameFolderId = createFolder(0, 0, 'Game');
gameTargets.forEach(function (targetId) {
  var iconEl = desktopIcons.querySelector('[data-target="' + targetId + '"]');
  if (iconEl) addToFolder(gameFolderId, iconEl);
});
```

**初期位置 `(0, 0)` にする理由:**
- `folder.js` は `main.js` より先に読み込まれる
- `main.js` の `arrangeDesktopIcons()` が init 時に全アイコン（Game フォルダ含む）を自動配置
- → 初期座標は何でも良い、正しい位置は JS が決める

### 4. テーマオーバーライド削除の判断

以前は Aquarium だけテーマ別に色を上書きしていた:
```css
/* 削除した4箇所 */
#screen.theme-mac .di-aqua { background: linear-gradient(...) }
#screen.theme-mac .tb-aquarium { ... }
#screen.theme-osx .di-aqua { ... }
#screen.theme-osx .tb-aquarium { ... }
```

CSS 変数化により、各テーマの `:root` 変数定義が自動的に全アイコンに反映されるため、個別オーバーライドが不要になった。

## 学習ポイント

### CSS 変数はテーマシステムの「型」になる
- `--surface`, `--accent2` のような意味的な変数名を使えば、アイコンごとに「明るい背景」「アクセント装飾」という**役割**を定義できる
- テーマ切替はルートの変数だけ変えれば全体に波及 → 個別オーバーライドが不要になる
- ピアノの白鍵 `#fff` / 黒鍵 `#000` のように**物理的な色が意味を持つもの**は変数化しない、という線引きも大事

### 自動配置は「表示されているもの」だけを対象にする
- `:not(.in-folder)` セレクタで非表示アイコンを除外
- フォルダに入れたアイコンがグリッドの隙間を作らない
- 後からフォルダから出した場合は「Clean Up」で再配置できる

### 初期位置のハードコードを避ける設計
- HTML にインライン `style` で位置を書くと、アイコン追加/削除のたびに全座標を手動調整する必要がある
- JS で DOM 順に自動計算すれば、HTML の並び順だけで配置が決まる
- 「Clean Up」で元に戻せるなら、ドラッグ自由配置と両立できる

### スクリプト読み込み順序を意識した初期化
- `folder.js`（フォルダ作成・アイコン格納）→ `main.js`（自動配置）の順で実行
- フォルダ作成時の座標は仮値でOK → 後続スクリプトが正しい位置を上書きする
- この「仮値 → 上書き」パターンは、モジュール間の依存を最小限にする実用的なテクニック
