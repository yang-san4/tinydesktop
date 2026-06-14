# プロジェクト全体セキュリティハードニング (2026-02-25)

## 概要
プロダクト全体（18 JSファイル + HTML + CSS）のセキュリティレビューを実施し、発見した脆弱性を修正。

---

## 1. プロトタイプ汚染防止 — maze.js / piano.js

### 問題
`e.key` 由来の文字列をオブジェクトのプロパティ名として直接書き込んでいた。

```javascript
// Before: plain object — e.key が "__proto__" なら Object.prototype を汚染
var keys = {};
keys[e.key] = true;   // e.key === "__proto__" → Object.prototype === true ！
```

### 修正
```javascript
// After: null プロトタイプ — __proto__ が来ても単なるプロパティ
var keys = Object.create(null);
keys[e.key] = true;   // keys に "__proto__" キーが入るだけで無害
```

**学習ポイント**: `Object.create(null)` は `__proto__` リンクを持たないオブジェクトを作る。ユーザー入力をプロパティキーに使う場合の定番パターン。`Map` を使う手もあるが、ES5環境では `Object.create(null)` が最もシンプル。

---

## 2. innerHTML 排除 — fps.js

### 問題
ゲームスコア表示に `innerHTML` + 整数結合を使用していた。現時点では値は必ず数値だが、将来データソースが変わった場合にXSSベクターになる構造的リスク。

```javascript
// Before: innerHTML に値を直接結合
_winStats.innerHTML = '<b>SCORE:</b> ' + score + '<br><b>MAX COMBO:</b> x' + maxCombo;
_deadStats.innerHTML = '<b>WAVE:</b> ' + (currentWave+1) + '/' + totalWaves;
```

### 修正
```javascript
// After: DOM API でノード構築 — XSS不可能
_winStats.textContent = '';
var frag = document.createDocumentFragment();
var b = document.createElement('b');
b.textContent = 'SCORE:';
frag.appendChild(b);
frag.appendChild(document.createTextNode(' ' + score));
// ... 以下同様
_winStats.appendChild(frag);
```

**学習ポイント**: `innerHTML` は「現在安全」でも将来の変更で壊れる脆弱なパターン。`createElement` + `textContent` なら値の型が何であっても XSS は原理的に不可能。`DocumentFragment` を使えば DOM 操作を1回にまとめられるのでパフォーマンスも問題ない。

---

## 3. 前回修正済み（terminal.js、2026-02-24）

| 深刻度 | 問題 | 修正 |
|---|---|---|
| CRITICAL | `getNode()` プロトタイプ汚染 | UNSAFE_NAMES チェック + `_hasOwn.call()` |
| MEDIUM | `hasOwnProperty` インスタンスメソッド | `Object.prototype.hasOwnProperty` キャッシュ |
| MEDIUM | `export` で `__proto__` キー許容 | UNSAFE_NAMES バリデーション追加 |

---

## 4. レビュー結果サマリ

### 問題なし（CLEAN）のファイル
`calendar.js`, `hourglass.js`, `clock.js`, `minesweeper.js`, `aquarium.js`, `david.js`, `wallpaper.js`, `pet.js`, `tetris.js`, `contextmenu.js`, `boot.js`, `notify.js`, `index.html`, `style.css`

### 確認済みの安全項目
- `eval()` / `Function()` / 文字列 `setTimeout` → **使用なし**
- 外部リソース読み込み（fetch / XHR）→ **なし**
- DOM セレクタインジェクション → **なし**
- `browser.js` の `innerHTML` → `escapeHtml()` でサニタイズ済み
- `folder.js` の `innerHTML` → 内部状態のみ参照、ユーザー入力なし

### 残存する低リスク事項（修正不要と判断）
- `terminal.js` の `grep`: ユーザー正規表現を `new RegExp()` に渡す（ReDoS、ローカルアプリのため影響限定的）
- `terminal.js` の `factor`: 大きな素数で計算コストが高い（DoS、ローカルのため問題なし）
- `browser.js` の静的 `innerHTML`: 全てハードコードされたHTMLリテラル
