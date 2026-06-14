# Pinball 3D リビルド

## 概要
既存の 2D ピンボール（80x140 canvas）をゼロから書き直し、Canvas 2D のパースペクティブ変換 + グラデーション/シャドウで 3D 風描画を実現した。

## 変更ファイル
- `index.html` — canvas を `120x210` に拡大、ウィンドウ幅を `180px` に
- `js/pinball.js` — 全面書き換え（約750行）

## アーキテクチャ: テーブル座標 vs スクリーン座標

### 設計のポイント
物理演算は「テーブル座標」(80x180) で行い、描画時のみ「スクリーン座標」(120x210) に変換する二層構造。

```javascript
// テーブル座標 → スクリーン座標（射影変換）
function tableToScreen(tx, ty) {
  var normY = ty / TABLE_H;                    // 0(手前)〜1(奥)
  var perspective = 1.0 - normY * FORESHORTEN; // 手前=1.0, 奥=0.65
  var cx = CANVAS_W / 2;
  var sx = cx + (tx - TABLE_W / 2) * perspective * (CANVAS_W / TABLE_W);
  var sy = CANVAS_H - normY * CANVAS_H;
  return { x: sx, y: sy };
}
```

### 学習ポイント
- **物理とレンダリングの分離**: 物理演算を直交座標で行い、描画時だけ台形変換することで、衝突判定が単純な円 vs 線分の計算で済む
- **FORESHORTEN パラメータ**: 0.35 で「奥が 65% 幅」になり、自然な奥行き感が出る。値が大きすぎると歪みが目立つ
- **scaleAt()**: オブジェクトのサイズも y 座標に応じて縮小することで、奥のバンパーが小さく見える

## y 軸の方向

旧実装では y=0 が画面上部（奥）だったが、新実装では **y=0 が手前（画面下部）、y=180 が奥（画面上部）** に変更。

### 学習ポイント
- 物理的に自然な方向（重力で y が減少 → 画面上から下へ落ちる）にすることで、gravity の符号ミスが減る
- `tableToScreen` の `sy = CANVAS_H - normY * CANVAS_H` で y 軸を反転

## 物理エンジン: サブステッピング

```javascript
for (var s = 0; s < SUB_STEPS; s++) {
  ballVY -= GRAVITY / SUB_STEPS;
  ballX += ballVX / SUB_STEPS;
  ballY += ballVY / SUB_STEPS;
  // 全衝突判定...
}
```

### 学習ポイント
- SUB_STEPS=3 で「トンネリング」（高速ボールが壁を突き抜ける）を防止
- 各値を SUB_STEPS で割ることで、物理的な振る舞いはステップ数に依存しない
- `Math.pow(FRICTION, 1/SUB_STEPS)` で摩擦も正しくスケーリング

## 3D 描画テクニック

### radialGradient で球体感
```javascript
var g = ctx.createRadialGradient(
  sp.x - sr*0.3, sp.y - sr*0.3, sr*0.1,  // ハイライト位置
  sp.x, sp.y, sr                           // 球の範囲
);
g.addColorStop(0, '#ffffff');   // ハイライト
g.addColorStop(0.5, '#c0c0c0');
g.addColorStop(1, '#808080');   // シャドウ
```

### ドロップシャドウで浮遊感
```javascript
ctx.fillStyle = 'rgba(0,0,0,0.4)';
ctx.beginPath();
ctx.ellipse(sp.x + offset, sp.y + offset, sr, sr*0.5, 0, 0, Math.PI*2);
ctx.fill();
```

### 学習ポイント
- ハイライト位置を左上にずらすことで、右下からの照明を表現
- ドロップシャドウを楕円にすることで、地面に落ちた影っぽく見える
- フリッパーは `linearGradient` でメタリック感を出す

## ゲームメカニクス

### テーブルオブジェクト
| オブジェクト | 数 | 得点 |
|---|---|---|
| バンパー | 3（三角配置） | 100点 |
| ドロップターゲット | 3（全倒し+1000） | 200点/個 |
| スリングショット | 2 | 10点 |
| スピナー | 1 | 50点/回転 |
| トップレーン | 3（全点灯→2x） | 300点/個 |

### コンボシステム
- 2秒以内の連続ヒットでコンボカウンタ増加
- 5コンボ → 1.5x、10コンボ → 2.0x

### ボールセーブ
- ゲーム開始から 10 秒間有効（600フレーム）
- ドレインしても自動復帰

## プランジャーレーン出口のバグ対策

旧実装のバグ: ボールがプランジャーレーンの上端で壁に挟まれて出られなくなる

### 解決策: リダイレクトゾーン
```javascript
if (ballX > 66 && ballX < 79 && ballY > 165 && ballVY > 0) {
  ballX = 63; ballY = 165;
  ballVX = -speed * 0.8;
  ballVY = speed * 0.3;
}
```

### 学習ポイント
- レーン上端にガイド壁を置くと、壁同士の角でボールが挟まるリスクがある
- 代わりに「特定座標に到達したら強制的に方向転換」するリダイレクトゾーン方式が安全

## LED ビットマップフォント

3x5 ピクセルのビットマップフォントをビットフラグで定義:
```javascript
'0': [7,5,5,5,7]  // 各行が 3bit: 左=4, 中=2, 右=1
```

### 学習ポイント
- フォントデータを数値配列で持つと省メモリ
- `data[row] & (4 >> col)` でピクセルの on/off を判定
- Tetris.js で使ったパターンを再利用
