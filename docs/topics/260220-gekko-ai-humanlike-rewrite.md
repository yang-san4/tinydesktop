# GEKKO 変更ログ: AI人間らしい動作に書き直し

## 問題
AIが `player.a` を直接書き換えて瞬間的に方向転換していた。
ユーザーから見ると「瞬間移動」のように見える。

## 根本原因

```js
// 旧: 即座にターゲット方向を向く
player.a = Math.atan2(dx, dy);  // ← 1フレームで180°回転！
player.p = Math.atan2(dz, hd);  // ← カメラが瞬間移動
```

## 修正方針
**「AIはキー入力とマウス操作のみ」** — 人間プレイヤーと同じ入力経路を使う。

## 1. スムーズ回転

```js
var AI_TURN_SPD = 3.5;  // rad/s（ヨー回転速度）
var AI_PITCH_SPD = 2.0; // rad/s（ピッチ回転速度）

function aiAimYaw(targetA, dt){
  var diff = targetA - player.a;
  // 最短経路に正規化 (-PI..PI)
  while(diff > PI) diff -= TAU;
  while(diff < -PI) diff += TAU;
  var step = AI_TURN_SPD * dt;
  if(Math.abs(diff) < step) player.a = targetA; // 十分近ければスナップ
  else player.a += Math.sign(diff) * step;       // 方向に少しずつ回転
}
```

**3.5 rad/s の感覚:**
- 180° = PI rad → 約0.9秒で半回転
- 30° = 0.52 rad → 約0.15秒で振り向く
- 人間のマウス操作に近い速度感

## 2. キー入力のみで移動

```js
// 毎フレーム全キーをリセット
keys.w=false; keys.a=false; keys.s=false; keys.d=false;
keys.sp=false; mouseDown=false;

// 必要なキーだけセット
if(nearD > 10) keys.w = true;     // 遠い → 前進
else if(nearD < 4) keys.s = true; // 近い → 後退
keys.a = Math.sin(aiTimer*1.5) > 0.2;  // 左右ストレイフ
```

## 3. アクション（ダッシュ・グラップル）のヘルパー関数化

```js
// 旧: AI内でダッシュのプロパティを直接操作
player.dashTimer = DASH_T;
player.dashDx = ...;

// 新: ヘルパー関数を共有（handleKeyとAIの両方から呼ぶ）
function tryDash(){
  if(player.dashCD > 0) return false;
  // keys.w/a/s/d の状態から方向を計算 → 通常と同じ挙動
  playSound('dash');
  return true;
}
function tryGrapple(){
  if(player.grappling) return false;
  // ray-AABB テスト → ヒットしたらグラップル開始
  return true;
}
```

## 4. 射撃のエイム精度

```js
// エイムが合っている時だけ射撃（±0.3 rad ≈ 17°以内）
var aimErr = Math.abs(targetA - player.a);
if(Math.abs(aimErr) < 0.3) mouseDown = true;
```

人間はターゲットに照準が合うまで撃たない → AIも同様。

## 5. 探索モード改善

```js
// ウェイポイントを順番に巡回（旧: ランダム）
aiWpIdx = (aiWpIdx + 1) % aiWaypoints.length;

// 目標方向を向いてから前進（旧: 即座に方向転換して前進）
var facingDiff = targetA - player.a;
if(Math.abs(facingDiff) < 1.0) keys.w = true; // 57°以内なら前進
```

## 変更前 vs 後

| 項目 | 旧AI | 新AI |
|---|---|---|
| 方向転換 | 即座 (1フレーム) | スムーズ (3.5 rad/s) |
| 移動 | keys + 直接操作混在 | keys のみ |
| ダッシュ | player.dashTimer直接 | tryDash() 関数 |
| グラップル | player.grappling直接 | tryGrapple() 関数 |
| 射撃 | 常時発射 | エイム合致時のみ |
| ウェイポイント | ランダム | 順番巡回 |
| 見た目 | 瞬間移動 | 人間的な動き |

## 変更ファイル
- `js/fps.js` のみ（2490行 → 2518行）
