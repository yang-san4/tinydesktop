# TinyTube に GEKKO FPS 攻略動画を追加

**日付**: 2026-02-25
**対象**: `js/browser.js`

## 概要

TinyWeb ブラウザ内のミニ YouTube（TinyTube、`tiny://videos`）に GEKKO ゲームの FPS 攻略動画を 9 本目として追加。

## 変更内容（4 箇所）

### 1. アニメーション関数 `animGekko`（L1496〜L1640）

80×50 Canvas に FPS ゲームプレイを描画するアニメーション。

```js
function animGekko(ctx, w, h, frame) {
  // Dark background (#050510)
  // Cyber grid ground (perspective grid lines)
  // Enemy spawning (magenta #ff0060 polygonal enemies)
  // Crosshair (cyan #00e5ff + magenta center dot)
  // Muzzle flash (every ~40 frames)
  // Weapon silhouette (bottom center)
  // HUD: Health bar, Ammo, Wave indicator, Score
  // Damage flash
}
```

**描画要素**:
- **背景**: ダーク空 + シアンのパースグリッド地面
- **敵**: マゼンタの多角形キャラが wave ごとに複数出現、一定間隔で爆発
- **クロスヘア**: 画面中央にシアンの十字照準 + マゼンタ中心ドット
- **射撃**: 40 フレームごとにマズルフラッシュ
- **HUD**: 体力バー（左下）、弾薬（右下）、WAVE 表示（右上）、スコア（左上）
- **ダメージフラッシュ**: 200 フレームに 1 回赤いオーバーレイ

### 2. サムネイル（L1744〜L1751）

```js
var thumbGekko = [
  'DCDCD',  // D=dark(#050510), C=cyan(#00e5ff), M=magenta(#ff0060)
  'DDCDD',
  'CCMCC',  // 中央にマゼンタ（クロスヘア中心）
  'DDCDD',
  'DCDCD'
];
var palThGekko = { D: '#050510', C: '#00e5ff', M: '#ff0060' };
```

### 3. videoList / thumbArts / thumbPals に追加

```js
{ id: 'gekko', title: 'GEKKO Advanced Tactics', ch: 'ArenaGamer', views: '2.1K', anim: animGekko }
```

### 4. searchDb に追加（L1816）

```js
{ title: 'GEKKO Advanced Tactics', url: 'tiny://videos', desc: 'FPS walkthrough: weapon strategy and wave tactics' }
```

## 学習ポイント

### TinyTube 動画追加パターン

新しい動画を追加するには以下の 4 箇所を変更する:

1. **`animXxx(ctx, w, h, frame)` 関数** — 80×50 Canvas アニメーション
2. **`thumbXxx` + `palThXxx`** — 5×5 ピクセルアートサムネイル + パレット
3. **`videoList` / `thumbArts` / `thumbPals`** — 配列末尾に追加
4. **`searchDb`** — 検索用エントリ

### Canvas アニメーション設計のコツ

- `frame` パラメータを使って時間変化を表現（`frame % N` でループ、`Math.sin(frame * k)` で振動）
- `fillRect` のみで描画（ピクセルアート風）
- 半透明 `rgba()` でオーバーレイ / HUD 背景
- パース効果は線形補間 `gx1 + (gx2 - gx1) * t` で簡易実装

### 敵スポーンのシード計算

```js
var seed = (ei * 137 + wave * 31) % 100;
var ex = 8 + (seed * 7 + Math.floor(frame * 0.3 + ei * 40)) % (w - 20);
```

素数を乗数に使うことで、少ないパラメータからバラつきのある位置を生成できる。
