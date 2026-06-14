# GEKKO 変更ログ: ジェットパック物理修正・外周バウンス修正

## 1. ジェットパックの安定化

### 問題
ブースト中にぴょんぴょんしてしまい、安定した上昇ができない。

### 原因
2つの問題が重なっていた：

**A. 推力が重力に負けていた**
```
旧: JET_ACC=12, GRAVITY=18
→ net加速度 = 12 - 18 = -6 (下向き！)
→ ジェットパックをONにしても落ち続ける
```

**B. 接地チェックで切れる**
```js
// 旧: 空中でしか発動しない
if(keys.sp && !player.grounded && ...)
```
1. ジェットで浮く → 重力で降下 → 着地(grounded=true)
2. grounded=true → ジェット停止 → 重力で少し沈む
3. grounded=false → ジェット再開 → 少し浮く → 着地...
→ ぴょんぴょんの無限ループ

### 修正

**A. 推力を大幅増加**
```js
// 旧: JET_ACC=12 (重力に負ける)
// 新: JET_ACC=26 (net = 26-18 = +8 上向き)
var JET_ACC = 26;
```

**B. 接地中もリフトオフ可能**
```js
var jetting = keys.sp && player.jetFuel > 0 && !player.grappling && player.jumpCD <= 0;
if(jetting){
  if(player.grounded){
    // 地上からのリフトオフ（穏やかな初速）
    player.vz = 2;
    player.grounded = false;
  }
  // 継続的な上昇推力
  player.vz += JET_ACC * dt;
  var jetMaxVZ = 5;  // 上昇速度上限
  if(player.vz > jetMaxVZ) player.vz = jetMaxVZ;
  // 燃料消費、パーティクル、サウンド...
}
// 燃料回復はジェット非作動時のみ
if(player.grounded && !jetting){
  player.jetFuel = Math.min(JET_MAX, player.jetFuel + JET_MAX*0.8*dt);
}
```

### パラメータまとめ
| 項目 | 旧 | 新 | 効果 |
|---|---|---|---|
| JET_ACC | 12 | 26 | 重力を超えて上昇可能 |
| net加速度 | -6 (落下) | +8 (上昇) | 安定したホバリング |
| 速度上限 | 5.2 (JUMP_VEL*0.8) | 5.0 (jetMaxVZ) | 少し遅め=制御しやすい |
| grounded制限 | あり | なし | 地上からシームレスに浮上 |

**学習ポイント: 物理パラメータのバランス**
- 推力 < 重力 → 「スラスター」ではなく「パラシュート」になってしまう
- 推力 > 重力 の差分が「体感の上昇速度」を決める
- `jumpCD <= 0` チェック: ジャンプ直後の0.15秒はジェット発動しない
  → ジャンプの初速がジェットに食われない

## 2. 外周バウンス修正

### 問題
ステージの外側（マーケット島や接続ブリッジ）で勝手にぴょんぴょん跳ねる。

### 原因
前回追加したアンチスタック処理の許容範囲が広すぎた：

```js
// 旧: 常時チェック、許容0.35ユニット
if(!player.grounded){
  // ...
  if(player.z < pTop && player.z >= pTop - 0.35 && player.vz <= 0){
    // スナップ!
  }
}
```

薄い橋（h=0.15〜0.2）の近くを通るだけでスナップが発動し、
表面にポップアップ → 重力で落下 → 再度スナップ → バウンスのループ。

### 修正
2つの条件を追加：

```js
// 新: XY衝突があった場合のみ + 許容範囲を狭く
if(!player.grounded && xyPushed){  // ← XY衝突発生時のみ
  // ...
  if(player.z < pTop && player.z >= pTop - 0.2 && player.vz <= 0){  // ← 0.2に縮小
    // スナップ
  }
}
```

**`xyPushed` フラグ:**
```js
var xyPushed = false;
// X衝突処理内:
player.vx = 0; xyPushed = true;
// Y衝突処理内:
player.vy = 0; xyPushed = true;
```

**なぜこの条件で正しいか:**
- XY衝突なし + 地面近く → 通常の落下。Z着地判定で処理される → スナップ不要
- XY衝突あり + 地面近く → プラットフォーム境界に挟まれている → スナップ必要
- 0.35→0.2に縮小 → 本当に表面のすぐ近くでのみ発動

## 変更ファイル
- `js/fps.js` のみ（2322行 → 2330行）
