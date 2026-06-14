# GEKKO 変更ログ: ジェットパック復活・ジャンプバウンス修正

## 1. ジャンプバウンス修正

### 問題
Space を1回押しただけで複数回跳ねてしまう。

### 原因分析
`spJustPressed` のエッジ検出自体は正しいが、着地直後のフレームで `grounded` 状態がちらつく
（重力で微小に沈む → コリジョンで戻される → 次フレームで再度 grounded=true）ことで、
ジャンプカウントがリセットされ再ジャンプが可能になる場合がある。

### 修正
```js
// ジャンプクールダウン（0.15秒）を追加
if(player.jumpCD>0) player.jumpCD -= dt;
if(spJustPressed){
  spJustPressed = false;
  if(player.grounded && player.jumpCD <= 0){
    player.vz = JUMP_VEL;
    player.grounded = false;
    player.jumpCD = 0.15;  // ← 0.15秒間は再ジャンプ不可
    playSound('jump');
  }
}
```

**学習ポイント: クールダウンによるデバウンス**
- エッジ検出（`spJustPressed`）だけでは不十分な場合がある
- 物理シミュレーションの `grounded` 状態はフレーム間でちらつく可能性がある
- `jumpCD` タイマーを設けることで、ジャンプ後の一定時間は再入力を無視
- 0.15秒 = 約4-5フレーム。人間の反応速度より短いので操作感に影響しない

## 2. ジェットパック復活

### 二段ジャンプとの違い
| 項目 | 二段ジャンプ | ジェットパック |
|---|---|---|
| 入力 | Space 2回（エッジ） | Space 長押し（ステート） |
| 空中制御 | 1回きりの追加ジャンプ | 持続的な上昇力 |
| リソース | なし | 燃料ゲージ |
| 視覚フィードバック | パーティクルバースト | 火＋煙の持続エフェクト |

### 実装

```js
// Jetpack: 空中でSpace長押し、燃料消費
if(keys.sp && !player.grounded && player.jetFuel > 0 && !player.grappling){
  player.vz += JET_ACC * dt;                    // 上昇加速度 (JET_ACC=12)
  if(player.vz > JUMP_VEL * 0.8) player.vz = JUMP_VEL * 0.8; // 速度上限
  player.jetFuel -= dt;                          // 燃料消費（1秒で1.0消費）
  if(player.jetFuel < 0) player.jetFuel = 0;

  // 火パーティクル（オレンジ〜赤、下方向に射出）
  // 煙パーティクル（グレー、広め、遅め）
}

// 地上で燃料回復（0.8倍速 → 約1.5秒でフル回復）
if(player.grounded){
  player.jetFuel = Math.min(JET_MAX, player.jetFuel + JET_MAX * 0.8 * dt);
}
```

### パーティクル設計

**火（60%確率/フレーム）:**
- 位置: プレイヤー足元（z-0.05）、小さい散布（±0.15）
- 速度: 下方向に高速（vz: -3〜-6）
- 色: `(255, 120〜200, 0)` オレンジ〜黄色のランダム
- 寿命: 0.15〜0.25秒（短い → 火花的）
- サイズ: 0.5〜0.8

**煙（30%確率/フレーム）:**
- 位置: やや下（z-0.1）、広い散布（±0.3）
- 速度: 下方向に遅め（vz: -1.5〜-2.5）
- 色: `(160, 160, 170)` 灰色
- 寿命: 0.25〜0.4秒
- サイズ: 0.6〜1.0

### 速度制限の根拠
```js
if(player.vz > JUMP_VEL * 0.8) player.vz = JUMP_VEL * 0.8;
// JUMP_VEL=6.5 → 上限=5.2
// ジャンプ（瞬間 6.5）より遅い = ジャンプ→ジェットで自然な遷移
```

### 燃料パラメータ
- `JET_MAX = 1.2`（秒単位の容量）
- 消費: 1.0/秒（1.2秒間ブースト可能）
- 回復: `JET_MAX * 0.8/秒` = 0.96/秒（約1.5秒でフル回復）

## 3. ジェットパック専用サウンド

```js
case'jet':
  // ノイズバッファ（0.08秒）をローパスフィルタ（600Hz）で処理
  // → 低い「ゴォッ」というスラスター音
  var buf = audioCtx.createBuffer(1, sampleRate*0.08, sampleRate);
  // ランダムノイズ → LowPassFilter(600Hz) → Gain
```

**ジャンプ音との違い:**
| 項目 | ジャンプ | ジェットパック |
|---|---|---|
| 波形 | サイン波（クリーン） | ノイズ（ザラザラ） |
| 周波数 | 300→600Hz（上昇） | ノイズをLPF 600Hz |
| 印象 | 「ピュッ」（軽い） | 「ゴォッ」（重い） |
| タイミング | 1回のみ | 断続的（15%確率/フレーム） |

## 4. HUDの燃料ゲージ

```js
var fuelPct = player.jetFuel / JET_MAX;
var fuelCol = fuelPct > 0.5 ? '#0ae'      // 50%以上: シアン
            : fuelPct > 0.2 ? '#fa0'      // 20-50%: オレンジ（警告）
            : '#f44';                       // 20%未満: 赤（危険）
ctx.fillRect(5, 13, 30 * fuelPct, 2);      // バーの幅 = 30px × 残量割合
ctx.fillText('BOOST ' + (fuelPct*100|0) + '%', 5, 12);
```

**色の3段階変化パターン**: HP バーと同じ設計思想。
プレイヤーはバーの色を見るだけでリソース状態を即座に把握できる。

## 変更箇所まとめ
- `player` オブジェクト: `jumpCount` → `jetFuel` + `jumpCD` に置換
- `resetPlayer / respawnPlayer`: 同上
- `resolvePhysics`: 二段ジャンプ削除、ジャンプCD追加、ジェットパック物理+パーティクル追加
- HUD: 二段ジャンプ表示 → 燃料パーセンテージバー
- デバッグHUD: `JUMP:x/2` → `JET:x.x/1.2`
- `playSound`: `'jet'` ケース追加（ノイズ+LPF）

## 変更ファイル
- `js/fps.js` のみ（2221行 → 2240行）
