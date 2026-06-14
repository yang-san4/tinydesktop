# GEKKO 開発変更ログ（学習ノート）

## 概要
tinydesktop 内の FPS ゲーム「GEKKO」を段階的に改善した記録。
対象ファイル: `js/fps.js`（単一 IIFE、~2050行）

---

## 1. コリジョン（衝突判定）バグの修正

### 問題
島の地面（草・岩レイヤー）が**見えるのに乗れない**。

### 原因
ワールド生成で2つの配列を使い分けていた:

```js
var platforms = []; // 衝突判定あり（P関数で追加）
var decor = [];     // 描画のみ（D関数で追加）
var allGeo = [];    // 描画用（両方を結合）

function P(x,y,z,w,d,h,tc,sc) { platforms.push({...}); }
function D(x,y,z,w,d,h,tc,sc) { decor.push({...}); }
```

`resolvePhysics()` の衝突判定ループは `platforms` 配列のみを走査:

```js
for (var i = 0; i < platforms.length; i++) {
  var pl = platforms[i];
  // ... 衝突判定
}
```

島の草レイヤー（GR）は `D()` で追加されていたため、
描画はされるが衝突判定の対象外 → プレイヤーが素通りする。

### 修正
草レイヤー12箇所 + キャットウォーク3箇所の `D()` を `P()` に変更:

```js
// 修正前（装飾扱い = すり抜ける）
D(-7, 17, 0.5, 12, 10, 0.4, GR, GRs);

// 修正後（衝突あり = 乗れる）
P(-7, 17, 0.5, 12, 10, 0.4, GR, GRs);
```

**学習ポイント**: 描画と物理を別の配列で管理する場合、
「見えるのに触れない」バグが起きやすい。
どのオブジェクトがどの配列に入るかを意識的に設計する必要がある。

### 変更しなかったもの
- 雲の床（装飾のみ、乗る必要なし）
- ネオン看板（薄い装飾）
- 鍾乳石（島の下面、到達不能）
- 遠景の浮島（x=50,y=40 等、背景用）
- 浮遊デブリ（小さすぎて乗る想定なし）

---

## 2. 敵バランス調整

### 問題
敵が強すぎてゲームにならない。

### 調整内容

#### ENEMY_DEFS の変更

| 敵 | HP | 速度 | 攻撃CD | 変更理由 |
|---|---|---|---|---|
| Wyvern | 30→20 | 5→4 | 1.5→2.0s | 近接型なので低HPで回転率を下げる |
| Harpy | 35→22 | 4→3.5 | 1.2→2.0s | 遠距離+逃げなのでHPを下げ、射撃頻度も減 |
| Golem | 80→50 | 2→1.8 | 2.0→3.0s | タンクでも硬すぎた。CDを大幅延長 |
| Serpent | 25→16 | 6→5 | 0.4→0.8s | 元CD0.4sは弾幕すぎ。倍に延長 |
| Dragon | 200→120 | 3.5→3 | 1.5→2.0s | ボスでも長期戦すぎた |

#### ダメージ値の変更

```js
// 近接ダメージ（Wyvern）
// 修正前
player.hp -= 15;
// 修正後
player.hp -= 8;

// 遠距離ダメージ（通常 / 重装）
// 修正前
var bdmg = def.heavy ? 25 : 8;
// 修正後
var bdmg = def.heavy ? 12 : 5;

// Dragon スプレッド弾
// 修正前: speed 15, dmg 12
// 修正後: speed 10, dmg 6

// 敵弾速度（共通）: 15 → 10
```

#### その他の調整
- ウェーブ間回復: 30HP → 50HP
- 奈落落下ダメージ: 20 → 15

**学習ポイント**: FPS のバランスは
**Time-to-Kill (TTK)** と **Time-to-Die (TTD)** の比率が重要。
プレイヤーが敵を倒す時間 < 敵がプレイヤーを倒す時間
でないと理不尽に感じる。特に多対一の状況では敵の攻撃頻度（CD）を
長めに設定しないと合算ダメージが爆発する。

---

## 3. 無敵フレーム（i-frames）の実装

### 問題
被弾後に連続ダメージを受けてすぐ死ぬ。

### 実装

```js
// プレイヤーオブジェクトに追加
var player = { ..., iFrames: 0, ... };

// ダメージ処理（近接の例）
if (player.iFrames <= 0) {
  player.hp -= 8;
  player.iFrames = 0.4; // 0.4秒間無敵
  dmgFlash = 0.3;
  playSound('hurt');
}

// ゲームループで減衰
if (player.iFrames > 0) player.iFrames -= dt;
```

被弾箇所3箇所すべてに適用:
1. 近接攻撃（Wyvern突進）→ 0.4s
2. 遠距離弾ヒット → 0.4s
3. 奈落落下 → 0.8s（リスポーン猶予）

### 視覚フィードバック

