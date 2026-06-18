# スタートメニューのはみ出し修正（サブメニュー化）
<!-- updated: 2026-06-19 -->

## 状況
スタートメニューの項目が増えすぎて画面上端を突き抜け、上部の項目が選択できなくなっていた問題を修正。トップレベルのフラットなアプリ一覧（18項目）を `Tools ▸` / `Games ▸` の2サブメニューにまとめ、トップレベルを大幅に短縮した。サブメニューは画面下端基準のメニューに合わせて上方向に開くよう変更。`index.html` と `css/style.css` を変更、JS は変更なし。

## メニュー構成（変更後）
- トップレベル: Apps（ヘッダー）/ Clock / Calendar / Terminal / **Tools ▸** / **Games ▸** / Theme ▸ / ─ / Show All / About PC
- Tools ▸: Aquarium / Piano / TinyWeb / Timer / David
- Games ▸: GEKKO v.2 / v.1 / Prototype / KAGE / KAGE II / Tetris / Solitaire / Pinball / Mines / 3D Maze

## 次のステップ
- [ ] ブラウザで開閉・サブメニュー展開・各アプリ起動・テーマ切替を目視確認（全テーマではみ出さないこと）

## 経緯
### 2026-06-19
#### 原因
- `#start-menu` は `position: absolute; bottom: 25px;`（タスクバー上端基準で上方向に伸びる）配置だが `max-height` も `overflow` も未指定。27要素・約400px超となり、利用可能な約305px（画面上端〜タスクバー上端）を超えて上端からはみ出していた。

#### 対応
- `index.html`: フラットだった18項目を、既存の `Theme ▸` と同じ `.start-menu-sub` / `.start-menu-parent` / `.start-menu-submenu` 構造で `Tools ▸`・`Games ▸` に再編。Clock/Calendar/Terminal はトップレベルに残す。ボタンの `data-open`・`tb-icon` はそのまま移動。
- `css/style.css` `.start-menu-submenu`: `top: -1px` → `bottom: -1px; top: auto`（親の下端基準で上方向展開）。さらに `max-height: 280px; overflow-y: auto` を保険で追加。

  ```css
  .start-menu-submenu {
    left: 100%;
    bottom: -1px;   /* was top: -1px */
    top: auto;
    max-height: 280px;
    overflow-y: auto;
  }
  ```
  **学習ポイント**: 親メニューが画面下端基準（`bottom`）の場合、サブメニューを下方向（`top: -1px`）に開くと画面下＝タスクバー方向へはみ出す。親の伸長方向と逆（=上方向、`bottom` 基準）に開かせるのが定石。既存の `Theme ▸` も同じ規則に乗るため、下方向はみ出しが副次的に解消された。
- JS は変更不要。開閉・起動・テーマ切替は `document.querySelectorAll('.start-menu-item[data-open]')` 等の属性セレクタで全項目に一括付与しており、サブメニュー内にネストしても機能する（構造非依存）。
