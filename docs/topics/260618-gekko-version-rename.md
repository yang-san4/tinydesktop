# GEKKO 世代名のリネーム（Prototype / v.1 / v.2）
<!-- updated: 2026-06-18 -->

## 状況
3つの GEKKO の表示名を世代順に統一した。旧称が「GEKKO / GEKKO V1 / Classic」とバラバラだったのを、開発順に沿って Prototype → v.1 → v.2 へ揃えた。`index.html` の表示ラベル（デスクトップアイコン・タイトルバー・スタートメニューの計9箇所）を変更済み。内部の DOM id（`fps` / `fpsv1` / `fpsc`）・JS ファイル名・コメントは未変更（表示のみのリネーム）。

| ファイル | 実体（時系列） | 旧表示 | 新表示 |
|---|---|---|---|
| `js/fps-classic.js` | 最古・オリジナル | Classic / GEKKO Classic | GEKKO Prototype |
| `js/fps-v1.js` | 次・Canvas 2D 版 | GEKKO V1 | GEKKO v.1 |
| `js/fps.js` | 最新・WebGL 版（メイン） | GEKKO | GEKKO v.2 |

## 次のステップ
- [ ] 必要なら内部 id / ファイル名 / コメントも世代名に合わせて整理（今回は表示のみ）

## 経緯
### 2026-06-18
#### 表示ラベルを世代順に統一
- 時系列の根拠は各 JS 冒頭コメント: `fps-classic.js`=オリジナル、`fps-v1.js`=「Preserved v1 build (Canvas 2D)」、`fps.js`=「GEKKO v2 — WebGL rewrite」。
- `index.html` の表示テキスト9箇所を置換（デスクトップアイコン3・タイトルバー3・スタートメニュー3）。デスクトップアイコンの最古版だけ旧ラベルが「Classic」（GEKKO 接頭辞なし）だった点に注意。
- **学習ポイント**: 表示名と内部識別子（id/クラス/ファイル名）を切り離して、まず表示だけリネームした。id を変えると CSS セレクタ・JS の `getElementById` まで波及してリスクが上がるため、ユーザーの要望（呼び名の変更）に対しては表示テキストのみで十分。命名の根拠は git ではなくソース冒頭コメントの世代記述から取った。
