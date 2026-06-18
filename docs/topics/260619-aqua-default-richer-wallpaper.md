# Aquaテーマをデフォルト化＋Aqua壁紙のリッチ化
<!-- updated: 2026-06-19 -->

## 状況
起動時のデフォルトテーマを Classic(theme-mac) から Aqua(theme-osx) に変更。あわせて Aqua の壁紙（`js/wallpaper.js` の `drawOSX`）を、従来の「夜空＋星＋オーロラ2層＋中央グロー」から **Big Sur 風（夜空のオーロラ多層＋層状の山影＋手前の湖面に反射）** へ作り直した。

## 次のステップ
- [ ] ブラウザで初回ロード時に Aqua になっていること・壁紙の見た目を目視確認
- [ ] 反射やオーロラの濃さ・色味は好みで微調整可（`bands` 配列の alpha/col、ripple 数など）

## 経緯
### 2026-06-19
#### デフォルトを Aqua に
- `index.html` 行15: `#screen` の class を `theme-mac` → `theme-osx`。
- スタートメニュー Theme サブメニュー: `active` を Classic から Aqua のボタンへ移動。
- JS は変更不要。テーマの初期値は HTML の class と active だけで決まり（`main.js`/`contextmenu.js` に永続化・デフォルト定義なし）、`contextmenu.js` はクリック時に active を同期するのみ。

#### Aqua 壁紙の作り直し（`drawOSX`、110x77）
構図を上から: 夜空グラデ → 星（明暗ばらつき＋きらめき）→ 流れ星 → オーロラ3層 → 山影3層 → 湖面グラデ → 反射（山・オーロラ・星）→ ripple。

  ```js
  // オーロラは sky/water 兼用の1関数に。reflect=true で水平線を挟んで上下反転描画
  function auroraPass(reflect) {
    for (各バンド) for (x=0..W) {
      var iy = Math.round(cy + dy);
      if (!reflect) { /* sky に描画 */ }
      else {
        var ry = 2 * horizon - iy;        // 水平線で鏡像
        if (ry>horizon && ry<H && ((ry+x)%3)!==0)  // ripple で間引き
          /* water に alpha*0.38 で描画 */
      }
    }
  }
  auroraPass(false); /* ... 山・水面を描いた後 ... */ auroraPass(true);
  ```
  **学習ポイント**:
  - 反射は「水平線 `horizon` を軸に `ry = 2*horizon - iy` で鏡像」。これでオーロラ・星・山を同じ式で水面へ落とせる。物理的に「水平線近く（＝空の低い位置）の対象だけが画面内に反射する」挙動になり自然。
  - 描画順（奥→手前）が重要。空グラデ→星→オーロラ→山（手前で下のオーロラを隠す）→水面グラデ→反射→ripple。反射は水面を塗った**後**に描かないと上書きで消える。最初に反射を空オーロラ描画と同時に出そうとすると水面塗りで消える罠がある。
  - 既存ヘルパ（`px`/`hline`/`fillCircle`/`srand`/`rand`）と `drawJapanese` の山シルエット・月反射手法をそのまま流用。新規の汎用処理は増やさず構図だけ差し替えた。
  - テーマ切替時の再描画は末尾の MutationObserver（`#screen` の class 変化監視）が担うので、関数中身の差し替えだけで OK。
- `js/wallpaper.js` 冒頭コメント見出しも「Aurora over mountains + lake reflection」に更新。
- 構文確認: ローカルに node/deno 等の JS ランタイムが無く `--check` 不可。目視でブレース・ロジックを確認（要ブラウザ実機確認）。
