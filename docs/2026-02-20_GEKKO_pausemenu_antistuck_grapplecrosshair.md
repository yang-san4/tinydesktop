# GEKKO 変更ログ: ポーズメニュー・スタック修正・グラップル照準

## 1. ポーズ画面にDEBUG・RESETボタン追加

### 問題
F3キーでデバッグモードをトグルしたいが、ホストPCのF3が反応してしまう。
また、ゲーム中にリセットする手段がない。

### 修正
ポーズ画面（ESCで表示）にクリック可能なボタンを2つ追加。

```js
// ボタン生成（HTMLのdiv要素）
var _btnDebug = document.createElement('div');
_btnDebug.style.cssText = 'font-size:6px;padding:3px 8px;cursor:pointer;border:1px solid;...';
_btnDebug.textContent = 'DEBUG';
_btnDebug.addEventListener('mousedown', function(e){
  e.stopPropagation();  // ← ゲーム再開を防ぐ
  e.preventDefault();
  debugMode = !debugMode;
  _btnDebug.style.background = debugMode ? 'rgba(0,170,238,0.3)' : '';
});
```

**学習ポイント: `stopPropagation()` と `preventDefault()`**
- `stopPropagation()`: イベントが親要素に伝播するのを止める
  → ボタンクリックがcanvasのmousedownに伝わり、`requestPointerLock()` が発火するのを防止
- `preventDefault()`: ブラウザのデフォルト動作を防ぐ
- 両方を使うことで、ボタンクリックがボタンだけで完結する

**RESETボタン**: `gameState='title'` に戻すだけでタイトル画面に遷移。
`startGame()` が次回クリック時にワールド再生成するので、状態リセットは自動。

### ポーズ画面の構造（変更後）
```
[PAUSED]              ← タイトル
[CLICK TO RESUME]     ← プロンプト
[DEBUG] [RESET]       ← 新規ボタン行
[WASD MOVE ...]       ← コントロール表示
```

## 2. キャラクターのスタック修正

### 問題
特定の地面でキャラクターが動けなくなる（スタック）。

### 原因分析
コリジョン解決は X → Y → Z の順で行われる。
接続ブリッジ（h=0.15〜0.2）と島の境目で、プレイヤーのZ位置が表面のわずか下にある場合：

1. XY コリジョン: `player.z + PLAYER_H > pl.z` → 壁として認識、横に押し出される
2. Z コリジョン: `prevZ >= pTop - 0.1` の条件を満たさない → 着地判定されない
3. 結果: XYで押し出されるがZで着地できず、宙ぶらりん状態

特にプラットフォームが重なる境界で、一方に押し出されて他方にぶつかるループも発生。

### 修正
Z コリジョンの直後に「アンチスタック」安全チェックを追加：

```js
// Anti-stuck: プレイヤーがプラットフォーム内部に埋まっている場合、表面にスナップ
if(!player.grounded){
  for(var i = 0; i < platforms.length; i++){
    var pl = platforms[i], hw = pl.w/2, hd = pl.d/2;
    // XY範囲チェック
    if(player.x+PLAYER_R <= pl.x-hw || player.x-PLAYER_R >= pl.x+hw) continue;
    if(player.y+PLAYER_R <= pl.y-hd || player.y-PLAYER_R >= pl.y+hd) continue;
    var pTop = pl.z + pl.h;
    // 足元が表面のわずか下（0.35ユニット以内）で、下降中
    if(player.z < pTop && player.z >= pTop - 0.35 && player.vz <= 0){
      player.z = pTop;      // 表面にスナップ
      player.vz = 0;
      player.grounded = true;
      break;
    }
  }
}
```

**なぜ 0.35 ユニット?**
- `PLAYER_R = 0.22` → 壁判定の半径
- 薄いプラットフォーム (h=0.15〜0.2) + 重力による1フレーム分の沈み
- 0.35 で十分カバーしつつ、高い建物（h=1.8）の横を歩くときに誤スナップしない
  - 例: 建物 top=1.8, player.z=0.5 → 0.5 >= 1.8-0.35=1.45? NO → スナップしない ✓

**条件 `player.vz <= 0`**: 上昇中はスナップしない（ジャンプ中に天井にスナップされるのを防止）

## 3. グラップル射程インジケーター

### 問題
グラップル（Eキー）が打てる距離かどうかが分からない。

### 修正
毎フレーム、視線方向にレイキャスト（ray-AABB交差テスト）を行い、
`GRAP_RNG`（15ユニット）以内にヒットがあれば `grappleInRange=true` にする。

```js
// 毎フレームのグラップル射程チェック
grappleInRange = false;
if(!player.grappling){
  var gfwd = [sin(a)*cos(p), cos(a)*cos(p), sin(p)];
  for(各プラットフォーム){
    // Eキー押下時と同じ ray-AABB 交差テスト
    if(ヒット && 距離 > 0.5 && 距離 <= GRAP_RNG){
      grappleInRange = true;
      break;  // 1つ見つかればOK（最近接は不要）
    }
  }
}
```

### クロスヘアの変化

**通常時（射程外）:**
```
    |
  ──+──     シアン (#00e5ff)、細い線
    |
```

**グラップル射程内:**
```
 ┌     ┐
    |
  ──+──     緑 (#00ff78)、脈動アルファ、太い線
    |
 └     ┘
 GRAPPLE    ← ラベル表示
```

```js
if(grappleInRange){
  var gAlpha = 0.6 + 0.3 * Math.sin(_time * 8); // 脈動する透明度
  ctx.strokeStyle = 'rgba(0,255,120,' + gAlpha + ')';
  ctx.lineWidth = 0.7;  // 太め
  // 十字線 + 四隅のブラケット
  // bs=6 のサイズで L字型コーナーを8ストローク
  ctx.fillText('GRAPPLE', cx, cy + bs + 3); // ラベル
}
```

**脈動パターン: `0.6 + 0.3 * sin(t * 8)`**
- 基本透明度 0.6（常に見える）
- 振幅 0.3（0.3〜0.9 の範囲で変化）
- 周波数 8（1秒に約1.3回点滅 → 注意を引くが邪魔にならない）

## 変更ファイル
- `js/fps.js` のみ（2240行 → 2322行）
