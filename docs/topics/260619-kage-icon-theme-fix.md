# KAGE / KAGE II アイコンのスタイル統一
<!-- updated: 2026-06-19 -->

## 状況
最近追加した KAGE / KAGE II のデスクトップ＆タスクバーアイコンだけ色がハードコードの固定 hex で、テーマ追従せず他アイコンと浮いていた。テーマ変数（`var(--surface2)` 背景＋ `var(--accent)`/`--accent2` 枠・グリフ色）に統一して解決。`css/style.css` の1ファイルのみの変更。ブラウザでの目視確認は未実施。

## 次のステップ
- [ ] ブラウザで `tinydesktop/index.html` を開き、テーマ切替（Vapor/Wafuu/Mokume/Classic/Aqua）で KAGE 系も追従するか・✦グリフが崩れないか確認

## 経緯
### 2026-06-19
#### KAGE 系アイコンの色をテーマ変数化
他ゲームアイコン（fps, fpsc, tetris ...）は全て `var(--surface2)`/`--body-deep` 背景＋ `var(--accent)` 系枠でテーマ追従するのに、KAGE / KAGE II だけ固定 hex（`#141028`/`#d04050`、`#0c0a20`/`#e8d2a0`）でハードコードされていた。これがテーマ切替で変わらず浮く原因。

- `.di-kage` / `.di-kage::after` / `.tb-kage`: 背景 → `var(--surface2)`、枠＆グリフ色 → `var(--accent)`
- `.di-kage2` / `.di-kage2::after` / `.tb-kage2`: 背景 → `var(--surface2)`、枠＆グリフ色 → `var(--accent2)`（fps/fpsv1 と同じく2作品を accent / accent2 で軽く区別）
- ✦グリフの content・font-size・letter-spacing は維持し、色だけ変数化

```css
.di-kage  { background: var(--surface2); border-color: var(--accent);  }
.di-kage2 { background: var(--surface2); border-color: var(--accent2); }
```
**学習ポイント**: デスクトップアイコン（`.di-*`）とタスクバーアイコン（`.tb-*`）は同じ配色を別々のルールで持つので、片方だけ直すと不整合になる。`grep` で固定 hex が残っていないか最後に確認すると取りこぼしを防げる。テーマ追従が前提のUIでは、新規追加時に既存の `var(--accent)` 系パターンへ最初から合わせるのが安全。
