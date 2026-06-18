# フォルダー右クリックメニューの追加
<!-- updated: 2026-06-18 -->

## 状況
デスクトップのフォルダーアイコン（`.desktop-folder`）を右クリックした時に、専用のコンテキストメニュー（Open / Rename / Clean Up / Delete Folder）が出るようにした。実装完了。ブラウザでの手動動作確認は未実施。

## 次のステップ
- [ ] ブラウザで `tinydesktop/index.html` を開いて動作確認（Game フォルダー右クリック → 各項目の挙動・リグレッション確認）

## 経緯
### 2026-06-18
#### フォルダー右クリックメニューを実装
これまで空きデスクトップ右クリックの `#context-menu` のみで、フォルダー上の右クリックは `contextmenu.js` の早期 return で無視されていた。フォルダー専用メニューを追加した。

変更ファイル:
- `index.html`: `#context-menu` の直後に `#folder-context-menu`（`data-faction` ボタン: open / rename / arrange / delete）を追加。スタイルは既存 `.ctx-item` / `.ctx-sep` を流用。
- `css/style.css`: `#context-menu` の position/`.hidden` ルールを `#folder-context-menu` にも適用（セレクタ拡張）。
- `js/folder.js`: `renameFolder(id, newName)` を新規追加し `window._tinyFolder` に公開。アイコンラベルと開いているウィンドウのタイトルを同期更新。
- `js/contextmenu.js`: `contextmenu` リスナーで `e.target.closest('.desktop-folder')` を先に判定し、該当時はフォルダーIDを保持して `#folder-context-menu` を表示。座標計算は `showMenuAt()` に共通化。`mousedown`/Escape のクローズ処理も両メニュー対象に拡張。各 `data-faction` ボタンに open/rename/arrange/delete ハンドラを登録（既存 `openFolder` / `deleteFolder` / `_tinyDesktopArrange` を再利用）。

```javascript
// contextmenu.js — フォルダー判定を先に行い分岐
var folderEl = e.target.closest('.desktop-folder');
if (folderEl && folderMenu) {
  e.preventDefault();
  ctxFolderId = folderEl.dataset.folderId;
  menu.classList.add('hidden');
  showMenuAt(folderMenu, ctxClickX, ctxClickY);
  return;
}
```
**学習ポイント**: 既存の単一メニュー前提のコードに2つ目のメニューを足すとき、表示座標ロジック（はみ出し補正）を `showMenuAt()` に切り出して両方で共用すると重複が出ない。クローズ判定（外側クリック・Escape）は「全メニューを対象に」拡張するのを忘れやすい。フォルダー判定は `.desktop-icon` の汎用除外より前に置くことで、フォルダーだけ専用メニュー・他アイコンは従来どおり無反応、という分岐を自然に表現できた。

### 2026-06-19
#### 起動時の Game フォルダー自動生成を無効化
これまで `folder.js` 末尾で起動時に「Game」フォルダーを作り、ゲーム7本（fps/fpsc/tetris/solitaire/pinball/minesweeper/maze）を自動収納していた。デフォルトではフォルダーに入れずデスクトップに直接並べたい、という要望でこの初期化ブロックをコメントアウト（削除ではなく、復活できるよう残す）。`createFolder`/`addToFolder` 等の機能自体は維持しているので、右クリック→New Folder で手動作成は引き続き可能。

**学習ポイント**: 「一回（とりあえず）やめたい」要望は丸ごと削除より、初期化呼び出しだけコメントアウトして意図と復活手順をコメントに残すと戻しやすい。機能の定義（関数）と起動時の使用（初期化）を分けておくと、こういう ON/OFF が局所的な変更で済む。