```js
// renderEffects() 内
if (player.iFrames > 0 && Math.sin(player.iFrames * 30) > 0) {
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, W, H);
}
```

`Math.sin(t * 30)` で高速に正負が切り替わる → 点滅効果。
振幅が正の時だけ白いオーバーレイ → 無敵状態が視覚的にわかる。

**学習ポイント**: i-frames は多くのアクションゲームの基本メカニクス。
被弾後の短い無敵時間がないと、角に追い込まれた時に即死する。
三角関数で点滅を作るのは古典的テクニック。

---

## 4. フローティングダメージ数値

### 仕組み

```js
var dmgNums = [];

function addDmgNum(x, y, z, text, col) {
  dmgNums.push({
    x: x, y: y, z: z,
    text: text,        // "20" や "+100" など
    col: col,          // [r, g, b]
    life: 1.0,
    maxLife: 1.0
  });
}

function updateDmgNums(dt) {
  for (var i = dmgNums.length - 1; i >= 0; i--) {
    dmgNums[i].z += 2.5 * dt;  // 上に浮く
    dmgNums[i].life -= dt;      // 寿命減少
    if (dmgNums[i].life <= 0) dmgNums.splice(i, 1);
  }
}
```

### 3x5 ピクセルフォント
Canvas の 2D API テキスト描画は Z-buffer に書けないため、
ピクセルバッファに直接描くためのミニフォントを定義:

```js
var _glyphs = {
  '0': [1,1,1, 1,0,1, 1,0,1, 1,0,1, 1,1,1],  // 3x5 grid
  '1': [0,1,0, 1,1,0, 0,1,0, 0,1,0, 1,1,1],
  // ...
};
```

各文字は 15要素の配列（3列 x 5行）。
1 = ピクセルあり、0 = 空白。

### 使用箇所
- 敵にダメージ → 黄色で `"20"` 等
- 敵撃破 → シアンで `"+100"` 等（スコア）
- HP回復 → 緑で `"+15"`

**学習ポイント**: ピクセルバッファに直接描画する手法は、
Z-buffer との整合性が必要なソフトウェアレンダラーでは必須。
Canvas 2D テキストは Z-buffer を無視するため、
3D 空間内のテキストには使えない。

---

## 5. HP ピックアップシステム

### 仕組み

```js
var pickups = [];

function spawnPickup(x, y, z) {
  pickups.push({ x, y, z, life: 8, bobT: Math.random() * 10 });
}
```

- 敵撃破時に 30% の確率でドロップ
- 8秒で消滅
- プレイヤーが近づくと自動取得（距離 < 1.5）
- 15HP 回復
- `Math.sin(bobT * 3) * 0.15` で上下に浮遊するアニメーション

### 描画（十字形）

```js
// 十字形の判定
if (Math.abs(dx) > sz/3 && Math.abs(dy) > sz/3) continue;
```

正方形から四隅を除外 → 十字（+）形になる。
色は緑 `[50, 255, 80]` で医療キット風。

**学習ポイント**: ドロップ系アイテムは
「リスクとリワード」のゲームデザインの基本。
敵を倒す → HP回復チャンス → 攻めるモチベーション、という
正のフィードバックループを作る。

---

## 6. 敵スプライトの改善

### 修正前
全敵タイプが同じシルエット（頭20%・胴60%・脚20%）。

### 修正後
敵タイプごとに固有のシルエット:

| タイプ | 形状の特徴 |
|---|---|
| Wyvern | 太い肩、幅広の胴体、がっしりした脚 |
| Harpy | 細身、`animPhase` で羽ばたく翼 |
| Golem | 巨大ブロック型、胴体が画面の90%幅 |
| Serpent | スリムで流線型 |
| Dragon | 巨大+翼+発光コア |

### シェーディング改善

```js
// 3段階の明暗
var hr = Math.min(255, fr + 50);  // ハイライト（上部）
var fr = ...; // 基本色（中央）
var dr = fr * 0.35 | 0;          // 影（下部・端）
```

`ly`（縦位置の0-1）に応じて色を切り替え:
- `ly < 0.3` → ハイライト（上から光が当たる）
- `0.3 ≤ ly ≤ 0.7` → 基本色
- `ly > 0.7` → 影

### ヒットフラッシュ

```js
var hitFlash = e.hp < e.maxHp && e.atkCD > def.atkCD - 0.1;
if (hitFlash) { pix[pi]=255; pix[pi+1]=255; pix[pi+2]=255; }
```

被弾直後（攻撃CDリセットの0.1秒以内）に全身白 → 「当たった」感。

### HP バーの改善

```js
// 残HP比率で色が変わる
var hc = hpRatio > 0.5 ? [80,220,80] :   // 緑
         hpRatio > 0.25 ? [220,180,40] :  // 黄
         [220,50,50];                       // 赤
```

1px の黒枠ボーダーも追加し、視認性向上。

