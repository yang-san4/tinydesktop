# GEKKO 変更ログ: ジャンプ暴発修正・AIテストモード

## 1. ジャンプ暴発修正

### 問題
ブーストした後にSpaceを押すと、ジェットパックではなくジャンプ（vz=6.5＋音）が暴発する。

### 原因
1. Space押下 → `spJustPressed=true` → **ジャンプ発動**（vz=6.5, jumpCD=0.15）
2. 0.15秒後にjumpCD=0 → ジェットパックが起動

プレイヤーはブーストを再開したいだけなのに、毎回大きなジャンプが入る。

### 修正: `recentJet` タイマー

```js
var recentJet = 0;

// ジェット作動中は recentJet を 0.4 にリセットし続ける
if(jetting) recentJet = 0.4;
if(recentJet > 0) recentJet -= dt;

// ジャンプは recentJet が 0 の時だけ発動
if(spJustPressed){
  spJustPressed = false;
  if(player.grounded && player.jumpCD <= 0 && recentJet <= 0){
    // ジャンプ（直近0.4秒以内にジェット使用していない場合のみ）
  }
}
```

**動作フロー:**
- 冷えた状態でSpace → `recentJet=0` → ジャンプ発動 ✓
- ブースト中 → `recentJet=0.4`（常時リセット）
- ブースト終了→0.4秒以内にSpace → `recentJet>0` → ジャンプ抑制、ジェットへ直行 ✓
- ブースト終了→0.4秒以上経過→Space → `recentJet=0` → ジャンプ発動 ✓

### 燃料切れバウンス対策: `jetCutoff` フラグ

```js
var jetCutoff = false;

// Spaceを離したらリセット
if(!keys.sp) jetCutoff = false;
// 燃料がゼロになったらカットオフ（Space押したまま再点火を防止）
if(player.jetFuel <= 0 && keys.sp) jetCutoff = true;

var jetting = keys.sp && player.jetFuel > 0 && ... && !jetCutoff;
```

**問題の流れ（修正前）:**
1. ブーストで燃料切れ（Space押したまま）
2. 着地 → 燃料少し回復
3. 燃料>0 → ジェット再点火 → 少し浮く → 落ちる → 回復 → ループ

**修正後:** 燃料切れ後はSpaceを一度離さないと再点火しない。

## 2. AIテストモード

### 概要
ポーズ画面の `[AI TEST]` ボタンで起動。
AIがゲームの入力（keys, mouse）を直接操作し、実際の物理・戦闘システムを通してプレイ。
ポインターロック不要で動作する。

### AIの状態マシン

```
aiState: 'explore' | 'fight'

                 ┌─ 敵が近い(25u以内) ─┐
                 │                      ▼
   [EXPLORE] ◄──┘                  [FIGHT]
     │                                │
     ├→ ウェイポイント巡回             ├→ 敵にエイム
     ├→ ジェットで高所へ               ├→ 自動射撃
     ├→ グラップル・ダッシュテスト      ├→ ストレイフ移動
     └→ スタック検出                   └→ 武器距離切替
```

### 機能一覧

**ナビゲーション:**
- `spawnPts` + 中央ドック からウェイポイントリストを構築
- ランダムに次のウェイポイントを選択、到達したら次へ
- 目標が高い位置 → 自動でジェットパック使用

**戦闘:**
- 最近接の敵に `Math.atan2` でエイム
- 距離に応じて武器切替（<5u: スキャッター, >15u: チャージャー, 他: ブラスター）
- `sin(aiTimer*2)` でストレイフ、`sin(aiTimer*3)` でジェットパック活用

**テスト行動:**
- グラップル: `grappleInRange` が true の時、2%確率でグラップル実行
- ダッシュ: 0.5%確率で前方ダッシュ
- ジェットパック: 目標高度が高い時に自動使用

**スタック検出:**
```js
// 0.05u/s未満の移動が1.5秒続いたら「スタック」
if(moved < 0.05 * dt) aiStuckTimer += dt;
if(aiStuckTimer > 1.5){
  aiLog.push('[AI] STUCK at ...');
  // ジャンプ + ランダム方向ダッシュで脱出試行
}
```

### デバッグHUDへの表示
AIモード時、デバッグパネルが拡張される：
```
AI: FIGHT t=45s         ← 状態と経過時間
STUCK:0.0               ← スタック秒数（>0.5で赤色警告）
[AI] Heading to (10,24,4)  ← 最新3件のログ
[AI] Dash! t=42.1
[AI] Grapple! t=44.3
```

### 起動方法
1. ゲーム中にESCでポーズ
2. `[AI TEST]` ボタンをクリック（緑色になる）
3. ボタン状態がトグル → もう一度クリックで停止
4. AI起動時は自動でデバッグモードもONになる

### ポインターロック不要
```js
// AIモード時はポインターロックなしでもゲーム更新を実行
if(waveAnnounceTimer<=0 && (pointerLocked || isMobileFps || aiMode)){
  if(aiMode) aiUpdate(dt);
  // ... physics, enemies, bullets, etc.
}
```

## 変更ファイル
- `js/fps.js` のみ（2330行 → 2490行）
