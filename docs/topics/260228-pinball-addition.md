# Pinball アプリ追加

**日付**: 2026-02-28
**概要**: TinyDesktop に13番目のアプリとしてピクセルアート風ピンボールを追加

## 変更ファイル

| ファイル | 操作 |
|---|---|
| `js/pinball.js` | 新規作成 — ゲーム本体 |
| `index.html` | アイコン・ウィンドウ・メニュー・script追加 |
| `css/style.css` | ピンボール関連スタイル追加 |
| `js/folder.js` | フォルダ位置を (42,194)→(42,232) に移動 |

## ゲーム仕様

### テーブルレイアウト (80x140 canvas)
- **スコアエリア**: y=0-9
- **バンパーゾーン**: y=16-40（円形バンパー5個）
- **ターゲットゾーン**: y=45-70（矩形ターゲット3個、全部当てると1000点ボーナス）
- **スリングショット**: y=70-100（三角バンパー2個）
- **フリッパー**: y=108（左右2本、各16px）
- **プランジャーレーン**: x=72-78

### 操作
- **←/A**: 左フリッパー
- **→/D**: 右フリッパー
- **Space**: プランジャー（長押しでパワー蓄積）
- **クリック**: ゲームオーバー後リスタート

### 物理パラメータ
- Gravity: 0.06 px/frame²
- Max velocity: 3.0 px/frame
- Friction: 0.999
- Fixed timestep: 60fps

## 学習ポイント

### 1. 固定タイムステップ物理
```javascript
accumulator += dt;
while (accumulator >= FIXED_DT) {
  update();
  accumulator -= FIXED_DT;
}
draw();
```
フレームレートに依存しない安定した物理シミュレーションを実現。
`requestAnimationFrame` の可変 dt を固定ステップに変換するアキュムレータパターン。

### 2. 点と線分の距離判定
```javascript
function pointToSeg(px, py, x1, y1, x2, y2) {
  var t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  // t をクランプすることで「線」ではなく「線分」との距離を計算
}
```
壁・フリッパーとボールの衝突判定に使用。
パラメータ `t` を [0,1] にクランプすることがポイント。

### 3. バンパー衝突の反射+ブースト
```javascript
var boost = Math.max(speed, 1.5) * 1.2;
ballVX = bnx * boost;
ballVY = bny * boost;
```
現在の速度と最低保証速度の大きい方を使い、さらに1.2倍することで
「当たると加速する」ピンボールらしい挙動を実現。

### 4. フリッパーのアニメーション遷移
```javascript
function updateFlipper(f, restAngle, activeAngle) {
  var target = f.active ? activeAngle : restAngle;
  var diff = target - f.angle;
  f.angle += (diff > 0 ? 1 : -1) * FLIPPER_SPEED;
}
```
即座に切り替わるのではなく、毎フレーム少しずつ回転させることで
自然なフリッパー動作を表現。

### 5. ウィンドウ最前面チェック（キー入力の排他制御）
```javascript
var allWindows = document.querySelectorAll('.window:not(.closed):not(.minimized)');
var maxZ = 0, topWin = null;
allWindows.forEach(function (w) {
  var z = parseInt(w.style.zIndex) || 0;
  if (z >= maxZ) { maxZ = z; topWin = w; }
});
if (topWin !== win) return;
```
z-index で最前面かどうか判定し、他のウィンドウがアクティブな場合は
キー入力を無視。複数ゲームの共存に必要。