**学習ポイント**: 限られたピクセル数でも
「シルエットの差異化」と「明暗の3段階」だけで
キャラクターの個性は十分表現できる。

---

## 7. 武器描画の改善

### リコイル（反動）アニメーション

```js
var recoil = w.timer > 0 ? Math.max(0, (w.timer / w.cd) * 4) : 0;
var wx = LW * 0.62 + recoil * 0.5;  // 右にずれる
var wy = LH - 20 + bob + recoil;     // 下にずれる
```

`w.timer / w.cd` は発射直後に1.0、時間経過で0.0。
これに4を掛けて初速を強調。武器が「跳ねる」感覚になる。

### マズルフラッシュの改善

```js
var flashT = w.timer / w.cd;
if (flashT > 0.7) {
  var fi = (flashT - 0.7) / 0.3;  // 0→1 のフェードイン
  ctx.globalAlpha = fi;
  // 内側（明るい）
  ctx.fillStyle = 'rgba(255,255,200,0.9)';
  ctx.fillRect(wx+18, wy-2, 5+fi*3|0, 8);
  // 外側（暗い光芒）
  ctx.fillStyle = 'rgba(255,200,100,0.5)';
  ctx.fillRect(wx+16, wy-4, 8+fi*4|0, 12);
}
```

2層構造（内側が白黄、外側がオレンジ）で光の広がりを表現。
発射CD の上位30%の時間だけ表示し、すぐ消える。

### 武器の影

```js
ctx.fillStyle = 'rgba(0,0,0,0.2)';
ctx.fillRect(wx+1, wy+2, 18, 4);  // 1px右下にオフセット
```

**学習ポイント**: ゲームの「手触り」(game feel) は
こういった小さな演出の積み重ね。リコイル、フラッシュ、
画面シェイクの3つが揃うと射撃の満足感が格段に上がる。

---

## 8. アンビエントパーティクル

### 目的
空中都市の雰囲気を強化する浮遊する塵/火の粉。

```js
var ambientParts = [];

function genAmbient() {
  for (var i = 0; i < 40; i++) {
    ambientParts.push({
      x: (Math.random()-0.5) * 50,
      y: (Math.random()-0.5) * 50,
      z: Math.random() * 14,
      vx: (Math.random()-0.5) * 0.5,
      vy: (Math.random()-0.5) * 0.5,
      vz: 0.2 + Math.random() * 0.4,  // ゆっくり上昇
      phase: Math.random() * 10
    });
  }
}
```

### 蛇行移動

```js
a.x += a.vx * dt + Math.sin(a.phase * 0.7) * 0.3 * dt;
a.y += a.vy * dt + Math.cos(a.phase * 0.5) * 0.3 * dt;
```

sin/cos の周期をずらすことでリサージュ曲線的な軌道になる。
直線的でない自然な浮遊感を演出。

### ループ処理

```js
if (a.z > 16) {
  a.z = -1;
  a.x = (Math.random()-0.5) * 50;
  a.y = (Math.random()-0.5) * 50;
}
```

上端に達したら下端にリセット → 無限に漂い続ける。
新規生成ではなく位置リセットなので GC 負荷なし。

**学習ポイント**: アンビエントパーティクルは
「何もない空間」を埋める低コストな演出。
40個程度でも空間の奥行き感が大きく変わる。

---

## 技術メモ: ソフトウェア 3D レンダラーの構造

このゲームのレンダリングパイプラインの全体像:

```
clearFrame()          Z-buffer クリア + 空グラデーション描画
    ↓
renderSun()           太陽のグロー（加算合成）
    ↓
for each allGeo:      全ジオメトリを走査
  renderPlatform()    6面体の各面を判定→fillQuad()→fillTri()
    ↓
renderClouds()        半透明の雲（Z-buffer 参照、書き込みなし）
renderAmbient()       浮遊塵（同上）
renderEnemies()       ビルボードスプライト（Z-buffer 書込あり）
renderBullets()       弾丸ドット
renderPickups()       HP ピックアップ
renderParticles()     エフェクト粒子
renderDmgNums()       ダメージ数値
renderGrappleLine()   グラップルワイヤー
    ↓
ctx.putImageData()    ピクセルバッファ → Canvas に転送
    ↓
renderEffects()       Canvas 2D API でポストエフェクト
                      （ビネット、ダメージフラッシュ、i-frames 点滅、スピードライン）
    ↓
renderHUD()           Canvas 2D API で HUD テキスト描画
renderWeapon()        武器のビューモデル
renderMobileHUD()     モバイル用タッチボタン
```

**重要**: `putImageData()` より前はすべてピクセルバッファ (`pix[]`) と
Z-buffer (`zbuf[]`) への直接書き込み。
`putImageData()` 以降は Canvas 2D API（`fillRect`, `fillText` 等）。
この2つのレイヤーを混在させないのがポイント。
